import { join } from "node:path";
import type { ReporterDescription } from "@playwright/test";

export const STEP_REPORTER = join(import.meta.dirname, "step-report.ts");
export const RUN_LOG_REPORTER = join(
  import.meta.dirname,
  "run-log-reporter.ts",
);

const REPORTERS_AFTER_FILTER = new Set(["list", "html", RUN_LOG_REPORTER]);

/** Live event reporters can retain browser operations before a test ends. */
export function checkRunReporters(
  reporters: readonly ReporterDescription[],
): void {
  const [first, ...others] = reporters.map(([name]) => name);
  // The runner appends this reporter separately from its resolved configuration.
  const additional = process.env.PW_TEST_REPORTER;
  if (additional) others.push(additional);
  if (
    first !== STEP_REPORTER ||
    others.some((name) => !REPORTERS_AFTER_FILTER.has(name))
  )
    throw new Error(
      "Use the project's configured reporters to run tests. Omit reporter overrides.",
    );
}
