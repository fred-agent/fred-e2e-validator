// Platform analytics: a platform admin reads how the platform is used, by
// topic, and downloads the figures. Source: Help Center, "Platform
// administration", which also says that the platform's usage needs the
// Platform observer role, that a team's analytics are its admins', and that
// an export holds the period and scope chosen.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform analytics", () => {
  test.describe("A platform admin sees the platform's analytics by topic", () => {
    for (const topic of ["Overview", "Adoption", "Technical"] as const) {
      test(`A platform admin sees the analytics topic "${topic}"`, async ({
        admin,
      }) => {
        await test.step('admin opens the console section "Analytics"', () =>
          admin.flows.openConsoleSection("Analytics"));
        await test.step(`admin chooses the analytics topic "${topic}"`, () =>
          admin.pages.analytics.chooseTopic(topic));
        await test.step(`admin sees the topic "${topic}" selected and its panel shown`, () =>
          admin.pages.analytics.expectTopic(topic));
      });
    }
  });

  test.describe("A platform admin sees an export of the analytics", () => {
    test('A platform admin sees "Export" on the analytics page', async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Analytics"', () =>
        admin.flows.openConsoleSection("Analytics"));
      await test.step('admin sees "Export"', () =>
        admin.pages.analytics.expectButtonVisible("Export"));
    });
  });

  test.describe("The analytics a user sees depend on their role", () => {
    test.fixme("A team admin does not see the platform's analytics", () => {
      // admin creates a team with secondUser as a member
      // admin opens the members of the team and gives secondUser the role "Admin"
      // secondUser loads the home page and does not see the platform's analytics
    });
  });

  test.describe("An export holds the analytics of the chosen period and scope", () => {
    test.fixme("An export of the last 7 days covers those days", () => {
      // Planned: exports the platform's analytics from the technical console.
      // admin opens the console section "Analytics" and chooses the period "Last 7 days"
      // admin exports the analytics with "Export"
      // admin receives a workbook of the analytics of the last 7 days
    });
  });
});
