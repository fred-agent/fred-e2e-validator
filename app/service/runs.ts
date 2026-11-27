// The runs folder: one folder per run with its record, its test list, its
// log, its progress, its test results, its HTML report and the report's
// archive. The service is the only process that writes it.
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { RunProgress } from "../../e2e-framework/reporting/run-log.ts";
import type { Selection } from "./test-view.ts";

export type FinalState = "passed" | "failed" | "cancelled" | "interrupted";
export type RunState = "running" | FinalState;

export type RunRequest = Readonly<{
  selection: Selection;
  /** Playwright's workers, each with an account set of its own. */
  workers: number;
  fredUrl: string;
}>;

/** A run's record: its team, and no name of the person who started it. */
export type Run = RunRequest &
  Readonly<{
    id: string;
    team: string;
    state: RunState;
    startedAt: string;
    endedAt?: string;
    /** Playwright's exit code; null when it did not exit by itself. */
    exitCode?: number | null;
    /** Whether the HTML report and its archive exist. */
    hasReport: boolean;
  }>;

export type RunEnd = Readonly<{
  state: FinalState;
  exitCode: number | null;
  hasReport: boolean;
}>;

/** How long after a failed attempt a run's end is recorded again. */
const RECORD_RETRY_MS = 30_000;

/** Run ids are the start time in UTC and a counter, so they sort by age. */
const RUN_ID = /^\d{8}-\d{6}-\d{3}$/;

function stamp(now: Date): string {
  return now
    .toISOString()
    .replace(/\.\d{3}Z$/, "")
    .replace(/[-:]/g, "")
    .replace("T", "-");
}

/**
 * The bytes of `buffer` up to `length` that end on a whole UTF-8 character;
 * a character still being written is left for the next read.
 */
function completeLength(buffer: Buffer, length: number): number {
  let lead = length - 1;
  while (lead > length - 4 && lead > 0 && ((buffer[lead] ?? 0) & 0xc0) === 0x80)
    lead--;
  const byte = buffer[lead] ?? 0;
  const size = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc0 ? 2 : 1;
  return length - lead >= size ? length : lead;
}

function missing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export class RunStore {
  readonly root: string;
  private readonly keep: number;
  /** The ends that could not be recorded yet, each with what records it again. */
  private readonly waiting = new Map<string, () => void>();

  constructor(root: string, keep: number) {
    this.root = root;
    this.keep = keep;
    mkdirSync(root, { recursive: true });
  }

  /** Records a new run, already running: there is no queue. */
  create(team: string, request: RunRequest, now = new Date()): Run {
    for (let counter = 0; counter < 1000; counter++) {
      const id = `${stamp(now)}-${String(counter).padStart(3, "0")}`;
      try {
        mkdirSync(join(this.root, id));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw error;
      }
      return this.write({
        ...request,
        id,
        team,
        state: "running",
        startedAt: now.toISOString(),
        hasReport: false,
      });
    }
    throw new Error("Too many runs started in one second.");
  }

  get(id: string): Run | undefined {
    if (!RUN_ID.test(id)) return undefined;
    let text: string;
    try {
      text = readFileSync(join(this.root, id, "run.json"), "utf8");
    } catch (error) {
      if (missing(error)) return undefined;
      throw error;
    }
    return JSON.parse(text) as Run;
  }

  /** A team's runs, newest first. */
  list(team: string, limit: number): Run[] {
    return this.runs()
      .reverse()
      .filter((run) => run.team === team)
      .slice(0, limit);
  }

  /** Ends a running run; any other move is an error. */
  finish(run: Run, end: RunEnd, now = new Date()): Run {
    const current = this.get(run.id);
    if (current?.state !== "running")
      throw new Error(
        `Run ${run.id} is ${current?.state ?? "missing"}; only a running run ends.`,
      );
    return this.write({ ...current, ...end, endedAt: now.toISOString() });
  }

  /**
   * Ends a running run, then deletes each team's finished runs beyond the
   * number to keep. An end that cannot be written is recorded later with the time it
   * has now, so a full or unreachable volume leaves no run running.
   */
  record(run: Run, end: RunEnd, now = new Date()): Run | undefined {
    this.waiting.delete(run.id);
    try {
      const ended = this.finish(run, end, now);
      this.prune();
      return ended;
    } catch (error) {
      const { code } = error as NodeJS.ErrnoException;
      console.error("The end of a run could not be recorded.");
      if (code !== undefined) this.recordLater(run, end, now);
      return undefined;
    }
  }

  private recordLater(run: Run, end: RunEnd, now: Date): void {
    const again = () => this.record(run, end, now);
    const timer = setTimeout(again, RECORD_RETRY_MS);
    timer.unref();
    this.waiting.set(run.id, () => {
      clearTimeout(timer);
      again();
    });
  }

  /** Records the ends that wait once more. */
  recordWaiting(): void {
    for (const recordAgain of [...this.waiting.values()]) recordAgain();
  }

  /** Marks the runs a stopped service left running as interrupted. */
  interruptLeftovers(now = new Date()): Run[] {
    return this.runs()
      .filter((run) => run.state === "running")
      .flatMap(
        (run) =>
          this.record(
            run,
            { state: "interrupted", exitCode: null, hasReport: false },
            now,
          ) ?? [],
      );
  }

  logFile(id: string): string {
    return join(this.root, id, "log.txt");
  }

  /** Where the run log reporter keeps the run's progress. */
  progressFile(id: string): string {
    return join(this.root, id, "progress.json");
  }

  /** The tests the run runs, as Playwright's test list. */
  testListFile(id: string): string {
    return join(this.root, id, "tests.txt");
  }

  /** The runner's temporary test output folder. */
  testResultsDir(id: string): string {
    return join(this.root, id, "test-results");
  }

  /** The HTML report's folder. */
  reportFolder(id: string): string {
    return join(this.root, id, "report");
  }

  reportIndex(id: string): string {
    return join(this.reportFolder(id), "index.html");
  }

  reportArchive(id: string): string {
    return join(this.root, id, "report.tar.gz");
  }

  /** The progress the reporter last wrote; none before the tests load. */
  progress(id: string): RunProgress | undefined {
    let text: string;
    try {
      text = readFileSync(this.progressFile(id), "utf8");
    } catch (error) {
      if (missing(error)) return undefined;
      throw error;
    }
    return JSON.parse(text) as RunProgress;
  }

  /**
   * Log text from a byte offset, at most `max` bytes, the next offset, and
   * whether the read stopped at `max` with more written after it. A character
   * still being written is held back, and does not count as more.
   */
  readLog(
    id: string,
    offset: number,
    max = 256 * 1024,
  ): { text: string; offset: number; more: boolean } {
    const file = this.logFile(id);
    if (!existsSync(file)) return { text: "", offset: 0, more: false };
    const size = statSync(file).size;
    const start = Math.min(Math.max(0, offset), size);
    const length = Math.min(max, size - start);
    if (length === 0) return { text: "", offset: start, more: false };
    const buffer = Buffer.alloc(length);
    const fd = openSync(file, "r");
    try {
      readSync(fd, buffer, 0, length, start);
    } finally {
      closeSync(fd);
    }
    const end = completeLength(buffer, length);
    return {
      text: buffer.subarray(0, end).toString("utf8"),
      offset: start + end,
      more: start + length < size,
    };
  }

  /**
   * Deletes each team's oldest finished runs beyond the number to keep. A run
   * that cannot be deleted, or a folder that cannot be read, waits for the
   * next time.
   */
  prune(): void {
    try {
      const kept = new Map<string, number>();
      for (const run of this.runs().toReversed()) {
        if (run.state === "running") continue;
        const count = (kept.get(run.team) ?? 0) + 1;
        kept.set(run.team, count);
        if (count > this.keep) this.delete(run);
      }
    } catch {
      console.error("The runs could not be read.");
    }
  }

  private delete(run: Run): void {
    try {
      rmSync(join(this.root, run.id), { recursive: true, force: true });
    } catch {
      console.error("A run could not be deleted.");
    }
  }

  /** Every run, oldest first. */
  private runs(): Run[] {
    return readdirSync(this.root)
      .filter((name) => RUN_ID.test(name))
      .sort()
      .flatMap((id) => {
        const run = this.get(id);
        return run ? [run] : [];
      });
  }

  private write(run: Run): Run {
    const file = join(this.root, run.id, "run.json");
    writeFileSync(`${file}.tmp`, JSON.stringify(run, null, 2));
    renameSync(`${file}.tmp`, file);
    return run;
  }
}
