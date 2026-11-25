// Team wiki agent rules: a team for which the capability "Team wiki" is
// enabled has a wiki, the pages its members write and the "Agent rules" page
// every agent with wiki access reads; a new team's wiki starts empty, and
// its agent rules page keeps a version history. What an agent does with the
// wiki shows only in a conversation. Source: Help Center,
// "Capabilities" ("Access to the team wiki"); the agent rules page and its
// version history come from the wiki.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team wiki agent rules", { tag: "@team" }, () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team =
      await test.step('admin creates a team with "Team wiki" enabled for it', () =>
        teams.create("wiki", {
          capabilities: [{ capability: "Team wiki", access: "Enable" }],
        }));
  });

  test.describe("A new team's wiki starts empty", () => {
    test.fixme("An admin sees the empty wiki of a new team", () => {
      // Planned: the wiki shows the same empty state when its page list fails to load.
      // admin opens the wiki of the team
      // admin sees that the wiki is empty and lists no page
    });
  });

  test.describe("The agent rules page keeps a version history", () => {
    test("An admin sees the version history of the agent rules of a new team", async ({
      admin,
    }) => {
      await test.step('admin opens the wiki of the team and its page "Agent rules"', async () => {
        await admin.flows.openWiki(team);
        await admin.pages.wiki.openRules();
      });
      await test.step('admin opens "Version history" of the agent rules, sees "No earlier versions." and closes it', () =>
        admin.pages.wiki.expectEmptyHistory());
    });

    test("An edit of the agent rules is listed as an earlier version", async ({
      admin,
    }) => {
      await test.step("admin opens the members of the team and grants admin the Editor role", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.grant(admin.account, "Editor");
      });
      await test.step('admin opens the wiki of the team and its page "Agent rules" and writes the rules, then edits them', async () => {
        await admin.flows.openWiki(team);
        await admin.pages.wiki.openRules();
        await admin.pages.wiki.writeText("Answer in English.");
        await admin.pages.wiki.writeText("Answer in English or in French.");
      });
      await test.step('admin opens "Version history" of the agent rules, sees one earlier version and closes it', () =>
        admin.pages.wiki.expectOneEarlierVersion());
    });
  });

  test.describe('Enabling "Team wiki" for a team gives its members a wiki', () => {
    test.fixme(
      'A team for which "Team wiki" is disabled shows its members no wiki',
      { tag: "@extended" },
      () => {
        // Planned: the team's space gives no sign that the application has answered whether the team has a wiki.
        // admin adds secondUser to the team
        // admin disables "Team wiki" for the team in the console section "Features"
        // secondUser opens the team's space and does not see its wiki
      },
    );
  });
});
