// The gateway removes the application prefix before forwarding team requests.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { RunProgress } from "../../e2e-framework/reporting/run-log.ts";
import { APP_ID } from "../app-id.ts";
import type { Admit } from "./admit.ts";
import type { ServiceConfig } from "./config.ts";
import {
  HttpError,
  notFound,
  readJson,
  sendError,
  sendFile,
  sendJson,
  sendText,
} from "./http.ts";
import { servePage } from "./page.ts";
import { RunEndedError } from "./runner.ts";
import type { Run, RunRequest, RunStore } from "./runs.ts";
import { countTests, type Selection, type TestInventory } from "./test-view.ts";

/** What the routes need of the runner. */
export type RunControl = Readonly<{
  current(): Run | undefined;
  start(team: string, request: RunRequest): Run;
  cancel(id: string): void;
}>;

export type ServiceDependencies = Readonly<{
  config: ServiceConfig;
  inventory: TestInventory;
  store: RunStore;
  runner: RunControl;
  admit: Admit;
  /** The folder containing the built page and its assets. */
  uiDir: string;
}>;

/** A run as the run page sees it, with its progress once the tests are loaded. */
export type RunView = Run & Readonly<{ progress?: RunProgress }>;

type TeamRequest = Readonly<{
  deps: ServiceDependencies;
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  team: string;
}>;
type TeamRoute = Readonly<{
  method: string;
  path: string;
  handle(request: TeamRequest): Promise<void> | void;
}>;
type RunRoute = Readonly<{
  method: string;
  /** The operation following the run identifier. */
  path: string;
  handle(request: TeamRequest, run: Run): void;
}>;

function view(store: RunStore, run: Run): RunView {
  const progress = store.progress(run.id);
  return progress ? { ...run, progress } : run;
}

function names(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (Array.isArray(value) && value.every((item) => typeof item === "string"))
    return value;
  throw new HttpError(
    400,
    "invalid_request",
    `${field} must be a list of names.`,
  );
}

/** Refuses a selection the inventory cannot run. */
function checkSelection(inventory: TestInventory, selection: Selection): void {
  if (selection.files.length > 0 && selection.tags.length > 0)
    throw new HttpError(
      400,
      "invalid_selection",
      "Choose test files or tags, not both.",
    );
  const known = inventory.files.map((file) => file.path);
  const unknownFiles = selection.files.filter((file) => !known.includes(file));
  if (unknownFiles.length > 0)
    throw new HttpError(
      400,
      "unknown_test_files",
      `Unknown test files: ${unknownFiles.join(", ")}.`,
    );
  const unknownTags = selection.tags.filter(
    (tag) => !inventory.tags.includes(tag),
  );
  if (unknownTags.length > 0)
    throw new HttpError(
      400,
      "unknown_tags",
      `Unknown tags: ${unknownTags.join(", ")}. Known: ${inventory.tags.join(", ")}.`,
    );
  if (countTests(inventory, selection) === 0)
    throw new HttpError(
      400,
      "nothing_to_run",
      "The selection runs no automated test.",
    );
}

function startRequest(body: unknown, deps: ServiceDependencies): RunRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new HttpError(400, "invalid_request", "Send a JSON object.");
  const { files, tags, workers, ...rest } = body as Record<string, unknown>;
  const unknownFields = Object.keys(rest);
  if (unknownFields.length > 0)
    throw new HttpError(
      400,
      "invalid_request",
      `Unknown fields: ${unknownFields.join(", ")}.`,
    );
  const { max } = deps.config.workers;
  const count = workers ?? deps.config.workers.default;
  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > max
  )
    throw new HttpError(
      400,
      "invalid_workers",
      `Choose from 1 to ${max} workers.`,
    );
  const selection = {
    files: names(files, "files"),
    tags: names(tags, "tags"),
  };
  checkSelection(deps.inventory, selection);
  return { selection, workers: count, fredUrl: deps.config.fredUrl };
}

async function startRun({ deps, req, res, team }: TeamRequest): Promise<void> {
  const request = startRequest(await readJson(req), deps);
  if (deps.runner.current())
    throw new HttpError(
      409,
      "run_in_progress",
      "A run is in progress; start again when it has ended.",
    );
  sendJson(res, 201, deps.runner.start(team, request));
}

function readLog({ deps, res, url }: TeamRequest, run: Run): void {
  const raw = url.searchParams.get("offset") ?? "0";
  const offset = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(offset))
    throw new HttpError(
      400,
      "invalid_offset",
      "offset must be a whole number of bytes.",
    );
  // The state was read before the log, so an ended run comes with all of it.
  const progress = deps.store.progress(run.id);
  sendJson(res, 200, {
    ...deps.store.readLog(run.id, offset),
    state: run.state,
    ...(progress ? { progress } : {}),
  });
}

function cancelRun({ deps, res }: TeamRequest, run: Run): void {
  if (run.state !== "running")
    throw new HttpError(409, "run_ended", "The run has already ended.");
  try {
    deps.runner.cancel(run.id);
  } catch (error) {
    if (!(error instanceof RunEndedError)) throw error;
    throw new HttpError(409, "run_ended", "The run has already ended.");
  }
  sendJson(res, 202, { state: "running", cancelling: true });
}

function noReport(run: Run): HttpError | undefined {
  return run.hasReport
    ? undefined
    : new HttpError(404, "no_report", "The run has no report.");
}

function sendReport({ deps, res }: TeamRequest, run: Run): void {
  const refusal = noReport(run);
  if (refusal) throw refusal;
  sendFile(res, deps.store.reportIndex(run.id), {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
}

function sendArchive({ deps, res }: TeamRequest, run: Run): void {
  const refusal = noReport(run);
  if (refusal) throw refusal;
  sendFile(res, deps.store.reportArchive(run.id), {
    "content-type": "application/gzip",
    "content-disposition": `attachment; filename="fred-e2e-${run.id}.tar.gz"`,
    "cache-control": "no-store",
  });
}

const teamRoutes: readonly TeamRoute[] = [
  {
    method: "GET",
    path: "tests",
    handle: ({ deps, res }) =>
      sendJson(res, 200, {
        inventory: deps.inventory,
        fredUrl: deps.config.fredUrl,
        workers: deps.config.workers,
      }),
  },
  {
    method: "GET",
    path: "runs",
    handle: ({ deps, res, team }) =>
      sendJson(res, 200, {
        runs: deps.store
          // The kept finished runs, and the run in progress.
          .list(team, deps.config.keepRuns + 1)
          .map((run) => view(deps.store, run)),
        // Any team's run: there is one at a time for every team.
        running: deps.runner.current() !== undefined,
      }),
  },
  { method: "POST", path: "runs", handle: startRun },
];

const runRoutes: readonly RunRoute[] = [
  { method: "GET", path: "log", handle: readLog },
  { method: "POST", path: "cancel", handle: cancelRun },
  { method: "GET", path: "report", handle: sendReport },
  { method: "GET", path: "report.tar.gz", handle: sendArchive },
];

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch (error) {
    if (error instanceof URIError) throw notFound();
    throw error;
  }
}

async function handle(
  deps: ServiceDependencies,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://service");
  const method = req.method ?? "GET";
  if (method === "GET" && url.pathname === "/healthz")
    return sendText(res, "ok");
  const page = `/apps/${APP_ID}`;
  if (url.pathname === page || url.pathname.startsWith(`${page}/`)) {
    if (method !== "GET") throw notFound();
    return servePage(deps.uiDir, url.pathname.slice(page.length), res);
  }
  const match = /^\/teams\/([^/]+)\/(.+)$/.exec(url.pathname);
  if (!match?.[1] || !match[2]) throw notFound();
  const team = decodeSegment(match[1]);
  const refusal = await deps.admit(req.headers.authorization, team);
  if (refusal)
    throw new HttpError(refusal.status, refusal.code, refusal.message);

  const request: TeamRequest = { deps, req, res, url, team };
  const path = match[2];
  const teamRoute = teamRoutes.find(
    (route) => route.method === method && route.path === path,
  );
  if (teamRoute) return teamRoute.handle(request);
  const runPath = /^runs\/([^/]+)\/([^/]+)$/.exec(path);
  const runRoute = runRoutes.find(
    (route) => route.method === method && route.path === runPath?.[2],
  );
  if (!runPath?.[1] || !runRoute) throw notFound();
  const run = deps.store.get(runPath[1]);
  // Another team's run is answered as a missing one.
  if (run?.team !== team)
    throw new HttpError(404, "run_not_found", "The run could not be found.");
  runRoute.handle(request, run);
}

export function createHandler(
  deps: ServiceDependencies,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    handle(deps, req, res).catch((error: unknown) => {
      if (error instanceof HttpError && !res.headersSent)
        return sendError(res, error);
      console.error("The request could not be completed.");
      if (res.headersSent) return void res.destroy();
      sendError(
        res,
        new HttpError(500, "internal", "The service failed; see its log."),
      );
    });
  };
}
