// Failure summaries describe the action, locator role and timing.
import { stripVTControlCharacters } from "node:util";
import { INCOMPLETE_ACCOUNTS } from "../config/accounts.ts";
import {
  FRED_NOT_SHOWN,
  NO_FOLDER_LISTED,
  REMOVAL_FAILED,
  SIGN_IN_FAILED,
} from "./run-log.ts";

const seconds = (ms: number) => `${Math.round(ms / 1000)} s`;

/** One `getByX(...)` or `locator(...)` part of a locator, described. */
function describePart(part: string): string | undefined {
  const role = /^getByRole\('([a-z]+)'/.exec(part);
  if (role) return role[1];
  if (/^getByText\(/.test(part)) return "text";
  if (/^getBy(?:Label|Placeholder)\(/.test(part)) return "field";
  if (part.startsWith("locator(")) return "element";
  return undefined;
}

/** Describe the target and its enclosing locator by kind. */
export function describeLocator(locator: string): string {
  const parts = locator
    .split(/\.(?=getBy|locator\(|filter\(|first\(|last\(|nth\()/)
    .map((part) => part.trim());
  const described = parts
    .map(describePart)
    .filter((part): part is string => part !== undefined);
  const target = described.at(-1);
  if (!target) return "element";
  const scope = described.at(-2);
  return scope ? `${target} in ${scope}` : target;
}

const line = (message: string, label: string) =>
  new RegExp(`^${label}: (.+)$`, "m").exec(message)?.[1]?.trim();

/** What an assertion's matcher checks, phrased after "Expected <target>". */
const CHECKS: Readonly<Record<string, string>> = {
  toBeVisible: "to be visible",
  toBeHidden: "to be hidden",
  toBeChecked: "to be checked",
  toBeEnabled: "to be enabled",
  toBeDisabled: "to be disabled",
  toHaveText: "to have the text",
  toContainText: "to contain the text",
  toHaveValue: "to have the value",
  toHaveAttribute: "to have the attribute",
  toHaveAccessibleName: "to be named",
  toHaveCount: "to count",
  toHaveURL: "to be at",
};

function explainAssertion(message: string): string | undefined {
  // Matchers with arguments name them, as in "toHaveValue(expected) failed".
  const head = /expect\((locator|page)\)\.(not\.)?(\w+)\([^)]*\) failed/.exec(
    message,
  );
  if (!head) return undefined;
  const explanation = describeAssertion(message, head);
  return explanation.charAt(0).toUpperCase() + explanation.slice(1);
}

/** What an assertion checked and what it found, from its matcher's line on. */
function describeAssertion(message: string, head: RegExpExecArray): string {
  const [, subject, not, matcher = ""] = head;
  const target =
    subject === "page"
      ? "the page"
      : describeLocator(line(message, "Locator") ?? "the element");
  const timeout = line(message, "Timeout")?.match(/^(\d+)ms/)?.[1];
  const waited = timeout ? ` (waited ${seconds(Number(timeout))})` : "";
  // Playwright reports a missing element this way for negated checks too.
  if (/element\(s\) not found/.test(message))
    return `could not find ${target}${waited}`;
  const check = Object.hasOwn(CHECKS, matcher)
    ? CHECKS[matcher]
    : "to pass its check";
  return `expected ${target} ${not ? "not " : ""}${check}${waited}`;
}

/** Why an action waited, from its call log, newest reason first. */
const REASONS: readonly [RegExp, string][] = [
  [/intercepts pointer events/, "another element covers it"],
  [/element was detached from the DOM/, "it disappeared from the page"],
  [/element is inert/, "it is inert"],
  [/element is not visible/, "it is hidden"],
  [/element is not enabled/, "it is disabled"],
  [/element is not stable/, "it kept moving"],
  [/element is not editable/, "it is read-only"],
];

const VERBS: Readonly<Record<string, string>> = {
  click: "click",
  dblclick: "double-click",
  fill: "fill in",
  check: "check",
  uncheck: "uncheck",
  hover: "hover over",
  selectOption: "choose an option in",
  setInputFiles: "set the files of",
  press: "press a key in",
};

function explainAction(message: string): string | undefined {
  const head =
    /locator\.(\w+): (?:Test )?[Tt]imeout (?:of )?(\d+)ms exceeded/.exec(
      message,
    );
  if (!head) return undefined;
  const [, action = "", ms = "0"] = head;
  const waitedFor = /waiting for (\S.*)$/m.exec(message)?.[1];
  const target = waitedFor ? describeLocator(waitedFor) : "the element";
  const resolved = /locator resolved to/.test(message);
  const reason = REASONS.find(([pattern]) => pattern.test(message))?.[1];
  const why = reason ?? (resolved ? undefined : "it was not found");
  const verb = Object.hasOwn(VERBS, action) ? VERBS[action] : "interact with";
  const limit = /Test timeout/.test(head[0])
    ? ` before the test timed out (${seconds(Number(ms))})`
    : ` (waited ${seconds(Number(ms))})`;
  return `Could not ${verb} ${target}${why ? `: ${why}` : ""}${limit}`;
}

/**
 * One sentence on why a test failed, or undefined when the message is not one
 * of Playwright's assertion, action or timeout errors.
 */
export function summarizeFailure(message: string): string | undefined {
  const action = explainAction(message);
  if (action) return action;
  const assertion = explainAssertion(message);
  if (assertion) return assertion;
  const testTimeout = /Test timeout of (\d+)ms exceeded/.exec(message);
  if (testTimeout)
    return `The test ran out of time (${seconds(Number(testTimeout[1]))})`;
  return undefined;
}

// An error's text without the error's type, as in "Error: …".
const withoutType = (message: string) =>
  message.replace(/^\w*Error: /, "").trim();

const isRemoval = (message: string) =>
  withoutType(message).startsWith(REMOVAL_FAILED);

/** Summarize cleanup failures by count. */
function summarizeRemovals(message: string): string {
  const entries = withoutType(message)
    .slice(REMOVAL_FAILED.length)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return `${entries.length} cleanup ${entries.length === 1 ? "operation" : "operations"} failed.`;
}

// What an action or an assertion could not do.
const explainStep = (message: string) =>
  explainAction(message) ?? explainAssertion(message);

const TEST_TIMEOUT = /Test timeout of \d+ms exceeded/;

/** The messages of the support code a report shows as they are. */
const FIXED_MESSAGES = [
  SIGN_IN_FAILED,
  FRED_NOT_SHOWN,
  NO_FOLDER_LISTED,
  INCOMPLETE_ACCOUNTS,
] as const;

/**
 * Why a test failed, in one sentence, from its errors in the order the runner
 * reports them and whether the test itself raised one before its teardown.
 * When it did, its own error is the first of them, and the cause explains
 * it: a message the support code gives as it is, else what an action or an
 * assertion could not do, else another Playwright failure, else a generic
 * description. A timed-out test reports its time-out first
 * and the pending action's error right after it, which then explains it.
 * The errors after the first are never the cause. When the test itself
 * raised none, the removals' error is the cause, ahead of an error a removal
 * raised after its limit, which comes before it.
 */
export function failureCause(
  coloredMessages: readonly string[],
  testRaisedError: boolean,
): string | undefined {
  // Playwright's messages carry terminal colours.
  const messages = coloredMessages.map((text) =>
    stripVTControlCharacters(text),
  );
  const removals = messages.find(isRemoval);
  if (removals !== undefined && !testRaisedError)
    return summarizeRemovals(removals);
  const own = messages.filter((message) => !isRemoval(message));
  const [first, second] = own;
  if (first === undefined)
    return removals === undefined ? undefined : summarizeRemovals(removals);
  if (
    second !== undefined &&
    TEST_TIMEOUT.test(withoutType(first).split("\n")[0] ?? "") &&
    TEST_TIMEOUT.test(second)
  ) {
    const pending = explainStep(second);
    if (pending) return pending;
  }
  return (
    FIXED_MESSAGES.find((message) => first.includes(message)) ??
    explainStep(first) ??
    summarizeFailure(first) ??
    "The operation failed."
  );
}
