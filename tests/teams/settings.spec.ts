// Team settings: a team admin governs a team from its settings, and a platform
// admin from the technical console. Source: Help Center, "Teams and
// permissions" and "Platform administration"; the Activity section, the
// retention cap, the console's edit form and the console's invitation links
// of a team come from the team settings and technical console. The
// console's invitation links differ from the invite link of the team's
// settings.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team settings", { tag: "@team" }, () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team = await test.step("admin creates a team", () =>
      teams.create("settings"));
  });

  test.describe("A team admin reaches every section of the team's settings", () => {
    for (const [section, tags] of [
      ["Members", ["@preprod"]],
      ["Settings", ["@preprod"]],
      ["Activity", ["@preprod"]],
      ["Analytics", ["@preprod", "@kpi-store"]],
      ["Models", ["@model", "@preprod"]],
    ] as const) {
      test(
        `A team admin sees the settings section "${section}"`,
        { tag: [...tags] },
        async ({ admin }) => {
          await test.step(`admin opens the settings section "${section}" of the team`, () =>
            admin.flows.openTeamSettings(team, section));
          await test.step(`admin sees the settings section "${section}"`, () =>
            admin.pages.teamSettings.expectSectionShown(section));
        },
      );
    }
  });

  test.describe("A team admin sees the tools to manage members", () => {
    test(
      "A team admin sees a search of the team's members",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step("admin opens the members of the team", () =>
          admin.flows.openTeamMembers(team));
        await test.step('admin sees the search "Search for a member"', () =>
          admin.pages.teamMembers.expectSearch());
      },
    );

    test(
      "A team admin sees invitation by link",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step("admin opens the members of the team", () =>
          admin.flows.openTeamMembers(team));
        await test.step('admin opens "Invite link", sees "Enable invitation by link" and closes the dialog unchanged', () =>
          admin.pages.teamMembers.expectInviteLinkDialog());
      },
    );
  });

  test.describe("The team's settings show the team's own name", () => {
    test(
      "A team admin sees the team's name in its settings",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the settings section "Settings" of the team', () =>
          admin.flows.openTeamSettings(team, "Settings"));
        await test.step('admin sees the team\'s name in "Team name"', () =>
          admin.pages.teamParameters.expectName(team.name));
      },
    );
  });

  test.describe("A team admin sees the team's analytics by topic", () => {
    for (const [topic, tags] of [
      ["Overview", ["@preprod", "@kpi-store"]],
      ["My usage", ["@preprod", "@kpi-store"]],
    ] as const) {
      test(
        `A team admin sees the analytics topic "${topic}"`,
        { tag: [...tags] },
        async ({ admin }) => {
          await test.step('admin opens the settings section "Analytics" of the team', () =>
            admin.flows.openTeamSettings(team, "Analytics"));
          await test.step(`admin chooses the analytics topic "${topic}"`, () =>
            admin.pages.analytics.chooseTopic(topic));
          await test.step(`admin sees the topic "${topic}" selected and its panel shown`, () =>
            admin.pages.analytics.expectTopic(topic));
        },
      );
    }
  });

  test.describe("A platform admin manages a team from the console", () => {
    test(
      "A platform admin sees a team's name in its edit form",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "Teams"', () =>
          admin.flows.openConsoleSection("Teams"));
        await test.step("admin opens the edit form of the team, sees its name and closes the form unsaved", () =>
          admin.pages.adminTeams.expectEditForm(team.name));
      },
    );

    test(
      "A platform admin sees the invite links of a team",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "Teams"', () =>
          admin.flows.openConsoleSection("Teams"));
        await test.step('admin opens "Manage links" of the team, sees "Create link" and closes the invitations unchanged', () =>
          admin.pages.adminTeams.expectInvitations(team.name));
      },
    );
  });

  test.describe("A platform admin edits a team from the console", () => {
    test(
      "A team renamed in the console is listed under its new name",
      { tag: "@preprod" },
      async ({ admin, teams }) => {
        const renamed =
          await test.step('admin opens the console section "Teams" and renames the team in its edit form', () =>
            teams.rename(team, "settings renamed"));
        await test.step('admin opens the console section "Teams" again and sees the team under its new name and not under the old one', async () => {
          await admin.flows.openConsoleSection("Teams");
          await admin.pages.adminTeams.expectListedInstead(
            renamed.name,
            team.name,
          );
        });
      },
    );
  });

  test.describe("The console's invitation links let people join the team", () => {
    test(
      "A user who follows one of the console's invitation links joins the team",
      { tag: ["@preprod", "@multi-user"] },
      async ({ admin, secondUser }) => {
        const link =
          await test.step('admin opens the console section "Teams", turns on the link access of the team and creates an invitation link of the team', async () => {
            await admin.flows.openConsoleSection("Teams");
            await admin.pages.adminTeams.setLinkAccess(team.name, true);
            return admin.pages.adminTeams.createInvitationLink(team.name);
          });
        await test.step("secondUser follows the invitation link and joins the team", () =>
          secondUser.pages.join.followAndJoin(link));
        await test.step("secondUser loads the home page and sees the team among their spaces", async () => {
          await secondUser.pages.home.openWithSpaces();
          await secondUser.pages.home.expectSpace(team.name);
        });
      },
    );
  });

  test.describe("A revoked invitation link of the console no longer lets people join the team", () => {
    test(
      "A user who follows a revoked invitation link does not join the team",
      { tag: ["@preprod", "@multi-user"] },
      async ({ admin, secondUser }) => {
        const link =
          await test.step('admin opens the console section "Teams", turns on the link access of the team and creates an invitation link of the team', async () => {
            await admin.flows.openConsoleSection("Teams");
            await admin.pages.adminTeams.setLinkAccess(team.name, true);
            return admin.pages.adminTeams.createInvitationLink(team.name);
          });
        await test.step("admin revokes the invitation link", () =>
          admin.pages.adminTeams.revokeInvitationLink(team.name));
        await test.step("secondUser follows the invitation link and is told that it is no longer valid", () =>
          secondUser.pages.join.followAndExpectInvalid(link));
        await test.step("secondUser loads the home page and does not see the team among their spaces", () =>
          secondUser.pages.home.openAndExpectNoSpace(team.name));
      },
    );
  });

  test.describe("Turning a team's link access off suspends the console's invitation links", () => {
    test(
      "An invitation link of a team without link access no longer works",
      { tag: ["@preprod", "@multi-user"] },
      async ({ admin, secondUser }) => {
        const link =
          await test.step('admin opens the console section "Teams", turns on the link access of the team and creates an invitation link of the team', async () => {
            await admin.flows.openConsoleSection("Teams");
            await admin.pages.adminTeams.setLinkAccess(team.name, true);
            return admin.pages.adminTeams.createInvitationLink(team.name);
          });
        await test.step("admin turns the link access of the team off", () =>
          admin.pages.adminTeams.setLinkAccess(team.name, false));
        await test.step("secondUser follows the invitation link and is told that it is no longer valid", () =>
          secondUser.pages.join.followAndExpectInvalid(link));
        await test.step("secondUser loads the home page and does not see the team among their spaces", () =>
          secondUser.pages.home.openAndExpectNoSpace(team.name));
      },
    );
  });

  test.describe(
    "A new team publishes agents by the platform default",
    { tag: "@marketplace" },
    () => {
      test(
        'The marketplace settings show "Default" for a new team',
        { tag: "@preprod" },
        async ({ admin }) => {
          await test.step('admin opens the console section "Marketplaces"', () =>
            admin.flows.openConsoleSection("Marketplaces"));
          await test.step('admin sees the publishing choice "Default" checked for the team', () =>
            admin.pages.marketplaceSettings.expectTeamPublishing(
              team.name,
              "Default",
            ));
        },
      );
    },
  );

  test.describe("A team's description follows length rules", () => {
    test(
      "A description that is too long is refused",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the settings section "Settings" of the team', () =>
          admin.flows.openTeamSettings(team, "Settings"));
        await test.step("admin writes a description of 501 characters", () =>
          admin.pages.teamParameters.writeTooLongDescription());
        await test.step("admin sees that the description holds at most 500 characters", () =>
          admin.pages.teamParameters.expectDescriptionCut());
      },
    );
  });

  test.describe("A team's description is saved apart from its name", () => {
    test(
      "Saving the description keeps a name typed but not yet saved",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the settings section "Settings" of the team', () =>
          admin.flows.openTeamSettings(team, "Settings"));
        await test.step('admin types a different name in "Team name" without renaming the team', () =>
          admin.pages.teamParameters.typeDraftName());
        await test.step('admin writes a new description with spaces around it in "Team description" and leaves the field', () =>
          admin.pages.teamParameters.writePaddedDescriptionAndLeave());
        await test.step('admin sees "Team description updated" and the new description without its surrounding spaces', () =>
          admin.pages.teamParameters.expectDescriptionUpdated());
        await test.step('admin still sees the different name in "Team name"', () =>
          admin.pages.teamParameters.expectDraftName());
        await test.step('admin opens the settings section "Settings" of the team again', () =>
          admin.flows.openTeamSettings(team, "Settings"));
        await test.step('admin sees the team\'s name in "Team name"', () =>
          admin.pages.teamParameters.expectName(team.name));
        await test.step('admin sees the new description in "Team description"', () =>
          admin.pages.teamParameters.expectNewDescription());
      },
    );
  });

  test.describe("A team's retention stays under the platform cap", () => {
    test(
      "A value above the cap is refused",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the settings section "Settings" of the team', () =>
          admin.flows.openTeamSettings(team, "Settings"));
        await test.step("admin sets a deletion grace period above the platform cap and leaves the field", () =>
          admin.pages.teamParameters.setGracePeriodAboveCap());
        await test.step("admin sees that the period exceeds the platform cap", () =>
          admin.pages.teamParameters.expectGracePeriodRefused());
      },
    );
  });

  test.describe("A team keeps its default model", { tag: "@model" }, () => {
    test(
      "The default model cannot be turned off",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the settings section "Models" of the team', () =>
          admin.flows.openTeamSettings(team, "Models"));
        await test.step("admin sees the default model on and its switch disabled", () =>
          admin.pages.teamModels.expectDefaultModelFixed());
      },
    );
  });
});
