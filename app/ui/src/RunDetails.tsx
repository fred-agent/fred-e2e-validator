import {
  Button,
  InlineDrawer,
  KpiStatCard,
  ProgressBar,
  useToast,
} from "@fred-oss/ui";
import { useCallback, useEffect, useState } from "react";
import type { RunProgress, RunState, RunView, Service } from "./api.ts";
import {
  describeSelection,
  finished,
  messageOf,
  plural,
  shortTime,
} from "./format.ts";
import { RunLog } from "./RunLog.tsx";
import { RunStateBadge } from "./RunsTable.tsx";

const POLL_MS = 2000;

/**
 * The run's log as it grows, read from the last offset 2 seconds after the
 * previous read settled while the run is in progress. A read the service
 * capped is followed at once, if it moved the offset. A failing read is
 * reported once, and again only after a read has succeeded; the next one
 * still comes while the run is in progress.
 */
function useLog(
  service: Service,
  run: RunView,
  onError: (error: unknown) => void,
): { text: string; progress: RunProgress | undefined } {
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<RunProgress>();
  const { id } = run;
  const [initialState] = useState(run.state);
  useEffect(() => {
    let stopped = false;
    let offset = 0;
    let state: RunState = initialState;
    let failing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      if (!stopped && state === "running")
        timer = setTimeout(() => void read(), POLL_MS);
    };
    const read = async (): Promise<void> => {
      try {
        const chunk = await service.log(id, offset);
        if (stopped) return;
        const moved = chunk.offset > offset;
        offset = chunk.offset;
        state = chunk.state;
        failing = false;
        setText((previous) => previous + chunk.text);
        if (chunk.progress) setProgress(chunk.progress);
        if (chunk.more && moved) return read();
      } catch (error) {
        if (stopped) return;
        if (!failing) onError(error);
        failing = true;
      }
      next();
    };
    void read();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [service, id, initialState, onError]);
  return { text, progress };
}

/**
 * Open the window during the click so the browser treats it as user-initiated.
 * The report inherits the page's origin and is disconnected from its opener.
 */
async function openReport(service: Service, id: string): Promise<void> {
  const target = window.open("", "_blank");
  if (!target) throw new Error("The browser blocked the report's window.");
  target.opener = null;
  try {
    const html = await service.report(id);
    target.document.open();
    target.document.write(html);
    target.document.close();
  } catch (error) {
    target.close();
    throw error;
  }
}

async function downloadReport(service: Service, id: string): Promise<void> {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(await service.archive(id));
  link.download = `fred-e2e-${id}.tar.gz`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

export function RunDetails({
  run,
  service,
  onClose,
}: {
  run: RunView;
  service: Service;
  onClose: () => void;
}) {
  // The notification callbacks remain stable across context updates.
  const { showError, showInfo } = useToast();
  const onError = useCallback(
    (error: unknown) =>
      showError({
        summary: "The run's log could not be read.",
        detail: messageOf(error),
      }),
    [showError],
  );
  const log = useLog(service, run, onError);
  const progress = log.progress ?? run.progress;
  const act = (summary: string, action: () => Promise<unknown>) => () =>
    void action().catch((error: unknown) =>
      showError({ summary, detail: messageOf(error) }),
    );

  const actions = (
    <div className="e2e-row">
      {run.state === "running" && (
        <Button
          type="button"
          color="error"
          variant="outlined"
          size="small"
          onClick={act("The run could not be cancelled.", async () => {
            await service.cancel(run.id);
            showInfo({
              summary: "Cancelling: the tests' teardown runs first.",
            });
          })}
        >
          Cancel
        </Button>
      )}
      {run.hasReport && (
        <>
          <Button
            type="button"
            color="primary"
            variant="outlined"
            size="small"
            icon={{ type: "open_in_new" }}
            onClick={act("The report could not be opened.", () =>
              openReport(service, run.id),
            )}
          >
            Open report
          </Button>
          <Button
            type="button"
            color="primary"
            variant="filled"
            size="small"
            icon={{ type: "download" }}
            onClick={act("The report could not be downloaded.", () =>
              downloadReport(service, run.id),
            )}
          >
            Download report
          </Button>
        </>
      )}
    </div>
  );

  return (
    <InlineDrawer
      open
      title={`Run of ${shortTime(run.startedAt)}`}
      closeLabel="Close"
      width="min(60rem, 100vw)"
      headerActions={actions}
      onClose={onClose}
    >
      <div className="e2e-stack">
        <RunStateBadge state={run.state} progress={progress} />
        <p className="e2e-muted">
          {describeSelection(run.selection)} · {plural(run.workers, "worker")} ·{" "}
          {run.fredUrl}
        </p>
        {progress && (
          <>
            <ProgressBar
              theme="primary"
              current={finished(progress)}
              max={Math.max(progress.total, 1)}
              aria-label="Tests finished"
            />
            <div className="e2e-counts">
              <KpiStatCard
                label="Passed"
                value={progress.passed}
                tone="success"
                isLoading={false}
                isError={false}
              />
              <KpiStatCard
                label="Failed"
                value={progress.failed}
                tone="error"
                isLoading={false}
                isError={false}
              />
              <KpiStatCard
                label="Skipped"
                value={progress.skipped}
                tone="neutral"
                isLoading={false}
                isError={false}
              />
            </div>
          </>
        )}
        <RunLog text={log.text} />
      </div>
    </InlineDrawer>
  );
}
