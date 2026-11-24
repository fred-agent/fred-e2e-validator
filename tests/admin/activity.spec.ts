// Platform activity: a platform admin follows the platform's background
// tasks, such as imports and document processing: scheduled, in progress and
// completed, and dismisses the tasks that failed or were cancelled. Source:
// Help Center, "Platform administration"; the groups of tasks and the
// dismissal of a task that failed or was cancelled come from the technical
// console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform activity", () => {
  test.describe("A platform admin sees the platform's background tasks", () => {
    test.fixme("A platform admin sees the background tasks", () => {
      // Planned: these UI tests cannot independently read the stored records for comparison.
      // admin opens the console section "Activity"
      // admin sees the group of each state the platform's tasks are in, or "No scheduled or running tasks."
    });
  });

  test.describe("A platform admin dismisses a task that failed or was cancelled", () => {
    test.fixme("A dismissed task no longer asks for attention", () => {
      // Planned: changes the task list every platform admin sees.
      // admin opens the console section "Activity"
      // admin dismisses a task that failed
      // admin sees the task without "Dismiss"
    });
  });
});
