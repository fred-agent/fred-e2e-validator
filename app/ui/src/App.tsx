// The run page: what to run, the workers, Start, the team's runs and a run's
// details.
import type { FredApplicationClient } from "@fred-oss/iframe-sdk";
import {
  Button,
  PageHeader,
  Select,
  ServiceNotice,
  Spinner,
  useToast,
} from "@fred-oss/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  serviceOf,
  type RunsAnswer,
  type StartRequest,
  type TestsAnswer,
} from "./api.ts";
import { messageOf, plural } from "./format.ts";
import { RunDetails } from "./RunDetails.tsx";
import {
  NO_CHOICE,
  RunSelection,
  selectionOf,
  testCount,
  type Choice,
} from "./RunSelection.tsx";
import { RunsTable } from "./RunsTable.tsx";

// Poll less often while idle so runs started by another team still appear.
const RUNNING_POLL_MS = 2000;
const IDLE_POLL_MS = 10_000;

function startRequest(choice: Choice, workers: number): StartRequest {
  const { files, tags } = selectionOf(choice);
  if (files.length > 0) return { files, workers };
  if (tags.length > 0) return { tags, workers };
  return { workers };
}

export function App({ fred }: { fred: FredApplicationClient }) {
  const service = useMemo(() => serviceOf(fred), [fred]);
  const { showError } = useToast();
  const [answer, setAnswer] = useState<TestsAnswer>();
  const [runs, setRuns] = useState<RunsAnswer>();
  /** The tests and the first list of runs could not be read: nothing to show. */
  const [failure, setFailure] = useState<string>();
  const [choice, setChoice] = useState<Choice>(NO_CHOICE);
  const [workers, setWorkers] = useState<number>();
  const [openId, setOpenId] = useState<string>();
  const [starting, setStarting] = useState(false);
  /** Reads the runs now, after any read in flight; set once the first read succeeded. */
  const readRunsNow = useRef<() => void>(undefined);

  // One read at a time: the next is scheduled once the previous has settled,
  // so answers never overlap or land out of order. A failing read shows one
  // toast, and another only after a read has succeeded.
  useEffect(() => {
    let stopped = false;
    let running = false;
    let busy = false;
    let again = false;
    let failing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      timer = setTimeout(
        () => void read(),
        running ? RUNNING_POLL_MS : IDLE_POLL_MS,
      );
    };
    const read = async (): Promise<void> => {
      if (busy) {
        again = true;
        return;
      }
      busy = true;
      clearTimeout(timer);
      try {
        const list = await service.runs();
        if (stopped) return;
        setRuns(list);
        running = list.running;
        failing = false;
      } catch (error) {
        if (stopped) return;
        if (!failing)
          showError({
            summary: "The runs could not be read.",
            detail: messageOf(error),
          });
        failing = true;
      } finally {
        busy = false;
      }
      if (again) {
        again = false;
        return read();
      }
      schedule();
    };
    Promise.all([service.tests(), service.runs()]).then(
      ([tests, list]) => {
        if (stopped) return;
        setAnswer(tests);
        setRuns(list);
        running = list.running;
        readRunsNow.current = () => void read();
        schedule();
      },
      (error: unknown) => {
        if (!stopped) setFailure(messageOf(error));
      },
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
      readRunsNow.current = undefined;
    };
  }, [service, showError]);

  if (failure)
    return (
      <ServiceNotice
        icon="cloud_off"
        title="The tests could not be read through Fred."
        description={`${failure} Reload the page to try again.`}
        centered
      />
    );
  if (!answer || !runs) return <Spinner statusText="Loading the tests" />;

  const tests = testCount(answer.inventory, choice);
  const count = workers ?? answer.workers.default;
  const open = runs.runs.find((run) => run.id === openId);
  const start = async () => {
    setStarting(true);
    try {
      const run = await service.start(startRequest(choice, count));
      setOpenId(run.id);
      readRunsNow.current?.();
    } catch (error) {
      showError({
        summary: "The run did not start.",
        detail: messageOf(error),
      });
      // A refusal such as 409 means the list is out of date.
      readRunsNow.current?.();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="e2e-page">
      <PageHeader
        title="End-to-end tests"
        subtitle={`The tests open ${answer.fredUrl}.`}
        actions={
          <div className="e2e-row">
            <Select
              ariaLabel="Workers"
              size="small"
              compact
              value={count}
              onChange={setWorkers}
              options={Array.from(
                { length: answer.workers.max },
                (_, index) => ({
                  key: String(index + 1),
                  value: index + 1,
                  label: plural(index + 1, "worker"),
                }),
              )}
            />
            <Button
              type="button"
              color="primary"
              variant="filled"
              size="medium"
              icon={{ type: "rocket_launch" }}
              disabled={tests === 0 || runs.running || starting}
              onClick={() => void start()}
            >
              Start
            </Button>
          </div>
        }
      />
      {runs.running && (
        <ServiceNotice
          icon="schedule"
          color="info"
          title="A run is in progress."
          description="Start is available again when it has ended."
        />
      )}
      <RunSelection
        inventory={answer.inventory}
        choice={choice}
        onChange={setChoice}
      />
      <h2 className="e2e-heading">Runs</h2>
      <RunsTable runs={runs.runs} onOpen={setOpenId} />
      {open && (
        <RunDetails
          key={open.id}
          run={open}
          service={service}
          onClose={() => setOpenId(undefined)}
        />
      )}
    </div>
  );
}
