import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { after, describe, it } from "node:test";
import { RunInProgressError, Runner } from "./runner.ts";
import { RunStore, type RunRequest } from "./runs.ts";
import type { TestInventory } from "./test-view.ts";

const dir = mkdtempSync(join(tmpdir(), "runner-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

// Stands in for `playwright test`: prints the arguments and settings it was
// given, writes a report when asked, and either exits or starts a worker and
// waits. On SIGINT it exits at once, before its worker: the runner must wait
// for the whole group.
const fake = join(dir, "fake-playwright.mjs");
writeFileSync(
  fake,
  `import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const env = process.env;
console.log("unfiltered worker output");
console.error("unfiltered worker error");
appendFileSync(env.RUN_LOG_FILE, "Reporter output\\n");
if (env.FAKE_ARGS) writeFileSync(env.FAKE_ARGS, JSON.stringify({
  args: process.argv.slice(2), title: env.PLAYWRIGHT_HTML_TITLE,
  progress: env.RUN_PROGRESS_FILE, color: env.FORCE_COLOR, hasAccount: Boolean(env.ACCOUNT_ADMIN_USERNAME),
}));
if (env.FAKE_REPORT) {
  mkdirSync(env.PLAYWRIGHT_HTML_OUTPUT_DIR, { recursive: true });
  writeFileSync(join(env.PLAYWRIGHT_HTML_OUTPUT_DIR, "index.html"), "<p>report</p>");
}
if (env.FAKE_WORKER) {
  spawn(process.execPath, [env.FAKE_WORKER], { stdio: "ignore" });
  setInterval(() => {}, 1000);
} else process.exit(Number(env.FAKE_EXIT ?? 0));
`,
);

// The worker starts a browser in a separate process group. On an interrupt it
// either closes the browser after a delay or stays stuck, as the test requests.
const worker = join(dir, "fake-worker.mjs");
writeFileSync(
  worker,
  `import { spawn } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";
const env = process.env;
const browser = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" });
let closing = false;
const close = () => {
  if (closing || env.FAKE_STUCK) return;
  closing = true;
  setTimeout(() => {
    browser.kill("SIGKILL");
    process.exit(0);
  }, Number(env.FAKE_CLOSE_MS));
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
setInterval(() => {}, 1000);
writeFileSync(env.FAKE_READY + ".tmp", JSON.stringify({ worker: process.pid, browser: browser.pid }));
renameSync(env.FAKE_READY + ".tmp", env.FAKE_READY);
`,
);

const request: RunRequest = {
  selection: { files: [], tags: ["@smoke"] },
  workers: 2,
  fredUrl: "http://fred.example.test",
};

const inventory: TestInventory = {
  files: [
    {
      path: "accounts/sign-in.spec.ts",
      area: "accounts",
      title: "Sign-in",
      tests: [
        {
          titlePath: ["Sign-in", "A user signs in", "A member signs in"],
          tags: ["@smoke"],
          planned: false,
        },
        {
          titlePath: ["Sign-in", "A user signs in", "A planned case"],
          tags: ["@smoke"],
          planned: true,
        },
        {
          titlePath: ["Sign-in", "A user signs out", "A member signs out"],
          tags: [],
          planned: false,
        },
      ],
    },
  ],
  tags: ["@smoke"],
};

function runner(
  env: Record<string, string>,
  { keep = 10, program = process.execPath, stopGraceMs = 10_000 } = {},
) {
  const store = new RunStore(mkdtempSync(join(dir, "runs-")), keep);
  const runner = new Runner({
    store,
    command: [program, fake],
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      ACCOUNT_ADMIN_USERNAME: "e2e-admin",
      ...env,
    },
    inventory,
    stopGraceMs,
  });
  return { store, runner };
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

/** Waits until a stopped process has been reaped. */
async function gone(pid: number): Promise<boolean> {
  for (let tries = 0; tries < 40 && alive(pid); tries++) await sleep(50);
  return !alive(pid);
}

/** The worker's and its browser's pids, once the worker's handlers are installed. */
async function ready(
  file: string,
): Promise<{ worker: number; browser: number }> {
  for (let tries = 0; tries < 250 && !existsSync(file); tries++)
    await sleep(20);
  return JSON.parse(readFileSync(file, "utf8")) as {
    worker: number;
    browser: number;
  };
}

function workerEnv(name: string, extra: Record<string, string> = {}) {
  const readyFile = join(dir, `${name}.json`);
  return {
    readyFile,
    env: {
      FAKE_WORKER: worker,
      FAKE_READY: readyFile,
      FAKE_CLOSE_MS: "600",
      ...extra,
    },
  };
}

/** Every test ends: a stuck run fails it instead of hanging `make test-unit`. */
const BOUNDED = { timeout: 15_000 };

describe("runner", () => {
  it(
    "runs the counted tests with Playwright's test list and packs the report",
    BOUNDED,
    async () => {
      const { store, runner: runs } = runner({
        FAKE_REPORT: "1",
        FAKE_ARGS: join(dir, "args.json"),
      });
      const run = runs.start("team-a", request);
      assert.equal(runs.current()?.id, run.id);
      await runs.idle();
      assert.equal(runs.current(), undefined);
      const ended = store.get(run.id);
      assert.deepEqual(
        [ended?.state, ended?.exitCode, ended?.hasReport],
        ["passed", 0, true],
      );
      assert.equal(
        readFileSync(store.testListFile(run.id), "utf8"),
        "accounts/sign-in.spec.ts › Sign-in › A user signs in › A member signs in\n",
      );
      const log = readFileSync(store.logFile(run.id), "utf8");
      assert.equal(log.split("\n")[0], "Running tags @smoke, 2 workers");
      assert.match(log, /Reporter output/);
      assert.doesNotMatch(log, /unfiltered worker|e2e-admin|fred\.example/);
      assert.deepEqual(
        JSON.parse(readFileSync(join(dir, "args.json"), "utf8")),
        {
          args: [
            "--test-list",
            store.testListFile(run.id),
            "--workers",
            "2",
            "--forbid-only",
            "--output",
            store.testResultsDir(run.id),
          ],
          title: "End-to-end tests",
          progress: store.progressFile(run.id),
          color: "0",
          hasAccount: true,
        },
      );
      assert.match(log, /Run passed \(exit code 0\)\./);
      const files = execFileSync("tar", ["-tzf", store.reportArchive(run.id)], {
        encoding: "utf8",
      });
      assert.match(files, /index\.html/);
    },
  );

  it(
    "records a failed run without a report, and no archive",
    BOUNDED,
    async () => {
      const { store, runner: runs } = runner({ FAKE_EXIT: "1" });
      const run = runs.start("team-a", request);
      await runs.idle();
      const ended = store.get(run.id);
      assert.deepEqual(
        [ended?.state, ended?.exitCode, ended?.hasReport],
        ["failed", 1, false],
      );
      assert.equal(existsSync(store.reportArchive(run.id)), false);
    },
  );

  it(
    "refuses a second start, and a cancelled run stays in progress until its workers are gone",
    BOUNDED,
    async () => {
      const { readyFile, env } = workerEnv("cancel");
      const { store, runner: runs } = runner(env);
      const run = runs.start("team-a", request);
      assert.throws(() => runs.start("team-b", request), RunInProgressError);
      const pids = await ready(readyFile);
      const cancelledAt = Date.now();
      runs.cancel(run.id);
      // The fake runner exits at once; its worker takes 600 ms to close.
      for (let tries = 0; tries < 200 && alive(pids.worker); tries++) {
        assert.equal(runs.current()?.id, run.id);
        assert.equal(store.get(run.id)?.state, "running");
        await sleep(25);
      }
      await runs.idle();
      assert.ok(Date.now() - cancelledAt >= 500);
      assert.equal(store.get(run.id)?.state, "cancelled");
      // The browser had a group of its own: its worker closed it.
      assert.equal(await gone(pids.browser), true);
      assert.match(
        readFileSync(store.logFile(run.id), "utf8"),
        /Cancel requested: interrupting the run/,
      );
    },
  );

  it(
    "kills the run's processes at the deadline, then ends the run",
    BOUNDED,
    async () => {
      const { readyFile, env } = workerEnv("stuck", { FAKE_STUCK: "1" });
      const { store, runner: runs } = runner(env, { stopGraceMs: 800 });
      const run = runs.start("team-a", request);
      const pids = await ready(readyFile);
      const cancelledAt = Date.now();
      runs.cancel(run.id);
      await runs.idle();
      assert.ok(Date.now() - cancelledAt >= 800);
      assert.equal(alive(pids.worker), false);
      assert.equal(store.get(run.id)?.state, "cancelled");
      assert.match(
        readFileSync(store.logFile(run.id), "utf8"),
        /did not end within 0\.8 s: killing them/,
      );
      // Killed with its worker, the browser in its own group is left: the pod's
      // pause container reaps it. Here the test stops it.
      process.kill(pids.browser, "SIGKILL");
    },
  );

  it(
    "ends the run in progress as interrupted when the service stops",
    BOUNDED,
    async () => {
      const { readyFile, env } = workerEnv("stop", { FAKE_CLOSE_MS: "200" });
      const { store, runner: runs } = runner(env);
      const run = runs.start("team-a", request);
      const pids = await ready(readyFile);
      await runs.shutdown();
      assert.equal(alive(pids.worker), false);
      assert.equal(store.get(run.id)?.state, "interrupted");
      assert.equal(await gone(pids.browser), true);
    },
  );

  it(
    "fails a run whose program cannot start, and keeps only the newest",
    BOUNDED,
    async () => {
      const { store, runner: runs } = runner(
        {},
        { keep: 1, program: join(dir, "missing-playwright") },
      );
      const first = runs.start("team-a", request);
      await runs.idle();
      const second = runs.start("team-a", request);
      await runs.idle();
      const ended = store.get(second.id);
      assert.deepEqual([ended?.state, ended?.exitCode], ["failed", null]);
      assert.match(
        readFileSync(store.logFile(second.id), "utf8"),
        /could not start/,
      );
      assert.equal(store.get(first.id), undefined);
    },
  );
});
