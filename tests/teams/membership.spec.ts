// Team membership: a team admin decides who belongs to a team and which roles
// members hold. Source: Help Center, "Teams and permissions"; the rule
// on the admin charter comes from the team members page.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team membership", () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team = await test.step("admin creates a team", () =>
      teams.create("membership"));
  });

  test.describe("A team admin adds users to the team", () => {
    test("An added user is listed as a member", async ({ admin, accounts }) => {
      await test.step("admin opens the members of the team and adds secondUser", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.addMember(
          accounts.get("secondUser"),
          team.name,
        );
      });
      await test.step("admin opens the members of the team again and sees secondUser among them", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.expectMember(accounts.get("secondUser"));
      });
    });

    test("An added user finds the team on the home page", async ({
      admin,
      secondUser,
    }) => {
      await test.step("admin opens the members of the team and adds secondUser", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.addMember(secondUser.account, team.name);
      });
      await test.step("secondUser loads the home page and sees the team among their spaces", async () => {
        await secondUser.pages.home.openWithSpaces();
        await secondUser.pages.home.expectSpace(team.name);
      });
    });
  });

  test.describe("Only members see a team among their spaces", () => {
    test("A user who is not a member does not see the team", async ({
      outsider,
    }) => {
      await test.step("outsider loads the home page and does not see the team among their spaces", () =>
        outsider.pages.home.openAndExpectNoSpace(team.name));
    });
  });

  test.describe("A team admin gives members roles", () => {
    test("A member given the Editor role keeps it", async ({
      admin,
      accounts,
    }) => {
      await test.step("admin opens the members of the team and adds secondUser", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.addMember(
          accounts.get("secondUser"),
          team.name,
        );
      });
      await test.step('admin gives secondUser the role "Editor"', () =>
        admin.pages.teamMembers.grant(accounts.get("secondUser"), "Editor"));
      await test.step('admin opens the members of the team again and sees that secondUser holds "Editor"', async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.expectRole(
          accounts.get("secondUser"),
          "Editor",
        );
      });
    });
  });

  test.describe("A team admin removes members", () => {
    test.fixme("A removed member no longer sees the team", () => {
      // admin opens the members of the team and adds secondUser
      // admin removes secondUser from the team on its members page
      // secondUser loads the home page and does not see the team among their spaces
    });
  });

  test.describe("A team keeps at least one admin", () => {
    test.fixme("The only admin cannot give up the Admin role", () => {
      // admin opens the members of the team
      // admin turns off their own role "Admin"
      // admin opens the members of the team again and sees that admin holds "Admin"
    });

    test.fixme("The only admin cannot be removed", () => {
      // admin opens the members of the team
      // admin removes admin from the team
      // admin opens the members of the team again and sees admin among them
    });

    test.fixme("The only admin cannot leave the team", () => {
      // admin leaves the team from its space
      // admin loads the home page and sees the team among their spaces
    });
  });

  test.describe("A member can leave a team", () => {
    test.fixme("A member who leaves no longer sees the team", () => {
      // admin opens the members of the team and adds secondUser
      // secondUser leaves the team from its space
      // secondUser loads the home page and does not see the team among their spaces
    });
  });

  test.describe("A role decides what a member can do", () => {
    test.fixme("An admin without the Editor role cannot add content", () => {
      // admin opens the resources of the team
      // admin does not see "New folder" on the resources page
    });

    test.fixme("An editor without the Admin role cannot manage members", () => {
      // admin opens the members of the team, adds secondUser and gives secondUser the role "Editor"
      // secondUser opens the members of the team
      // secondUser does not see "Add members" on the members page
    });
  });

  test.describe("A new admin accepts the admin charter", () => {
    test.fixme("An admin is shown as pending until they accept", () => {
      // admin opens the members of the team and adds secondUser
      // admin gives secondUser the role "Admin"
      // admin sees secondUser marked "Admin (pending)" among the members
    });
  });
});
