// Team membership: a team admin decides who belongs to a team and which roles
// members hold. Source: Help Center, "Teams and permissions"; the rule
// on the admin charter comes from the team members page.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Team membership", { tag: "@team" }, () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams }) => {
    team = await test.step("admin creates a team", () =>
      teams.create("membership"));
  });

  test.describe(
    "A team admin adds users to the team",
    { tag: "@extended" },
    () => {
      test("An added user is listed as a member", async ({
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
        await test.step("admin opens the members of the team again and sees secondUser among them", async () => {
          await admin.flows.openTeamMembers(team);
          await admin.pages.teamMembers.expectMember(
            accounts.get("secondUser"),
          );
        });
      });

      test("An added user finds the team on the home page", async ({
        admin,
        secondUser,
      }) => {
        await test.step("admin opens the members of the team and adds secondUser", async () => {
          await admin.flows.openTeamMembers(team);
          await admin.pages.teamMembers.addMember(
            secondUser.account,
            team.name,
          );
        });
        await test.step("secondUser loads the home page and sees the team among their spaces", async () => {
          await secondUser.pages.home.openWithSpaces();
          await secondUser.pages.home.expectSpace(team.name);
        });
      });
    },
  );

  test.describe(
    "Only members see a team among their spaces",
    { tag: "@extended" },
    () => {
      test("A user who is not a member does not see the team", async ({
        outsider,
      }) => {
        await test.step("outsider loads the home page and does not see the team among their spaces", () =>
          outsider.pages.home.openAndExpectNoSpace(team.name));
      });
    },
  );

  test.describe(
    "A team admin gives members roles",
    { tag: "@extended" },
    () => {
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
    },
  );

  test.describe("A team admin removes members", { tag: "@extended" }, () => {
    test("A removed member no longer sees the team", async ({
      admin,
      secondUser,
    }) => {
      await test.step("admin opens the members of the team and adds secondUser", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.addMember(secondUser.account, team.name);
      });
      await test.step("admin removes secondUser from the team on its members page", () =>
        admin.pages.teamMembers.removeMember(secondUser.account));
      await test.step("secondUser loads the home page and does not see the team among their spaces", () =>
        secondUser.pages.home.openAndExpectNoSpace(team.name));
    });
  });

  test.describe("A team keeps at least one admin", () => {
    test("The only admin cannot give up the Admin role", async ({ admin }) => {
      await test.step("admin opens the members of the team", () =>
        admin.flows.openTeamMembers(team));
      await test.step('admin turns off their own role "Admin" and is told that a team must keep an admin', () =>
        admin.pages.teamMembers.turnOffOnlyAdminAndExpectRefused(
          admin.account,
        ));
      await test.step('admin opens the members of the team again and sees that admin holds "Admin"', async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.expectRole(admin.account, "Admin");
      });
    });

    test("The only admin cannot be removed", async ({ admin }) => {
      await test.step("admin opens the members of the team", () =>
        admin.flows.openTeamMembers(team));
      await test.step("admin removes admin from the team and is told that a team must keep an admin", () =>
        admin.pages.teamMembers.removeOnlyAdminAndExpectRefused(admin.account));
      await test.step("admin opens the members of the team again and sees admin among them", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.expectMember(admin.account);
      });
    });

    test("The only admin cannot leave the team", async ({ admin }) => {
      await test.step("admin opens the members of the team", () =>
        admin.flows.openTeamMembers(team));
      await test.step('admin opens "More actions" of the members, sees "Leave team" disabled for the only admin and closes the menu', () =>
        admin.pages.teamMembers.expectOnlyAdminCannotLeave());
    });
  });

  test.describe("A member can leave a team", { tag: "@extended" }, () => {
    test("A member who leaves no longer sees the team", async ({
      admin,
      secondUser,
    }) => {
      await test.step("admin opens the members of the team and adds secondUser", async () => {
        await admin.flows.openTeamMembers(team);
        await admin.pages.teamMembers.addMember(secondUser.account, team.name);
      });
      await test.step('secondUser opens the members of the team and leaves it with "Leave team"', async () => {
        await secondUser.flows.openTeamMembers(team);
        await secondUser.pages.teamMembers.leaveTeam();
      });
      await test.step("secondUser loads the home page and does not see the team among their spaces", () =>
        secondUser.pages.home.openAndExpectNoSpace(team.name));
    });
  });

  test.describe("A role decides what a member can do", () => {
    test("An admin without the Editor role cannot add content", async ({
      admin,
    }) => {
      await test.step("admin opens the resources of the team as a member", () =>
        admin.flows.openResourcesAsMember(team));
      await test.step('admin reloads the resources and does not see "New folder"', () =>
        admin.pages.resources.reloadAndExpectButtonAbsent("New folder"));
    });

    test(
      "An editor without the Admin role cannot manage members",
      { tag: "@extended" },
      async ({ admin, secondUser }) => {
        await test.step('admin opens the members of the team, adds secondUser and gives secondUser the role "Editor"', async () => {
          await admin.flows.openTeamMembers(team);
          await admin.pages.teamMembers.addMember(
            secondUser.account,
            team.name,
          );
          await admin.pages.teamMembers.grant(secondUser.account, "Editor");
        });
        await test.step("secondUser opens the members of the team", () =>
          secondUser.flows.openTeamMembers(team));
        await test.step('secondUser sees the roles they cannot change and does not see "Add members"', () =>
          secondUser.pages.teamMembers.expectCannotManageMembers(
            secondUser.account,
          ));
      },
    );
  });

  test.describe(
    "A new admin accepts the admin charter",
    { tag: "@extended" },
    () => {
      test.fixme("An admin is shown as pending until they accept", () => {
        // Planned: needs an account that has never accepted the team administrator charter.
        // admin opens the members of the team and adds secondUser
        // admin gives secondUser the role "Admin"
        // admin sees secondUser marked "Admin (pending)" among the members
      });
    },
  );
});
