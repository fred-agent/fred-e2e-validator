// Team administration: a platform admin creates the platform's teams in the
// technical console and chooses the teams every new user joins. A team's edit
// form and invitation links in the console are tested in
// the team settings tests. Source: Help Center, "Platform
// administration" and "Teams and permissions", which says that a team is
// created with the administrators the platform admin names; the default
// teams of new users and the uniqueness of a team's name come from the
// technical console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team administration", { tag: "@admin" }, () => {
  test.describe("The technical console opens on Teams for a platform admin", () => {
    test(
      "A platform admin who opens the console sees the Teams section",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step("admin opens the technical console from the main navigation", () =>
          admin.pages.adminConsole.open());
        await test.step('admin sees the console section "Teams" with the platform\'s existing teams', async () => {
          await admin.pages.adminConsole.expectSectionShown("Teams");
          await admin.pages.adminTeams.expectTeamsListed();
        });
      },
    );
  });

  test.describe("A platform admin sees team creation and the default teams of new users", () => {
    test(
      'A platform admin sees "Create team" and the default teams of new users',
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "Teams"', () =>
          admin.flows.openConsoleSection("Teams"));
        await test.step('admin sees "Create team"', () =>
          admin.pages.adminTeams.expectButtonVisible("Create team"));
        await test.step('admin sees the field "Add a team by name" of the default teams of new users', () =>
          admin.pages.adminTeams.expectDefaultTeamsField());
      },
    );
  });

  test.describe("A team name is unique", () => {
    test(
      "A second team with an existing name is refused",
      { tag: ["@team", "@preprod"] },
      async ({ admin, teams }) => {
        const team = await test.step("admin creates a team", () =>
          teams.create("name"));
        await test.step('admin opens the console section "Teams", fills "Create team" with the name of the team, is told that a team with this name already exists, cancels the form and sees one team of the name', async () => {
          await admin.flows.openConsoleSection("Teams");
          await admin.pages.adminTeams.expectExistingNameRefused(
            team.name,
            "A second team that an end-to-end test tries to create.",
            admin.account,
          );
        });
      },
    );
  });

  test.describe("New users join the default teams", () => {
    test.fixme(
      "A new user is a member of the default teams",
      { tag: "@team" },
      () => {
        // Planned: needs an account that has never signed in.
        // admin creates a team
        // admin adds the team to the default teams of new users in the console section "Teams"
        // visitor signs in with an account that has never signed in
        // visitor loads the home page and sees the team among their spaces
      },
    );
  });

  test.describe("A team is created with the administrators the platform admin names", () => {
    test(
      "A team created for another user is administered by that user",
      { tag: ["@team", "@preprod"] },
      async ({ teams, secondUser }) => {
        const team =
          await test.step("admin creates a team with secondUser as one of its admins", () =>
            teams.create("other admin", { admins: ["secondUser"] }));
        await test.step('secondUser opens the members of the team and sees that secondUser holds "Admin"', async () => {
          await secondUser.flows.openTeamMembers(team);
          await secondUser.pages.teamMembers.expectRole(
            secondUser.account,
            "Admin",
          );
        });
      },
    );
  });
});
