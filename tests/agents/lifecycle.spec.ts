// Agent lifecycle: a team's editors create agents from the templates enabled
// for the team, edit them, deactivate and activate them, restrict them to
// chosen folders, copy and delete them; every member of the team sees its
// agents. Source: Help Center, "Agents" and "Teams and permissions";
// the rules on an agent's use case and on deactivating an agent come from
// the agents page.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe("Agent lifecycle", { tag: "@team" }, () => {
  let team: TemporaryTeam;

  test.beforeEach(async ({ teams, testData }) => {
    team =
      await test.step("admin creates a team in which admin can create agents", () =>
        teams.create("agents", {
          roles: { admin: ["Editor"] },
          agentTemplate: testData.agentTemplate,
        }));
  });

  test.describe("An agent needs a use case", () => {
    test("A new agent without a use case is not saved", async ({
      admin,
      testData,
    }) => {
      const name = "e2e agent without a use case";
      await test.step("admin opens the agents of the team", () =>
        admin.flows.openAgents(team));
      await test.step('admin starts a new agent from the template of the test data, names it, clicks "Create" without a use case, sees the use case marked as missing and closes the form unsaved', () =>
        admin.pages.agents.expectUseCaseRequired(testData.agentTemplate, name));
      await test.step("admin reloads the agents and does not see the new agent", () =>
        admin.pages.agents.reloadAndExpectNotListed(name));
    });
  });

  test.describe("An editor creates agents from a template", () => {
    test("A created agent is listed", async ({ admin, agents }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step("admin reloads the agents and sees the agent", () =>
        admin.pages.agents.reloadAndExpectListed(agent.name));
    });
  });

  test.describe("An agent's edits are kept", () => {
    test("An edited description is shown after the page is opened again", async ({
      admin,
      agents,
    }) => {
      const description = "Edited by the end-to-end tests.";
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step("admin opens the agents of the team and changes the description of the agent", async () => {
        await admin.flows.openAgents(team);
        await admin.pages.agents.setDescription(agent.name, description);
      });
      await test.step("admin reloads the agents, opens the form of the agent, sees the new description and closes the form unsaved", () =>
        admin.pages.agents.reloadAndExpectDescription(agent.name, description));
    });
  });

  test.describe("A deactivated agent cannot be chatted with", () => {
    test('Deactivating an agent disables its "Chat"', async ({
      admin,
      agents,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step("admin opens the agents of the team and deactivates the agent", async () => {
        await admin.flows.openAgents(team);
        await admin.pages.agents.deactivate(agent.name);
      });
      await test.step('admin reloads the agents and sees "Chat" of the agent disabled', () =>
        admin.pages.agents.reloadAndExpectCannotChat(agent.name));
    });

    test('Activating a deactivated agent brings "Chat" back', async ({
      admin,
      agents,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step("admin opens the agents of the team and deactivates the agent", async () => {
        await admin.flows.openAgents(team);
        await admin.pages.agents.deactivate(agent.name);
      });
      await test.step("admin activates the agent", () =>
        admin.pages.agents.activate(agent.name));
      await test.step('admin reloads the agents and sees "Chat" of the agent enabled', () =>
        admin.pages.agents.reloadAndExpectCanChat(agent.name));
    });
  });

  test.describe("An agent can be restricted to chosen folders", () => {
    test("The chosen folder is kept after the page is opened again", async ({
      admin,
      folders,
      agents,
    }) => {
      const folder = await test.step("admin creates a folder in the team", () =>
        folders.create(admin, team, "agent folder"));
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step('admin opens the agents of the team and restricts "Team documents" of the agent to the folder', async () => {
        await admin.flows.openAgents(team);
        await admin.pages.agents.restrictTo(agent.name, folder.name);
      });
      await test.step('admin reloads the agents, opens the form of the agent, sees "Team documents" restricted to the folder and closes the form unsaved', () =>
        admin.pages.agents.reloadAndExpectRestrictedTo(
          agent.name,
          folder.name,
        ));
    });
  });

  test.describe(
    "A reader sees agents without changing them",
    { tag: "@extended" },
    () => {
      test("A reader sees no create action and no card menu", async ({
        admin,
        secondUser,
        agents,
      }) => {
        const agent =
          await test.step("admin creates an agent in the team", () =>
            agents.create(admin, team, "agent"));
        await test.step("admin opens the members of the team and adds secondUser", async () => {
          await admin.flows.openTeamMembers(team);
          await admin.pages.teamMembers.addMember(
            secondUser.account,
            team.name,
          );
        });
        await test.step("secondUser opens the agents of the team", () =>
          secondUser.flows.openAgents(team));
        await test.step('secondUser reloads the agents and does not see "Create Agent"', () =>
          secondUser.pages.agents.reloadAndExpectButtonAbsent("Create Agent"));
        await test.step('secondUser reloads the agents and sees the agent without "More actions"', () =>
          secondUser.pages.agents.reloadAndExpectNoMenu(agent.name));
      });
    },
  );

  test.describe("An editor deletes agents", () => {
    test("A deleted agent is no longer listed", async ({ admin, agents }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step("admin opens the agents of the team and deletes the agent", async () => {
        await admin.flows.openAgents(team);
        await admin.pages.agents.delete(agent.name);
      });
      await test.step("admin reloads the agents and does not see the agent", () =>
        admin.pages.agents.reloadAndExpectNotListed(agent.name));
    });
  });

  test.describe("An editor duplicates an agent", () => {
    test("The duplicate is listed next to the original", async ({
      admin,
      agents,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      const duplicate =
        await test.step("admin opens the agents of the team and duplicates the agent under a new name", () =>
          agents.duplicate(admin, agent, "duplicate"));
      await test.step("admin reloads the agents and sees the duplicate", () =>
        admin.pages.agents.reloadAndExpectListed(duplicate.name));
      await test.step("admin reloads the agents and sees the agent", () =>
        admin.pages.agents.reloadAndExpectListed(agent.name));
    });
  });

  test.describe("An editor copies an agent to another team", () => {
    test('"Copy to…" starts with the origin team checked and "Copy" disabled', async ({
      admin,
      agents,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step("admin opens the agents of the team", () =>
        admin.flows.openAgents(team));
      await test.step('admin opens "Copy to…" of the agent, sees the team checked and "Copy" disabled, and closes the dialog', () =>
        admin.pages.agents.expectCopyDialog(agent.name, team.name));
    });

    test("The copy dialog shows only teams where the user is an editor", async ({
      admin,
      teams,
      agents,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      const second =
        await test.step("admin creates a second team in which admin also holds the Editor role", () =>
          teams.create("agents second", { roles: { admin: ["Editor"] } }));
      const third =
        await test.step("admin creates a third team in which admin does not hold the Editor role", () =>
          teams.create("agents third"));
      await test.step("admin opens the agents of the team", () =>
        admin.flows.openAgents(team));
      await test.step('admin opens "Copy to…" of the agent, sees the second team and not the third among the destinations, and closes the dialog', () =>
        admin.pages.agents.expectCopyDestinations(
          agent.name,
          team.name,
          second.name,
          third.name,
        ));
    });

    test('A name that exists in the other team gets "(copy 1)"', async ({
      admin,
      teams,
      agents,
      testData,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      const second =
        await test.step("admin creates a second team in which admin can create agents", () =>
          teams.create("agents second", {
            roles: { admin: ["Editor"] },
            agentTemplate: testData.agentTemplate,
          }));
      const copy =
        await test.step("admin copies the agent to the second team", () =>
          agents.copy(admin, agent, second));
      const numbered =
        await test.step("admin copies the agent to the second team again", () =>
          agents.copy(admin, agent, second, `${agent.name} (copy 1)`));
      await test.step("admin opens the agents of the second team, reloads them and sees the first copy under the agent's name", async () => {
        await admin.flows.openAgents(second);
        await admin.pages.agents.reloadAndExpectListed(copy.name);
      });
      await test.step('admin reloads the agents and sees the second copy under the agent\'s name followed by "(copy 1)"', () =>
        admin.pages.agents.reloadAndExpectListed(numbered.name));
    });

    test("The copy's chosen folders are reset", async ({
      admin,
      teams,
      agents,
      folders,
      testData,
    }) => {
      const folder = await test.step("admin creates a folder in the team", () =>
        folders.create(admin, team, "agent folder"));
      const agent =
        await test.step('admin creates an agent in the team and restricts its "Team documents" to the folder', async () => {
          const created = await agents.create(admin, team, "agent");
          await admin.pages.agents.restrictTo(created.name, folder.name);
          return created;
        });
      const second =
        await test.step("admin creates a second team in which admin can create agents", () =>
          teams.create("agents second", {
            roles: { admin: ["Editor"] },
            agentTemplate: testData.agentTemplate,
          }));
      const copy =
        await test.step("admin copies the agent to the second team", () =>
          agents.copy(admin, agent, second));
      await test.step("admin opens the agents of the second team", () =>
        admin.flows.openAgents(second));
      await test.step('admin reloads the agents, opens the form of the copy, sees "Team documents" restricted to no folder and closes the form unsaved', () =>
        admin.pages.agents.reloadAndExpectNotRestricted(copy.name));
    });
  });

  test.describe("The agent form recommends models", () => {
    test("The recommended models are listed first", async ({
      admin,
      agents,
    }) => {
      const agent = await test.step("admin creates an agent in the team", () =>
        agents.create(admin, team, "agent"));
      await test.step('admin opens the form of the agent, sees "Team default model" first among its models and closes the form unsaved', () =>
        admin.pages.agents.expectDefaultModelFirst(agent.name));
    });
  });
});
