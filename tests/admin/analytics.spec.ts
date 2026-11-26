// Platform analytics: a platform admin reads how the platform is used, by
// topic, and downloads the figures. Source: Help Center, "Platform
// administration", which also says that the platform's usage needs the
// Platform observer role, that a team's analytics are its admins', and that
// an export holds the period and scope chosen.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform analytics", { tag: "@admin" }, () => {
  test.describe("A platform admin sees the platform's analytics by topic", () => {
    for (const [topic, tags] of [
      ["Overview", ["@preprod"]],
      ["Adoption", ["@preprod"]],
      ["Technical", ["@preprod"]],
    ] as const) {
      test(
        `A platform admin sees the analytics topic "${topic}"`,
        { tag: [...tags] },
        async ({ admin }) => {
          await test.step('admin opens the console section "Analytics"', () =>
            admin.flows.openConsoleSection("Analytics"));
          await test.step(`admin chooses the analytics topic "${topic}"`, () =>
            admin.pages.analytics.chooseTopic(topic));
          await test.step(`admin sees the topic "${topic}" selected and its panel shown`, () =>
            admin.pages.analytics.expectTopic(topic));
        },
      );
    }
  });

  test.describe("A platform admin sees an export of the analytics", () => {
    test(
      'A platform admin sees "Export" on the analytics page',
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "Analytics"', () =>
          admin.flows.openConsoleSection("Analytics"));
        await test.step('admin sees "Export"', () =>
          admin.pages.analytics.expectButtonVisible("Export"));
      },
    );
  });

  test.describe("The analytics a user sees depend on their role", () => {
    test(
      "A team admin does not see the platform's analytics",
      { tag: ["@team", "@preprod"] },
      async ({ teams, secondUser }) => {
        await test.step('admin creates a team with secondUser as a member with the role "Admin"', () =>
          teams.create("analytics", {
            members: ["secondUser"],
            roles: { secondUser: ["Admin"] },
          }));
        await test.step('secondUser loads the home page and does not see "Technical console", where the platform\'s analytics are', async () => {
          await secondUser.pages.home.openWithSpaces();
          await secondUser.pages.navigation.expectEntryAbsent(
            "Technical console",
          );
        });
      },
    );
  });

  test.describe("An export holds the analytics of the chosen period and scope", () => {
    test(
      "An export of the last 7 days is a workbook",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "Analytics" and chooses the period "Last 7 days"', async () => {
          await admin.flows.openConsoleSection("Analytics");
          await admin.pages.analytics.choosePeriod("Last 7 days");
        });
        const download =
          await test.step('admin exports the analytics with "Export"', () =>
            admin.pages.analytics.exportWorkbook());
        await test.step("admin receives a workbook of the analytics", () =>
          admin.pages.analytics.expectWorkbook(download));
      },
    );
  });
});
