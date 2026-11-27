// The values several tests share: `test-data/test-data.json`, one committed
// file parsed with a strict schema. An unknown key is rejected, named with
// the file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PROJECT_ROOT } from "./environment.ts";
import { SettingsError } from "./settings-error.ts";

export const TEST_DATA_PATH = join("test-data", "test-data.json");

/** A space a test acts in, by the name the home page shows for it. */
export type Space = Readonly<{ name: string }>;

const TEST_DATA = z.strictObject({
  /** The space the tests work in that need no team of their own. */
  space: z
    .string()
    .min(1)
    .transform((name): Space => Object.freeze({ name })),
  /** The template of an agent a test creates. */
  agentTemplate: z.string().min(1),
  /** The use case of an agent a test creates. */
  agentUseCase: z.string().min(1),
});

export type TestData = Readonly<z.output<typeof TEST_DATA>>;

function describeIssue(issue: z.core.$ZodIssue): string {
  if (issue.code === "unrecognized_keys")
    return `${TEST_DATA_PATH} holds the unknown key ${issue.keys.map((key) => `"${key}"`).join(", ")}; its keys are ${Object.keys(TEST_DATA.shape).join(", ")}.`;
  const where = issue.path.length > 0 ? ` ${issue.path.join(".")}:` : "";
  return `${TEST_DATA_PATH}:${where} ${issue.message}.`;
}

/** The test data of a parsed `test-data/test-data.json`; throws one error naming every problem. */
export function parseTestData(content: unknown): TestData {
  const parsed = TEST_DATA.safeParse(content);
  if (!parsed.success)
    throw new SettingsError(parsed.error.issues.map(describeIssue));
  return Object.freeze(parsed.data);
}

/** Reads and parses `test-data/test-data.json`. */
export function loadTestData(root: string = PROJECT_ROOT): TestData {
  let content: unknown;
  try {
    content = JSON.parse(readFileSync(join(root, TEST_DATA_PATH), "utf8"));
  } catch (error) {
    throw new SettingsError([
      `${TEST_DATA_PATH} could not be read as JSON: ${(error as Error).message}`,
    ]);
  }
  return parseTestData(content);
}
