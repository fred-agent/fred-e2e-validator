import {
  Button,
  DataTable,
  PageEmptyState,
  Spinner,
  StatusBadge,
  Tooltip,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@fred-oss/ui";
import type { RunProgress, RunState, RunView } from "./api.ts";
import { describeSelection, finished, shortTime } from "./format.ts";

const TONES: Readonly<Record<RunState, StatusBadgeTone>> = {
  running: "info",
  passed: "success",
  failed: "error",
  cancelled: "warning",
  interrupted: "warning",
};

/** A run's state; a running run shows a spinner and its finished tests out of the total. */
export function RunStateBadge({
  state,
  progress,
}: {
  state: RunState;
  progress: RunProgress | undefined;
}) {
  if (state !== "running")
    return <StatusBadge label={state} tone={TONES[state]} />;
  const counted =
    progress && progress.total > 0
      ? ` · ${finished(progress)} of ${progress.total}`
      : "";
  return (
    <span className="e2e-row">
      <Spinner size={14} decorative />
      <StatusBadge label={`running${counted}`} tone={TONES.running} />
    </span>
  );
}

export function RunsTable({
  runs,
  onOpen,
}: {
  runs: readonly RunView[];
  onOpen: (id: string) => void;
}) {
  if (runs.length === 0)
    return <PageEmptyState icon="history" message="No run yet." />;
  const columns: DataTableColumn<RunView>[] = [
    {
      label: "Started",
      size: "10rem",
      cellRenderer: (run) => (
        <Tooltip text={run.id}>
          <span>{shortTime(run.startedAt)}</span>
        </Tooltip>
      ),
    },
    {
      label: "Selection",
      size: "2fr",
      cellRenderer: (run) => describeSelection(run.selection),
    },
    {
      label: "Workers",
      size: "6rem",
      cellRenderer: (run) => String(run.workers),
    },
    {
      label: "State",
      size: "13rem",
      cellRenderer: (run) => (
        <RunStateBadge state={run.state} progress={run.progress} />
      ),
    },
    {
      label: "",
      size: "7rem",
      cellRenderer: (run) => (
        <Button
          type="button"
          color="primary"
          variant="text"
          size="small"
          onClick={() => onOpen(run.id)}
        >
          Details
        </Button>
      ),
    },
  ];
  return (
    <DataTable columns={columns} data={[...runs]} rowKey={(run) => run.id} />
  );
}
