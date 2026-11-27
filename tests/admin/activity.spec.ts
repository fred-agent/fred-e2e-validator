// Platform activity: a platform admin follows the platform's background
// tasks, such as imports and document processing: scheduled, in progress and
// completed, and dismisses the tasks that failed or were cancelled. Source:
// Help Center, "Platform administration"; the groups of tasks and the
// dismissal of a task that failed or was cancelled come from the technical
// console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform activity", { tag: "@admin" }, () => {
  test.describe("A platform admin sees the platform's background tasks", () => {
    test(
      "A platform admin sees the background tasks",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "Activity"', () =>
          admin.flows.openConsoleSection("Activity"));
        await test.step('admin sees a group of the platform\'s tasks by state, or "No tasks in progress"', () =>
          admin.pages.activity.expectTaskGroups());
      },
    );
  });

  test.describe("A platform admin dismisses a task that failed or was cancelled", () => {
    test.fixme("A dismissed task no longer asks for attention", () => {
      // Planned: a dismissed task cannot be put back.
      // admin opens the console section "Activity"
      // admin dismisses a task that failed
      // admin sees the task without "Dismiss"
    });
  });
});
