// Playwright handles an interrupt by stopping its workers after fixture teardown.
// The runner waits for the process group and kills it if the grace period expires.
import { spawn, type ChildProcess } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  writeFileSync,
  type WriteStream,
} from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import type { Environment } from "../../e2e-framework/config/environment.ts";
import type { FinalState, Run, RunEnd, RunRequest, RunStore } from "./runs.ts";
import { selectedTests, type TestInventory } from "./test-view.ts";

/** How often the runner looks whether the run's process group is gone. */
const GROUP_POLL_MS = 100;
/**
 * How long killed processes may take to be reaped. Only a reaper removes
 * them, the pod's pause container with shareProcessNamespace; without one
 * they would stay forever.
 */
const REAP_WAIT_MS = 10_000;

/** A cancel of a run that is not in progress. */
export class RunEndedError extends Error {
  override name = "RunEndedError";
}

/** A start while a run is in progress. */
export class RunInProgressError extends Error {
  override name = "RunInProgressError";
}

export type RunnerOptions = Readonly<{
  store: RunStore;
  /** The program and its arguments, such as the project's `playwright test`. */
  command: readonly [string, ...string[]];
  /** The working directory containing the test configuration and suites. */
  cwd: string;
  /** The deployment's settings: the accounts and the relay. */
  env: Environment;
  /** The tests a selection picks from. */
  inventory: TestInventory;
  /** The stop grace: how long a stopped run's processes may take before they are killed. */
  stopGraceMs: number;
}>;

type Active = {
  run: Run;
  child: ChildProcess;
  log: WriteStream;
  /** Set when the run is stopped rather than left to end. */
  stoppedAs: "cancelled" | "interrupted" | undefined;
  /** The SIGKILL deadline, once armed. */
  deadline: NodeJS.Timeout | undefined;
  /** When the group was killed at the deadline. */
  killedAt: number | undefined;
  /** Set once every process of the run has ended. */
  groupGone: boolean;
  ended: Promise<void>;
};

function describe({ selection, workers }: Run): string {
  const what =
    selection.files.length > 0
      ? `test files ${selection.files.join(", ")}`
      : selection.tags.length > 0
        ? `tags ${selection.tags.join(", ")}`
        : "every test";
  return `${what}, ${workers} worker${workers === 1 ? "" : "s"}`;
}

/** Resolves with the exit code, or null when the program did not exit by itself. */
function exitOf(child: ChildProcess, log: WriteStream): Promise<number | null> {
  return new Promise((resolve) => {
    child.once("error", () => {
      log.write("\nThe child process could not start.\n");
      resolve(null);
    });
    child.once("close", resolve);
  });
}

/**
 * Signals every process of the group, whatever its leader's state, and tells
 * whether the group is still there; signal 0 only asks. A group whose
 * processes have all exited stays until they are reaped: Linux then delivers
 * the signal to no one, and macOS answers EPERM.
 */
function signalGroup(pid: number, signal: NodeJS.Signals | 0): boolean {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    throw error;
  }
}

function closed(stream: WriteStream): Promise<void> {
  return new Promise((resolve) => stream.end(resolve));
}

export class Runner {
  private readonly store: RunStore;
  private readonly command: readonly [string, ...string[]];
  private readonly cwd: string;
  private readonly env: Environment;
  private readonly inventory: TestInventory;
  private readonly stopGraceMs: number;
  private active: Active | undefined;

  constructor(options: RunnerOptions) {
    this.store = options.store;
    this.command = options.command;
    this.cwd = options.cwd;
    this.env = options.env;
    this.inventory = options.inventory;
    this.stopGraceMs = options.stopGraceMs;
  }

  /** The run in progress, if any. */
  current(): Run | undefined {
    return this.active?.run;
  }

  start(team: string, request: RunRequest): Run {
    if (this.active) throw new RunInProgressError("A run is in progress.");
    const { store } = this;
    const run = store.create(team, request);
    // Each line pairs a relative file path with the test's full title path.
    // The inventory rejects titles that could select multiple tests.
    const testList = store.testListFile(run.id);
    try {
      writeFileSync(
        testList,
        selectedTests(this.inventory, run.selection)
          .map(({ file, test }) => [file.path, ...test.titlePath].join(" › "))
          .join("\n") + "\n",
      );
    } catch (error) {
      store.record(run, { state: "failed", exitCode: null, hasReport: false });
      throw error;
    }
    const log = createWriteStream(store.logFile(run.id), { flags: "a" });
    // A log that cannot be written ends neither the run nor the service.
    log.on("error", () => console.error("A run log could not be written."));
    log.write(`Running ${describe(run)}\n\n`);
    const [program, ...args] = this.command;
    const options = [
      "--test-list",
      testList,
      "--workers",
      String(run.workers),
      "--forbid-only",
      "--output",
      store.testResultsDir(run.id),
    ];
    const child = spawn(program, [...args, ...options], {
      cwd: this.cwd,
      // Its own process group, so a stop reaches the runner and its workers.
      // Playwright starts each browser in a group of its own; the workers
      // close them.
      detached: true,
      stdio: "ignore",
      // Supplying a progress file enables the run log and HTML reporters.
      env: {
        ...this.env,
        PLAYWRIGHT_HTML_OUTPUT_DIR: store.reportFolder(run.id),
        PLAYWRIGHT_HTML_TITLE: "End-to-end tests",
        RUN_LOG_FILE: store.logFile(run.id),
        RUN_PROGRESS_FILE: store.progressFile(run.id),
        FORCE_COLOR: "0",
      },
    });
    const active: Active = {
      run,
      child,
      log,
      stoppedAs: undefined,
      deadline: undefined,
      killedAt: undefined,
      groupGone: false,
      ended: Promise.resolve(),
    };
    active.ended = this.end(active)
      .catch((): RunEnd => {
        console.error("A run ended with an error.");
        const state = active.stoppedAs ?? "failed";
        return { state, exitCode: null, hasReport: false };
      })
      .then((end) => {
        this.active = undefined;
        store.record(run, end);
      });
    this.active = active;
    return run;
  }

  /** Interrupts the run in progress; it ends as cancelled once its processes are gone. */
  cancel(id: string): void {
    const { active } = this;
    if (active?.run.id !== id) throw new RunEndedError();
    this.stop(
      active,
      "cancelled",
      "Cancel requested: interrupting the run; its tests' teardown runs first.",
    );
  }

  /**
   * For the service's own stop: the run in progress ends as interrupted, and
   * the ends that could not be recorded are recorded once more.
   */
  async shutdown(): Promise<void> {
    const { active } = this;
    if (active) {
      this.stop(
        active,
        "interrupted",
        "The service is stopping: interrupting the run.",
      );
      await active.ended;
    }
    this.store.recordWaiting();
  }

  /** Resolves when the run in progress, if any, has ended. */
  async idle(): Promise<void> {
    await this.active?.ended;
  }

  private stop(
    active: Active,
    as: "cancelled" | "interrupted",
    reason: string,
  ): void {
    const { pid } = active.child;
    if (active.stoppedAs || active.groupGone || pid === undefined) return;
    active.stoppedAs = as;
    active.log.write(`\n${reason}\n`);
    signalGroup(pid, "SIGINT");
    this.armDeadline(active, pid);
  }

  /** Kills the group if it is still there when the grace period is over. */
  private armDeadline(active: Active, pid: number): void {
    if (active.deadline) return;
    active.deadline = setTimeout(() => {
      active.log.write(
        `\nThe run's processes did not end within ${this.stopGraceMs / 1000} s: killing them.\n`,
      );
      signalGroup(pid, "SIGKILL");
      active.killedAt = Date.now();
    }, this.stopGraceMs);
  }

  /** Resolves once no process of the group is left, or once killed ones were not reaped in time. */
  private async groupGone(active: Active, pid: number): Promise<void> {
    while (signalGroup(pid, 0)) {
      if (
        active.killedAt !== undefined &&
        Date.now() - active.killedAt > REAP_WAIT_MS
      ) {
        active.log.write(
          `\nThe run's processes were killed but could not be reaped within ${REAP_WAIT_MS / 1000} s: ending the run.\n`,
        );
        return;
      }
      await sleep(GROUP_POLL_MS);
    }
  }

  private async end(active: Active): Promise<RunEnd> {
    const code = await exitOf(active.child, active.log);
    const { pid } = active.child;
    if (pid !== undefined && signalGroup(pid, 0)) {
      // A process outlived Playwright's runner: it gets the same deadline.
      this.armDeadline(active, pid);
      await this.groupGone(active, pid);
    }
    clearTimeout(active.deadline);
    active.groupGone = true;
    const state: FinalState =
      active.stoppedAs ?? (code === 0 ? "passed" : "failed");
    const hasReport = await this.packReport(active.run.id, active.log);
    active.log.write(
      `\nRun ${state}${code === null ? "" : ` (exit code ${code})`}.\n`,
    );
    await closed(active.log);
    return { state, exitCode: code, hasReport };
  }

  /** Packs the HTML report, when the run wrote one; tar and gzip are in the image's base system. */
  private async packReport(id: string, log: WriteStream): Promise<boolean> {
    const { store } = this;
    if (!existsSync(store.reportIndex(id))) return false;
    const tar = spawn(
      "tar",
      ["-czf", store.reportArchive(id), "-C", store.reportFolder(id), "."],
      { stdio: "ignore" },
    );
    const code = await exitOf(tar, log);
    if (code !== 0)
      log.write(`\nPacking the HTML report failed (exit code ${code}).\n`);
    return code === 0;
  }
}
