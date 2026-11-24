// Team space pages: a team space gives its editors the team's prompts and
// its applications. Source: Help Center, "Prompts" and "Teams and
// permissions".
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team space pages", () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team =
      await test.step("admin creates a team in which admin also holds the Editor role", () =>
        teams.create("pages", { roles: { admin: ["Editor"] } }));
  });

  test.describe("An editor creates prompts in a team space", () => {
    test('An editor sees "Create prompt" in the team\'s prompts', async ({
      admin,
    }) => {
      await test.step("admin opens the prompts of the team and reloads them", async () => {
        await admin.flows.openSpaceSection(team, "Prompts");
        await admin.pages.prompts.reloadAndExpectPromptList();
      });
      await test.step('admin sees "Create prompt"', () =>
        admin.pages.prompts.expectButtonVisible("Create prompt"));
    });

    test("An editor opens the team's category manager", async ({ admin }) => {
      await test.step("admin opens the prompts of the team", () =>
        admin.flows.openSpaceSection(team, "Prompts"));
      await test.step('admin opens "Manage categories", sees the category manager and closes it unsaved', () =>
        admin.pages.prompts.openExpectAndCloseCategoriesDialog());
    });
  });

  test.describe("A team space has an Apps page", () => {
    test("An editor sees the Apps page of the team space", async ({
      admin,
    }) => {
      await test.step('admin opens "Apps" of the team', () =>
        admin.flows.openSpaceSection(team, "Apps"));
      await test.step("admin sees the Apps page", () =>
        admin.pages.apps.expectShown());
    });
  });
});
