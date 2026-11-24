// Team settings: a team admin governs a team from its settings, and a platform
// admin from the technical console. Source: Help Center, "Teams and
// permissions" and "Platform administration"; the Activity section, the
// retention cap, the console's edit form and the console's invitation links
// of a team come from the team settings and technical console. The
// console's invitation links differ from the invite link of the team's
// settings.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team settings", () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team = await test.step("admin creates a team", () =>
      teams.create("settings"));
  });

  test.describe("A team admin reaches every section of the team's settings", () => {
    for (const section of [
      "Members",
      "Settings",
      "Activity",
      "Analytics",
      "Models",
    ] as const) {
      test(`A team admin sees the settings section "${section}"`, async ({
        admin,
      }) => {
        await test.step(`admin opens the settings section "${section}" of the team`, () =>
          admin.flows.openTeamSettings(team, section));
        await test.step(`admin sees the settings section "${section}"`, () =>
          admin.pages.teamSettings.expectSectionShown(section));
      });
    }
  });

  test.describe("A team admin sees the tools to manage members", () => {
    test("A team admin sees a search of the team's members", async ({
      admin,
    }) => {
      await test.step("admin opens the members of the team", () =>
        admin.flows.openTeamMembers(team));
      await test.step('admin sees the search "Search for a member"', () =>
        admin.pages.teamMembers.expectSearch());
    });

    test("A team admin sees invitation by link", async ({ admin }) => {
      await test.step("admin opens the members of the team", () =>
        admin.flows.openTeamMembers(team));
      await test.step('admin opens "Invite link", sees "Enable invitation by link" and closes the dialog unchanged', () =>
        admin.pages.teamMembers.expectInviteLinkDialog());
    });
  });

  test.describe("The team's settings show the team's own name", () => {
    test("A team admin sees the team's name in its settings", async ({
      admin,
    }) => {
      await test.step('admin opens the settings section "Settings" of the team', () =>
        admin.flows.openTeamSettings(team, "Settings"));
      await test.step('admin sees the team\'s name in "Team name"', () =>
        admin.pages.teamParameters.expectName(team.name));
    });
  });

  test.describe("A team admin sees the team's analytics by topic", () => {
    for (const topic of ["Overview", "My usage"] as const) {
      test(`A team admin sees the analytics topic "${topic}"`, async ({
        admin,
      }) => {
        await test.step('admin opens the settings section "Analytics" of the team', () =>
          admin.flows.openTeamSettings(team, "Analytics"));
        await test.step(`admin chooses the analytics topic "${topic}"`, () =>
          admin.pages.analytics.chooseTopic(topic));
        await test.step(`admin sees the topic "${topic}" selected and its panel shown`, () =>
          admin.pages.analytics.expectTopic(topic));
      });
    }
  });

  test.describe("A platform admin manages a team from the console", () => {
    test("A platform admin sees a team's name in its edit form", async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Teams"', () =>
        admin.flows.openConsoleSection("Teams"));
      await test.step("admin opens the edit form of the team, sees its name and closes the form unsaved", () =>
        admin.pages.adminTeams.expectEditForm(team.name));
    });

    test("A platform admin sees the invite links of a team", async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Teams"', () =>
        admin.flows.openConsoleSection("Teams"));
      await test.step('admin opens "Manage links" of the team, sees "Create link" and closes the invitations unchanged', () =>
        admin.pages.adminTeams.expectInvitations(team.name));
    });
  });

  test.describe("A platform admin edits a team from the console", () => {
    test.fixme("A team renamed in the console is listed under its new name", () => {
      // Planned: renaming the team saves its edit form in the technical console.
      // admin opens the console section "Teams"
      // admin renames the team in its edit form
      // admin sees the team listed under its new name in the console
    });
  });

  test.describe("The console's invitation links let people join the team", () => {
    test.fixme("A user who follows one of the console's invitation links joins the team", () => {
      // Planned: changes who may use the platform.
      // admin creates an invitation link of the team in the console section "Teams"
      // secondUser follows the invitation link
      // secondUser loads the home page and sees the team among their spaces
    });
  });

  test.describe("A revoked invitation link of the console no longer lets people join the team", () => {
    test.fixme("A user who follows a revoked invitation link does not join the team", () => {
      // Planned: changes who may use the platform.
      // admin creates an invitation link of the team in the console section "Teams"
      // admin revokes the invitation link
      // secondUser follows the invitation link
      // secondUser loads the home page and does not see the team among their spaces
    });
  });

  test.describe("Turning a team's link access off suspends the console's invitation links", () => {
    test.fixme("An invitation link of a team without link access no longer works", () => {
      // Planned: changes who may use the platform.
      // admin creates an invitation link of the team in the console section "Teams"
      // admin turns the link access of the team off
      // secondUser follows the invitation link
      // secondUser loads the home page and does not see the team among their spaces
    });
  });

  test.describe("A new team publishes agents by the platform default", () => {
    test('The marketplace settings show "Default" for a new team', async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Marketplaces"', () =>
        admin.flows.openConsoleSection("Marketplaces"));
      await test.step('admin sees the publishing choice "Default" checked for the team', () =>
        admin.pages.marketplaceSettings.expectTeamPublishing(
          team.name,
          "Default",
        ));
    });
  });

  test.describe("A team's description follows length rules", () => {
    test.fixme("A description that is too long is refused", () => {
      // admin opens the settings section "Settings" of the team
      // admin writes a description of 501 characters
      // admin sees that the description holds at most 500 characters
    });
  });

  test.describe("A team's retention stays under the platform cap", () => {
    test.fixme("A value above the cap is refused", () => {
      // admin opens the settings section "Settings" of the team
      // admin sets a deletion grace period above the platform cap
      // admin sees that the period exceeds the platform cap
    });
  });

  test.describe("A team keeps its default model", () => {
    test.fixme("The default model cannot be turned off", () => {
      // admin opens the settings section "Models" of the team
      // admin sees no way to turn off the default model
    });
  });
});
