// The run log records authored steps. Their subtitles distinguish test steps,
// flows, removals, and calls to page objects, components or the API adapter.
// The reporter also writes progress to the configured file.
import { appendFileSync, renameSync, writeFileSync } from "node:fs";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import {
  elapsed,
  formatLine,
  PAGE_AT_FAILURE,
  type RunProgress,
} from "./run-log.ts";

export type RunLogOptions = Readonly<{
  /** The progress file read by the run page. */
  progressFile?: string | undefined;
  logFile?: string | undefined;
}>;

const EVENTS: Readonly<Record<TestResult["status"], [string, string]>> = {
  passed: ["PASS", "Test passed"],
  failed: ["FAIL", "Test failed"],
  timedOut: ["FAIL", "Test timed out"],
  interrupted: ["FAIL", "Test interrupted"],
  skipped: ["SKIP", "Test skipped"],
};

const FLOW = "flow";
const REMOVAL = "removal";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
/**
 * A test's name: its title path from the top-level group, as in
 * "Sign-in › A signed-in user lands on the home page › A member signs in".
 * The title path starts with the root, the project and the file.
 */
function testName(test: TestCase): string {
  return test.titlePath().slice(3).join(" › ");
}

const isOwnStep = (step: TestStep) => step.category === "test.step";

/** Whether a step is a factory fixture's removal, or runs inside one. */
function inRemoval(step: TestStep): boolean {
  for (
    let current: TestStep | undefined = step;
    current;
    current = current.parent
  )
    if (isOwnStep(current) && current.subtitle === REMOVAL) return true;
  return false;
}

/** The page and account of a page-object call, or undefined for the framework's other steps. */
function pageOf(step: TestStep): string | undefined {
  const subtitle = step.subtitle;
  return subtitle && subtitle !== FLOW && subtitle !== REMOVAL
    ? subtitle
    : undefined;
}

/**
 * Whether a worker ran the test. A test skipped without running has the worker
 * index -1.
 */
const ran = (result: TestResult) => result.workerIndex >= 0;

/**
 * What the pages showed when the test or a removal failed, as the test's
 * fixtures attached it: each failed removal's page, and the test's pages.
 */
function pagesAtFailure(result: TestResult): string[] {
  return result.attachments.flatMap((item) => {
    const body = item.name === PAGE_AT_FAILURE ? item.body : undefined;
    return body === undefined ? [] : [body.toString("utf8")];
  });
}

/**
 * A line when a test starts and ends, when a step of the test or a flow
 * begins, and when a page-object call ends, with its duration. A removal and
 * everything inside it are marked AFTER and come before the end line. A
 * failed test's cause, pages and errors come just before its end line. A test
 * that never ran has only its end line, without a worker.
 */
export default class RunLogReporter implements Reporter {
  private started = Date.now();
  private total = 0;
  // The page of each test's first failed page-object call, for its CAUSE line.
  private readonly failedPages = new Map<string, string>();
  // Each test's result, so a test is counted once.
  private readonly statuses = new Map<string, TestResult["status"]>();
  private readonly progressFile: string | undefined;

  private readonly logFile: string | undefined;

  constructor(options: RunLogOptions = {}) {
    this.logFile = options.logFile;
    this.progressFile = options.progressFile;
  }

  printsToStdio(): boolean {
    return true;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.started = Date.now();
    const total = suite.allTests().length;
    this.total = total;
    const workers = config.workers;
    this.write(
      `Running ${total} ${total === 1 ? "test" : "tests"} using ${workers} ${workers === 1 ? "worker" : "workers"}`,
    );
    this.saveProgress(false);
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    if (ran(result)) this.line(test, result, "START", "", "Test started", "");
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    if (!isOwnStep(step) || pageOf(step) !== undefined) return;
    const event = inRemoval(step)
      ? "AFTER"
      : step.subtitle === FLOW
        ? "flow"
        : "step";
    this.line(test, result, event, "", step.title, "");
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const page = isOwnStep(step) ? pageOf(step) : undefined;
    if (page === undefined) return;
    const after = inRemoval(step);
    if (step.error && !after && !this.failedPages.has(test.id))
      this.failedPages.set(test.id, page);
    const event = after ? "AFTER" : step.error ? "FAIL" : "";
    this.line(test, result, event, page, step.title, seconds(step.duration));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const page = this.failedPages.get(test.id) ?? "";
    this.failedPages.delete(test.id);
    const cause = result.errors[0]?.message;
    if (cause) this.line(test, result, "CAUSE", page, cause, "");
    for (const shown of pagesAtFailure(result))
      this.line(test, result, "PAGE", "", `Showed ${shown}`, "");
    for (const error of result.errors)
      this.line(
        test,
        result,
        "ERROR",
        "",
        error.message ?? "The operation failed.",
        "",
      );
    const [event, text] = EVENTS[result.status];
    this.line(test, result, event, "", text, seconds(result.duration));
    this.statuses.set(test.id, result.status);
    this.saveProgress(false);
  }

  onError(error: TestError): void {
    this.write(error.message ?? "Run setup failed.");
  }

  onEnd(result: FullResult): void {
    const { passed, failed, skipped } = this.progress(true);
    const parts = [`${passed} passed`];
    if (failed) parts.push(`${failed} failed`);
    if (skipped) parts.push(`${skipped} skipped`);
    this.write(`${parts.join(", ")} (${seconds(result.duration)})`);
    this.saveProgress(true);
  }

  private line(
    test: TestCase,
    result: TestResult,
    event: string,
    page: string,
    text: string,
    duration: string,
  ): void {
    this.write(
      formatLine({
        time: elapsed(Date.now() - this.started),
        worker: ran(result) ? `w${result.parallelIndex + 1}` : "",
        test: testName(test),
        event,
        page,
        text,
        duration,
      }),
    );
  }

  private write(text: string): void {
    const { logFile } = this;
    if (logFile) this.writeFile(() => appendFileSync(logFile, `${text}\n`));
    else process.stdout.write(`${text}\n`);
  }

  /** Writes a file of the run; one that cannot be written changes no result. */
  private writeFile(write: () => void): void {
    try {
      write();
    } catch (error) {
      const { code } = error as NodeJS.ErrnoException;
      process.stderr.write(`A run file could not be written (${code}).\n`);
    }
  }

  /** The tests loaded, and how many passed, failed or were skipped so far. */
  private progress(done: boolean): RunProgress {
    const counts = { passed: 0, failed: 0, skipped: 0 };
    for (const status of this.statuses.values()) {
      if (status === "passed") counts.passed += 1;
      else if (status === "skipped") counts.skipped += 1;
      else counts.failed += 1;
    }
    return { total: this.total, ...counts, done };
  }

  private saveProgress(done: boolean): void {
    const { progressFile } = this;
    if (!progressFile) return;
    // Written whole, then renamed, so a reader never sees half of it.
    this.writeFile(() => {
      writeFileSync(`${progressFile}.tmp`, JSON.stringify(this.progress(done)));
      renameSync(`${progressFile}.tmp`, progressFile);
    });
  }
}
