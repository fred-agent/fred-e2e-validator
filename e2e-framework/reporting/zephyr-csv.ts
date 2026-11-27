// A CSV of the run for Zephyr (Jira), Squad or Scale: one row per step of the
// test file, the test's columns repeated on each row, so an import that
// groups rows by a change of test name reads one test case per test, with
// its steps and results. A test without steps has one row. The account
// fields stay hidden, as in the HTML report.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { stripVTControlCharacters } from "node:util";
import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { privateAccountFields } from "./step-report.ts";

export type ZephyrCsvOptions = Readonly<{ outputFile: string }>;

const COLUMNS = [
  "Name",
  "Description",
  "Folder",
  "Labels",
  "Test Status",
  "Executed On",
  "Duration (s)",
  "Environment",
  "Comment",
  "Step",
  "Step Result",
] as const;
type Row = Readonly<Record<(typeof COLUMNS)[number], string>>;

/** Zephyr's execution statuses, which the import maps to the project's own. */
const STATUS: Readonly<Record<TestResult["status"], string>> = {
  passed: "Pass",
  failed: "Fail",
  timedOut: "Fail",
  interrupted: "Blocked",
  skipped: "Not Executed",
};

/** A field as RFC 4180 writes it: quoted when it holds a comma, a quote or a line break. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** The steps the test file itself declares, without the page-object steps inside them. */
function fileSteps(steps: readonly TestStep[], file: string): TestStep[] {
  return steps.flatMap((step) =>
    step.location?.file === file ? [step] : fileSteps(step.steps, file),
  );
}

function stepResult(step: TestStep): string {
  if (step.error) return "Fail";
  return step.duration < 0 ? "Not Executed" : "Pass";
}

type Entry = Readonly<{ test: TestCase; result: TestResult }>;

export default class ZephyrCsv implements Reporter {
  private readonly outputFile: string;
  private readonly hiddenFields = privateAccountFields();
  /** The last result of each test, by id: a retry replaces the earlier one. */
  private readonly entries = new Map<string, Entry>();
  private testDir = "";
  private environment = "";

  constructor(options: ZephyrCsvOptions) {
    this.outputFile = options.outputFile;
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig): void {
    const project = config.projects[0];
    this.testDir = project?.testDir ?? config.rootDir;
    const baseURL = project?.use.baseURL;
    this.environment = baseURL ? new URL(baseURL).host : "";
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.entries.set(test.id, { test, result });
  }

  onEnd(): void {
    const entries = [...this.entries.values()].sort(
      (a, b) =>
        a.test.location.file.localeCompare(b.test.location.file) ||
        a.test.location.line - b.test.location.line,
    );
    const lines = [
      COLUMNS.join(","),
      ...entries
        .flatMap((entry) => this.rows(entry))
        .map((row) => COLUMNS.map((column) => csvField(row[column])).join(",")),
    ];
    mkdirSync(dirname(this.outputFile), { recursive: true });
    // The byte order mark lets Excel and the import read UTF-8.
    writeFileSync(this.outputFile, `\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
  }

  private redact(text: string): string {
    let clean = stripVTControlCharacters(text);
    for (const field of this.hiddenFields) clean = clean.replaceAll(field, "…");
    return clean.trim();
  }

  private rows({ test, result }: Entry): Row[] {
    const file = relative(this.testDir, test.location.file);
    // titlePath: the root, the project, the file, the describes, the test.
    const describes = test.titlePath().slice(3, -1);
    const testColumns: Omit<Row, "Step" | "Step Result"> = {
      Name: this.redact(test.title),
      Description: this.redact(describes.join(" › ")),
      Folder: `/${dirname(file) === "." ? "" : dirname(file)}`,
      Labels: test.tags.map((tag) => tag.replace(/^@/, "")).join(","),
      "Test Status": STATUS[result.status],
      "Executed On": result.startTime.toISOString(),
      "Duration (s)": (result.duration / 1000).toFixed(1),
      Environment: this.environment,
      Comment: this.redact(result.error?.message ?? ""),
    };
    const steps = fileSteps(result.steps, test.location.file);
    if (steps.length === 0)
      return [{ ...testColumns, Step: "", "Step Result": "" }];
    return steps.map((step) => ({
      ...testColumns,
      Step: this.redact(step.title),
      "Step Result": stepResult(step),
    }));
  }
}

/** The folder of the Zephyr files: ZEPHYR_REPORT_DIR, or zephyr-report. */
export function zephyrReportDir(rootDir: string): string {
  return (
    process.env.ZEPHYR_REPORT_DIR?.trim() || join(rootDir, "zephyr-report")
  );
}
