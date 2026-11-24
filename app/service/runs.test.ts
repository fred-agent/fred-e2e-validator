import assert from "node:assert/strict";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { RunStore, type RunRequest } from "./runs.ts";

const dirs: string[] = [];
after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function store(keep = 10): RunStore {
  const dir = mkdtempSync(join(tmpdir(), "runs-test-"));
  dirs.push(dir);
  return new RunStore(dir, keep);
}

const all: RunRequest = {
  selection: { files: [], tags: [] },
  workers: 2,
  fredUrl: "http://fred.example.test",
};
const at = new Date("2026-11-18T10:20:30.400Z");
const passed = { state: "passed", exitCode: 0, hasReport: true } as const;

describe("run store", () => {
  it("names runs by start time and counter, and lists a team's own, newest first", () => {
    const runs = store();
    const first = runs.create("team-a", all, at);
    const second = runs.create("team-a", all, at);
    runs.create("team-b", all, at);
    assert.equal(first.id, "20261118-102030-000");
    assert.equal(second.id, "20261118-102030-001");
    assert.deepEqual(
      runs.list("team-a", 10).map((run) => run.id),
      [second.id, first.id],
    );
    assert.deepEqual(runs.get(first.id), {
      ...all,
      id: first.id,
      team: "team-a",
      state: "running",
      startedAt: at.toISOString(),
      hasReport: false,
    });
  });

  it("knows only its own run ids", () => {
    assert.equal(store().get("../etc"), undefined);
    assert.equal(store().get("20261118-102030-000"), undefined);
  });

  it("ends a running run only", () => {
    const runs = store();
    const run = runs.create("team-a", all, at);
    const ended = runs.finish(run, passed, at);
    assert.deepEqual(
      [ended.state, ended.exitCode, ended.hasReport, ended.endedAt],
      ["passed", 0, true, at.toISOString()],
    );
    assert.throws(
      () => runs.finish(run, { ...passed, state: "failed" }),
      /is passed; only a running run ends/,
    );
  });

  it("marks the runs a stopped service left running as interrupted", () => {
    const runs = store();
    const ended = runs.finish(runs.create("team-a", all, at), passed, at);
    const left = runs.create("team-a", all, at);
    assert.deepEqual(
      runs
        .interruptLeftovers(at)
        .map((run) => [run.id, run.state, run.hasReport]),
      [[left.id, "interrupted", false]],
    );
    assert.equal(runs.get(ended.id)?.state, "passed");
  });

  it("reads the log from an offset, says whether more is waiting, and never cuts a character", () => {
    const runs = store();
    const { id } = runs.create("team-a", all, at);
    assert.deepEqual(runs.readLog(id, 0), { text: "", offset: 0, more: false });
    appendFileSync(runs.logFile(id), "Run started\n");
    const first = runs.readLog(id, 0);
    assert.deepEqual(first, { text: "Run started\n", offset: 12, more: false });
    assert.deepEqual(runs.readLog(id, 0, 4), {
      text: "Run ",
      offset: 4,
      more: true,
    });
    // "é" is two bytes; only its first has been written so far. It is held
    // back, and is not more to read at once.
    appendFileSync(runs.logFile(id), Buffer.from([0x41, 0xc3]));
    assert.deepEqual(runs.readLog(id, first.offset), {
      text: "A",
      offset: 13,
      more: false,
    });
    appendFileSync(runs.logFile(id), Buffer.from([0xa9]));
    assert.deepEqual(runs.readLog(id, 13), {
      text: "é",
      offset: 15,
      more: false,
    });
  });

  it("holds back a log line's separator while it is being written", () => {
    const runs = store();
    const { id } = runs.create("team-a", all, at);
    // "│", in every run log line, is three bytes: E2 94 82.
    appendFileSync(runs.logFile(id), Buffer.from([0x41, 0x20, 0xe2, 0x94]));
    assert.deepEqual(runs.readLog(id, 0), {
      text: "A ",
      offset: 2,
      more: false,
    });
    assert.deepEqual(runs.readLog(id, 2), { text: "", offset: 2, more: false });
    appendFileSync(runs.logFile(id), Buffer.from([0x82]));
    assert.deepEqual(runs.readLog(id, 2), {
      text: "│",
      offset: 5,
      more: false,
    });
  });

  it("reads the progress once the reporter has written it", () => {
    const runs = store();
    const { id } = runs.create("team-a", all, at);
    assert.equal(runs.progress(id), undefined);
    const progress = {
      total: 3,
      passed: 1,
      failed: 0,
      skipped: 0,
      done: false,
    };
    writeFileSync(runs.progressFile(id), JSON.stringify(progress));
    assert.deepEqual(runs.progress(id), progress);
  });

  it("keeps the newest finished runs and never a running one", () => {
    const runs = store(1);
    const old = runs.finish(runs.create("team-a", all, at), passed);
    const newer = runs.finish(runs.create("team-a", all, at), passed);
    const running = runs.create("team-a", all, at);
    runs.prune();
    assert.equal(existsSync(join(runs.root, old.id)), false);
    assert.equal(runs.get(newer.id)?.state, "passed");
    assert.equal(runs.get(running.id)?.state, "running");
  });
});
