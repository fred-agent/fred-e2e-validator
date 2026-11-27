// The run log's line format, shared by the reporter that writes it and by
// whatever reads it back. It imports nothing from Playwright.

/** One structured line of the run log. */
export type LogLine = Readonly<{
  /** Time since the run started, as mm:ss. */
  time: string;
  /** The worker that ran it, such as "w1"; empty for a test that never ran. */
  worker: string;
  /** The test's title path from its top-level group, as "Sign-in › A rule › A test". */
  test: string;
  /**
   * START, PASS, FAIL, SKIP, step (a step of the test), flow, AFTER (a removal),
   * CAUSE (why it failed, in a sentence), PAGE (what the page showed then),
   * ERROR, or empty for a page-object call.
   */
  event: string;
  /** The page a page-object call ran on and its account, such as "Sign-in page · member". */
  page: string;
  /** The step's title or the message. */
  text: string;
  /** How long it took, such as "1.2s", for a line written when it ended. */
  duration: string;
}>;

/**
 * A run's progress: the tests loaded (total), and how many passed, failed or
 * were skipped, each test counted once by its latest result.
 */
export type RunProgress = Readonly<{
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  done: boolean;
}>;

/** The attachment that records what a page showed when a test or a removal failed. */
export const PAGE_AT_FAILURE = "page at failure";

/** The first line of the error that names a factory fixture's failed removals. */
export const REMOVAL_FAILED = "These removals failed:";

/** Shown when the sign-in pages reject the account, or stay open. */
export const SIGN_IN_FAILED =
  "The sign-in did not finish: check the user name and the password of the account, and the steps of sign-in.json.";

/** Shown when the first sign-in page never appears. */
export const SIGN_IN_NOT_SHOWN =
  "The first sign-in page did not show: check the first step of sign-in.json.";

/** Shown when the steps of the sign-in pages end but the application never appears. */
export const FRED_NOT_SHOWN =
  "The steps of sign-in.json ended, but Fred showed neither its terms nor its signed-in page: check that they reach the end of the sign-in pages.";

/** What they say when a removal finds no folder at all. */
export const NO_FOLDER_LISTED =
  "The space lists no folder, so whether it holds the folder is not known.";

// A separator that stays readable in a terminal and never appears in a title.
const SEPARATOR = " │ ";
const TIME = /^\d{2,}:\d{2}$/;

/** A log line as text: padded columns for a terminal, then the text and its duration. */
export function formatLine(line: LogLine): string {
  const fields = [
    line.time.padEnd(5),
    line.worker.padEnd(2),
    line.test.padEnd(40),
    line.event.padEnd(5),
    line.page.padEnd(17),
    line.text,
  ];
  if (line.duration) fields.push(line.duration);
  return fields.join(SEPARATOR);
}

/** A structured log line read back from text, or undefined for any other line. */
export function parseLine(text: string): LogLine | undefined {
  const fields = text.split(SEPARATOR).map((field) => field.trim());
  if (fields.length < 6 || fields.length > 7 || !TIME.test(fields[0] ?? ""))
    return undefined;
  const [time = "", worker = "", test = "", event = "", page = "", step = ""] =
    fields;
  return {
    time,
    worker,
    test,
    event,
    page,
    text: step,
    duration: fields[6] ?? "",
  };
}

/** Milliseconds as mm:ss. */
export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(seconds / 60))}:${two(seconds % 60)}`;
}
