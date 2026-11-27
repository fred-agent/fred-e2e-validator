// The steps of the environment's sign-in pages, `sign-in.json`, and of what
// its sign-out asks after "Disconnect", `sign-out.json`, parsed with strict
// schemas. No message holds a value of the files.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PROJECT_ROOT } from "./environment.ts";
import { SettingsError } from "./settings-error.ts";

const SIGN_IN_FILE = "sign-in.json";

const text = z.string().trim().min(1);
const accountValue = z.enum(["username", "password"]);

const STEP = z.union([
  z.strictObject({ click: text, ifShown: z.literal(true).optional() }),
  z.strictObject({ fill: text, with: accountValue }),
]);
const STEP_FORM =
  "a step is a click with a text and an optional ifShown of true, or a fill with a text and a with of username or password";

const LIST_FORM = "the file must hold a list of at least one step";

const STEPS = z
  .array(STEP, LIST_FORM)
  .min(1, LIST_FORM)
  .pipe(z.tuple([STEP], STEP))
  .refine(
    (steps) => "click" in lastStep(steps),
    "the last step must be a click",
  )
  .refine(
    (steps) =>
      steps
        .slice(leadingOptional(steps).length)
        .every((step) => !isOptional(step)),
    "a step with ifShown comes before every other step",
  )
  .refine(
    (steps) => leadingOptional(steps).length < steps.length,
    "the list needs a step without ifShown",
  );

export type AccountValue = z.infer<typeof accountValue>;
export type SignInStep = Readonly<z.infer<typeof STEP>>;
export type SignInSteps = readonly [SignInStep, ...SignInStep[]];

/** A click that is carried out only when its button or link shows, such as an account picker's. */
export function isOptional(step: SignInStep): boolean {
  return "click" in step && step.ifShown === true;
}

/** The optional steps the list starts with. */
export function leadingOptional(
  steps: readonly SignInStep[],
): readonly SignInStep[] {
  const end = steps.findIndex((step) => !isOptional(step));
  return end === -1 ? steps : steps.slice(0, end);
}

export function lastStep(steps: SignInSteps): SignInStep {
  return steps.reduce((_earlier, step) => step);
}

function describeIssue(
  file: string,
  stepForm: string,
  issue: z.core.$ZodIssue,
): string {
  const [index] = issue.path;
  return typeof index === "number"
    ? `${file}: step ${index + 1}: ${stepForm}.`
    : `${file}: ${issue.message}.`;
}

/** The steps of a parsed `sign-in.json`; throws one error naming every problem. */
export function parseSignInSteps(content: unknown): SignInSteps {
  const parsed = STEPS.safeParse(content);
  if (!parsed.success)
    throw new SettingsError([
      ...new Set(
        parsed.error.issues.map((issue) =>
          describeIssue(SIGN_IN_FILE, STEP_FORM, issue),
        ),
      ),
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

const SIGN_OUT_FILE = "sign-out.json";

/** The account value a sign-out step chooses the account by. */
const accountChoice = z.enum(["username", "email"]);

const SIGN_OUT_STEP = z.union([
  z.strictObject({ click: text }),
  z.strictObject({ choose: accountChoice }),
]);
const SIGN_OUT_STEP_FORM =
  "a step is a click with a text, or a choose of username or email";

const SIGN_OUT_STEPS = z.array(
  SIGN_OUT_STEP,
  "the file must hold a list of steps",
);

export type AccountChoice = z.infer<typeof accountChoice>;
export type SignOutStep = Readonly<z.infer<typeof SIGN_OUT_STEP>>;
export type SignOutSteps = readonly SignOutStep[];

/** The steps of a parsed `sign-out.json`; throws one error naming every problem. */
export function parseSignOutSteps(content: unknown): SignOutSteps {
  const parsed = SIGN_OUT_STEPS.safeParse(content);
  if (!parsed.success)
    throw new SettingsError([
      ...new Set(
        parsed.error.issues.map((issue) =>
          describeIssue(SIGN_OUT_FILE, SIGN_OUT_STEP_FORM, issue),
        ),
      ),
    ]);
  for (const step of parsed.data) Object.freeze(step);
  return Object.freeze(parsed.data);
}

let cachedSignOut: SignOutSteps | undefined;

/**
 * The project's `sign-out.json`, read and parsed on first use, once per
 * process. Without the file, "Disconnect" leads to the first sign-in page and
 * the list is empty.
 */
export function readSignOutSteps(): SignOutSteps {
  if (cachedSignOut) return cachedSignOut;
  const file = join(PROJECT_ROOT, SIGN_OUT_FILE);
  if (!existsSync(file)) {
    cachedSignOut = Object.freeze([]);
    return cachedSignOut;
  }
  let content: unknown;
  try {
    content = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new SettingsError([
      `${SIGN_OUT_FILE}: the file holds no valid JSON.`,
    ]);
  }
  cachedSignOut = parseSignOutSteps(content);
  return cachedSignOut;
}
