import { test } from "@playwright/test";

/**
 * Runs an operation made of several page-object calls as one Playwright step
 * with the subtitle "flow"; the run log and the report show the calls inside
 * it.
 */
export async function flowStep<T>(
  title: string,
  body: () => Promise<T>,
): Promise<T> {
  return test.step(title, body, { subtitle: "flow" });
}
