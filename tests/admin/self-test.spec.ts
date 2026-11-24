// Self-test: a platform admin checks each area of the deployment, as
// themselves, on the real services. Source: Help Center, "Platform
// administration"; the areas, "Run all" and a run's result per area come from
// the technical console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Self-test", () => {
  test.describe("A platform admin sees the self-test by area", () => {
    test('A platform admin sees "Run all" and the areas Platform, Identity and session, Documents and knowledge, Agents, Security and Authorization', async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Self-test"', () =>
        admin.flows.openConsoleSection("Self-test"));
      await test.step('admin sees "Run all"', () =>
        admin.pages.selfTest.expectButtonVisible("Run all"));
      for (const area of [
        "Platform",
        "Identity and session",
        "Documents and knowledge",
        "Agents",
        "Security",
        "Authorization",
      ] as const)
        await test.step(`admin sees the self-test area "${area}"`, () =>
          admin.pages.selfTest.expectArea(area));
    });
  });

  test.describe("A self-test run reports a result per area", () => {
    test.fixme("A finished run shows a result for each area", () => {
      // Planned: runs the self-test.
      // admin opens the console section "Self-test"
      // admin runs every area with "Run all"
      // admin sees a result for each area once the run has finished
    });
  });
});
