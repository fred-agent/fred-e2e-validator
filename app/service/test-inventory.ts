// The test inventory: the test files and their tests, as Playwright lists
// them with `playwright test --list --reporter=json`, read once when the
// service starts. A test that does not load stops the service. So that each
// line of a test list names one test, and the run executes exactly the tests
// the inventory counts, the inventory refuses a title a test list line cannot
// hold as it is: an empty one, one with spaces at its start or end, one with
// a line break, and one with `›` or `>`, which a test list reads as
// separators; and it refuses a title path that is the start of another one
// of the same file.
import { spawnSync } from "node:child_process";
import { isAbsolute, join, relative } from "node:path";
import type {
  JSONReport,
  JSONReportSpec,
  JSONReportSuite,
} from "@playwright/test/reporter";
import type { Test, TestFile, TestInventory } from "./test-view.ts";

/** The tests do not load, or break a rule of their titles. */
export class TestInventoryError extends Error {
  override name = "TestInventoryError";
}

const SEPARATOR = /[›>]/;
// Playwright's messages carry terminal colours.
// eslint-disable-next-line no-control-regex
const plain = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, "");

/** Whether `start` is `path` or its beginning, title by title. */
const startsWith = (path: readonly string[], start: readonly string[]) =>
  start.length <= path.length &&
  start.every((title, index) => path[index] === title);

function testOf(spec: JSONReportSpec, groups: readonly string[]): Test {
  return {
    titlePath: [...groups, spec.title],
    // The JSON report writes a tag without its `@`.
    tags: [...new Set(spec.tags.map((tag) => `@${tag}`))],
    planned: spec.tests.some((test) =>
      test.annotations.some((annotation) => annotation.type === "fixme"),
    ),
  };
}

/** The tests of a suite and of the groups inside it, in their order. */
function testsOf(suite: JSONReportSuite, groups: readonly string[]): Test[] {
  return [
    ...suite.specs.map((spec) => testOf(spec, groups)),
    ...(suite.suites ?? []).flatMap((group) =>
      testsOf(group, [...groups, group.title]),
    ),
  ];
}

/**
 * Why a test list line cannot hold a title as it is, or undefined. A test
 * list splits its lines at line breaks and its titles at `›` or `>`, trims
 * each title, and Playwright leaves an unnamed group out of a title path.
 */
function titleFault(title: string): string | undefined {
  if (/[\r\n]/.test(title)) return "a title with a line break";
  if (SEPARATOR.test(title))
    return "a title with › or >, which a test list reads as separators";
  if (title === "") return "an empty title, such as an unnamed test.describe";
  if (title !== title.trim()) return "a title with spaces at its start or end";
  return undefined;
}

/** Every title path of a file that breaks a rule of the test list, named. */
function titleProblems(file: TestFile): string[] {
  const problems: string[] = [];
  const shown = (test: Test) =>
    test.titlePath.map((title) => JSON.stringify(title)).join(" / ");
  const where = `tests/${file.path}`;
  for (const test of file.tests) {
    for (const fault of new Set(test.titlePath.map(titleFault)))
      if (fault)
        problems.push(
          `${where}: the title path ${shown(test)} holds ${fault}, so a test list line cannot name the test.`,
        );
    for (const other of file.tests)
      if (other !== test && startsWith(other.titlePath, test.titlePath))
        problems.push(
          `${where}: the title path ${shown(test)} is the start of ${shown(other)}, so a test list line would run both.`,
        );
  }
  return problems;
}

function fileOf(suite: JSONReportSuite): TestFile {
  const path = suite.file;
  const slash = path.indexOf("/");
  return {
    path,
    area: slash > 0 ? path.slice(0, slash) : "",
    title: suite.suites?.[0]?.title ?? path,
    tests: testsOf(suite, []),
  };
}

/** Validates file loading and title paths before returning the inventory. */
export function inventoryOf(report: JSONReport, root: string): TestInventory {
  if (report.errors.length > 0)
    throw new TestInventoryError(
      [
        "The tests do not load:",
        ...report.errors.map((error) => {
          const file = error.location?.file;
          const where = file
            ? `${isAbsolute(file) ? relative(root, file) : file}: `
            : "";
          return `${where}${plain(error.message ?? error.value ?? "").trim()}`;
        }),
      ].join("\n"),
    );
  const files = report.suites.map(fileOf);
  const problems = files.flatMap(titleProblems);
  if (problems.length > 0)
    throw new TestInventoryError(
      ["The titles of the tests break a rule:", ...problems].join("\n"),
    );
  const tags = [
    ...new Set(
      files.flatMap((file) => file.tests.flatMap((test) => test.tags)),
    ),
  ].sort();
  return { files, tags };
}

/** The report a JSON text holds, or undefined when the text is not one. */
function reportOf(text: string): JSONReport | undefined {
  try {
    const report = JSON.parse(text) as Partial<JSONReport>;
    return Array.isArray(report.suites) && Array.isArray(report.errors)
      ? (report as JSONReport)
      : undefined;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

/** Reads the test list from the locally installed Playwright runner. */
export function readTestInventory(root: string): TestInventory {
  const result = spawnSync(
    join(root, "node_modules", ".bin", "playwright"),
    ["test", "--list", "--reporter=json"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0" },
    },
  );
  if (result.error) throw result.error;
  const report = reportOf(result.stdout);
  if (report) {
    const inventory = inventoryOf(report, root);
    if (result.status === 0) return inventory;
  }
  throw new TestInventoryError(
    [
      `The tests do not load: playwright test --list exited with ${result.status ?? result.signal}.`,
      plain(result.stderr).trim(),
      report ? "" : plain(result.stdout).trim(),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
