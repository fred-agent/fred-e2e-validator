// The steps of the environment's sign-in pages: `sign-in.json`, parsed with a
// strict schema. No message holds a value of the file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PROJECT_ROOT } from "./environment.ts";
import { SettingsError } from "./settings-error.ts";

const SIGN_IN_FILE = "sign-in.json";

const text = z.string().trim().min(1);
const accountValue = z.enum(["username", "password"]);

const STEP = z.union([
  z.strictObject({ click: text }),
  z.strictObject({ fill: text, with: accountValue }),
]);
const STEP_FORM =
  "a step is a click with a text, or a fill with a text and a with of username or password";

const LIST_FORM = "the file must hold a list of at least one step";

const STEPS = z
  .array(STEP, LIST_FORM)
  .min(1, LIST_FORM)
  .pipe(z.tuple([STEP], STEP))
  .refine(
    (steps) => "click" in lastStep(steps),
    "the last step must be a click",
  );

export type AccountValue = z.infer<typeof accountValue>;
export type SignInStep = Readonly<z.infer<typeof STEP>>;
export type SignInSteps = readonly [SignInStep, ...SignInStep[]];

export function lastStep(steps: SignInSteps): SignInStep {
  return steps.reduce((_earlier, step) => step);
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const [index] = issue.path;
  return typeof index === "number"
    ? `${SIGN_IN_FILE}: step ${index + 1}: ${STEP_FORM}.`
    : `${SIGN_IN_FILE}: ${issue.message}.`;
}

/** The steps of a parsed `sign-in.json`; throws one error naming every problem. */
export function parseSignInSteps(content: unknown): SignInSteps {
  const parsed = STEPS.safeParse(content);
  if (!parsed.success)
    throw new SettingsError([
      ...new Set(parsed.error.issues.map(describeIssue)),
    ]);
  for (const step of parsed.data) Object.freeze(step);
  return Object.freeze(parsed.data);
}

let cached: SignInSteps | undefined;

/** The project's `sign-in.json`, read and parsed on first use, once per process. */
export function readSignInSteps(): SignInSteps {
  if (cached) return cached;
  let content: unknown;
  try {
    content = JSON.parse(
      readFileSync(join(PROJECT_ROOT, SIGN_IN_FILE), "utf8"),
    );
  } catch {
    throw new SettingsError([
      `${SIGN_IN_FILE}: the file is missing or holds no valid JSON.`,
    ]);
  }
  cached = parseSignInSteps(content);
  return cached;
}
