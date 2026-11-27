// The host scopes requests to the current team and attaches the caller's token.
import type { FredApplicationClient } from "@fred-oss/iframe-sdk";
import type { RunProgress } from "../../../e2e-framework/reporting/run-log.ts";
import type { RunView } from "../../service/routes.ts";
import type { Run, RunState } from "../../service/runs.ts";
import type { TestInventory } from "../../service/test-view.ts";

export type { Run, RunProgress, RunState, RunView, TestInventory };

export type TestsAnswer = Readonly<{
  inventory: TestInventory;
  /** The configured test target. */
  fredUrl: string;
  /** The default number of workers, and the most a run may ask for. */
  workers: Readonly<{ default: number; max: number }>;
}>;

export type RunsAnswer = Readonly<{
  runs: readonly RunView[];
  /** Whether a run of any team is in progress. */
  running: boolean;
}>;

export type LogChunk = Readonly<{
  text: string;
  offset: number;
  /** More text is waiting beyond this chunk. */
  more: boolean;
  state: RunState;
  progress?: RunProgress;
}>;

export type StartRequest = Readonly<{
  files?: readonly string[];
  tags?: readonly string[];
  workers: number;
}>;

/** A report can be large: it gets more than the SDK's default 30 seconds. */
const REPORT_TIMEOUT_MS = 120_000;

/** The service's message for a refusal, from `{ detail: { message } }`. */
async function refusal(response: Response): Promise<Error> {
  const text = await response.text();
  let message = `The service answered ${response.status}.`;
  try {
    const body = JSON.parse(text) as { detail?: { message?: unknown } };
    if (typeof body.detail?.message === "string") message = body.detail.message;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return new Error(message);
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw await refusal(response);
  return (await response.json()) as T;
}

async function ok(response: Response): Promise<Response> {
  if (!response.ok) throw await refusal(response);
  return response;
}

export type Service = ReturnType<typeof serviceOf>;

export function serviceOf(fred: FredApplicationClient) {
  return {
    tests: async () => json<TestsAnswer>(await fred.request("tests")),
    runs: async () => json<RunsAnswer>(await fred.request("runs")),
    start: async (request: StartRequest) =>
      json<Run>(
        await fred.request("runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        }),
      ),
    log: async (id: string, offset: number) =>
      json<LogChunk>(await fred.request(`runs/${id}/log?offset=${offset}`)),
    cancel: async (id: string) =>
      ok(await fred.request(`runs/${id}/cancel`, { method: "POST" })),
    report: async (id: string) =>
      (
        await ok(
          await fred.request(`runs/${id}/report`, {
            timeoutMs: REPORT_TIMEOUT_MS,
          }),
        )
      ).text(),
    archive: async (id: string) =>
      (
        await ok(
          await fred.request(`runs/${id}/report.tar.gz`, {
            timeoutMs: REPORT_TIMEOUT_MS,
          }),
        )
      ).blob(),
  };
}
