// How the run page writes times, selections and counts.
import type { RunProgress } from "../../../e2e-framework/reporting/run-log.ts";
import type { Selection } from "../../service/test-view.ts";

export const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const two = (value: number) => String(value).padStart(2, "0");

/** A time as DD-MM-YYYY HH:mm in the viewer's time zone. */
export function shortTime(iso: string): string {
  const at = new Date(iso);
  return `${two(at.getDate())}-${two(at.getMonth() + 1)}-${at.getFullYear()} ${two(at.getHours())}:${two(at.getMinutes())}`;
}

export function describeSelection({ files, tags }: Selection): string {
  if (files.length > 0) return `Test files ${files.join(", ")}`;
  if (tags.length > 0) return `Tags ${tags.join(", ")}`;
  return "Everything";
}

export const finished = (progress: RunProgress) =>
  progress.passed + progress.failed + progress.skipped;

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
