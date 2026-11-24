import type {
  FullConfig,
  Reporter,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import { isAccountVariable } from "../config/accounts.ts";
import { failureCause } from "./failure-summary.ts";
import { PAGE_AT_FAILURE } from "./run-log.ts";

function errorMessage(error: TestError): string {
  return (
    failureCause([error.message ?? error.value ?? ""], true) ??
    "The operation failed."
  );
}

function reportSteps(
  steps: readonly TestStep[],
  parent?: TestStep,
): TestStep[] {
  return steps.flatMap((step) => {
    if (step.category !== "test.step") return reportSteps(step.steps, parent);
    const item: TestStep = {
      category: step.category,
      title: step.title,
      startTime: step.startTime,
      duration: step.duration,
      titlePath: () => [...(parent?.titlePath() ?? []), step.title],
      annotations: [],
      attachments: [],
      steps: [],
      ...(step.subtitle && { subtitle: step.subtitle }),
      ...(step.location && { location: step.location }),
      ...(step.error && {
        error: { message: errorMessage(step.error) },
      }),
      ...(parent && { parent }),
    };
    item.steps = reportSteps(step.steps, item);
    return [item];
  });
}

function failureTimeline(steps: readonly TestStep[], start: number): object[] {
  return steps.map((step) => ({
    step: step.title,
    ...(step.subtitle && { group: step.subtitle }),
    offsetMs: step.startTime.getTime() - start,
    durationMs: Math.max(step.duration, 0),
    outcome: step.error
      ? "failed"
      : step.duration < 0
        ? "unfinished"
        : "passed",
    steps: failureTimeline(step.steps, start),
  }));
}

function privateAccountFields(): string[] {
  const fields = Object.entries(process.env).filter(([key]) =>
    isAccountVariable(key),
  );
  const usernames = new Set(
    fields
      .filter(([key]) => /_USERNAME(?:_\d+)?$/.test(key))
      .map(([, value]) => value?.trim()),
  );
  const hidden = new Set<string>();
  for (const [key, value] of fields) {
    hidden.add(key);
    const field = value?.trim();
    if (field && (/_PASSWORD(?:_\d+)?$/.test(key) || !usernames.has(field)))
      hidden.add(field);
  }
  return [...hidden].sort((a, b) => b.length - a.length);
}

/** Prepare the shared result before the terminal and HTML reporters consume it. */
export default class StepReport implements Reporter {
  private readonly hiddenFields = privateAccountFields();

  private redact(text: string): string {
    for (const field of this.hiddenFields) text = text.replaceAll(field, "…");
    return text;
  }

  onBegin(config: FullConfig): void {
    delete config.metadata.ci;
  }

  onStepBegin(_test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.category !== "test.step") return;
    step.title = this.redact(step.title);
    if (step.subtitle) step.subtitle = this.redact(step.subtitle);
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    const failedDuringTest =
      result.steps.some(
        (step) =>
          step.error &&
          !(
            step.category === "hook" &&
            ["After Hooks", "Worker Cleanup"].includes(step.title)
          ),
      ) || result.status === "timedOut";
    const cause = failureCause(
      result.errors.map((e) => e.message ?? e.value ?? ""),
      failedDuringTest,
    );
    result.steps = reportSteps(result.steps);
    result.errors = result.errors.map((error) => ({
      message: errorMessage(error),
    }));
    if (result.errors[0]) {
      if (cause) result.errors[0].message = cause;
      result.error = result.errors[0];
    }
    result.stdout = [];
    result.stderr = [];
    result.attachments = result.attachments.flatMap((item) =>
      item.name === PAGE_AT_FAILURE &&
      item.contentType === "text/plain" &&
      item.body &&
      !item.path
        ? [
            {
              name: PAGE_AT_FAILURE,
              contentType: "text/plain",
              body: Buffer.from(this.redact(item.body.toString("utf8"))),
            },
          ]
        : [],
    );
    if (["failed", "timedOut", "interrupted"].includes(result.status))
      result.attachments.push({
        name: "Failure timeline",
        contentType: "application/json",
        body: Buffer.from(
          JSON.stringify(
            {
              status: result.status,
              steps: failureTimeline(result.steps, result.startTime.getTime()),
            },
            null,
            2,
          ),
        ),
      });
  }

  onError(error: TestError): void {
    const message = errorMessage(error);
    for (const field of Object.keys(error))
      Reflect.deleteProperty(error, field);
    error.message = message;
  }
}
