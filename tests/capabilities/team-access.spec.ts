// Capabilities of a team: a platform admin grants capabilities to a
// team or withdraws them, team by team. A team's agent form shows only the
// capabilities the team may use, an agent keeps those it was saved with, and
// an agent that uses a capability withdrawn from the team is suspended until
// the team may use it again, and hidden meanwhile from members who cannot
// change agents. Admin › Features names the capability "Documents" that the
// agent form shows as "Team documents". Source: Help Center, "Agents",
// "Capabilities" and "Platform administration"; the "Advanced" view comes
// from the agent form.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe(
  "Capabilities of a team",
  { tag: ["@capability", "@ppt", "@team"] },
  () => {
    let team: TemporaryTeam;

    test.beforeEach(async ({ teams, testData }) => {
      team =
        await test.step('admin creates a team in which admin can create agents, with "Generate a presentation" enabled for it', () =>
          teams.create("capabilities", {
            roles: { admin: ["Editor"] },
            agentTemplate: testData.agentTemplate,
            capabilities: [
              { capability: "Generate a presentation", access: "Enable" },
            ],
          }));
    });

    test.describe("A team's agent form does not show a capability disabled for the team", () => {
      test('The agent form shows "Team documents" and not "Generate a presentation"', async ({
        admin,
        testData,
      }) => {
        await test.step('admin disables "Generate a presentation" for the team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a presentation",
            team.name,
            "Disable",
          );
        });
        await test.step("admin opens the agents of the team", () =>
          admin.flows.openAgents(team));
        await test.step('admin reloads the agents and opens "Capabilities" in the form of a new agent from the template of the test data', () =>
          admin.pages.agents.reloadAndOpenNewAgentCapabilities(
            testData.agentTemplate,
          ));
        await test.step('admin sees "Team documents" among the capabilities', () =>
          admin.pages.agents.expectCapabilityListed("Team documents"));
        await test.step('admin does not see "Generate a presentation" among the capabilities', () =>
          admin.pages.agents.expectCapabilityNotListed(
            "Generate a presentation",
          ));
      });
    });

    test.describe("A team's agent form shows a capability enabled for the team", () => {
      test('After it is enabled, the agent form shows "Generate a presentation"', async ({
        admin,
        testData,
      }) => {
        await test.step('admin disables "Generate a presentation" for the team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a presentation",
            team.name,
            "Disable",
          );
        });
        await test.step('admin enables "Generate a presentation" for the team', () =>
          admin.pages.features.setCapabilityAccess(
            "Generate a presentation",
            team.name,
            "Enable",
          ));
        await test.step("admin opens the agents of the team", () =>
          admin.flows.openAgents(team));
        await test.step('admin reloads the agents, sees "Generate a presentation" in the form of a new agent and closes it unsaved', () =>
          admin.pages.agents.reloadAndExpectCapabilityListedForNewAgent(
            testData.agentTemplate,
            "Generate a presentation",
          ));
      });
    });

    test.describe("An agent keeps the tools it was saved with", () => {
      test("A tool turned on is still on after the page is opened again", async ({
        admin,
        agents,
      }) => {
        const agent =
          await test.step("admin creates an agent in the team", () =>
            agents.create(admin, team, "presenter"));
        await test.step('admin opens the agents of the team and turns on "Generate a presentation" for the agent', async () => {
          await admin.flows.openAgents(team);
          await admin.pages.agents.turnOn(
            agent.name,
            "Generate a presentation",
          );
        });
        await test.step('admin reloads the agents, opens the form of the agent, sees "Generate a presentation" on and closes the form unsaved', () =>
          admin.pages.agents.reloadAndExpectCapabilityOn(
            agent.name,
            "Generate a presentation",
          ));
      });
    });

    test.describe("Disabling a capability suspends the agents that use it", () => {
      test("The agent that uses it is suspended; an agent without it stays available", async ({
        admin,
        agents,
      }) => {
        const presenter =
          await test.step('admin creates an agent in the team and turns on "Generate a presentation" for it', async () => {
            const created = await agents.create(admin, team, "presenter");
            await admin.pages.agents.turnOn(
              created.name,
              "Generate a presentation",
            );
            return created;
          });
        const control =
          await test.step("admin creates a second agent in the team", () =>
            agents.create(admin, team, "control"));
        await test.step('admin disables "Generate a presentation" for the team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a presentation",
            team.name,
            "Disable",
          );
        });
        await test.step("admin opens the agents of the team", () =>
          admin.flows.openAgents(team));
        await test.step('admin reloads the agents and sees the first agent suspended, with "Chat" disabled', () =>
          admin.pages.agents.reloadAndExpectSuspended(presenter.name));
        await test.step('admin reloads the agents and sees the second agent available, with "Chat"', () =>
          admin.pages.agents.reloadAndExpectAvailable(control.name));
      });
    });

    test.describe("A reader does not see a suspended agent", () => {
      test("A reader sees the available agent only", async ({
        admin,
        secondUser,
        agents,
      }) => {
        const presenter =
          await test.step('admin creates an agent in the team and turns on "Generate a presentation" for it', async () => {
            const created = await agents.create(admin, team, "presenter");
            await admin.pages.agents.turnOn(
              created.name,
              "Generate a presentation",
            );
            return created;
          });
        const control =
          await test.step("admin creates a second agent in the team", () =>
            agents.create(admin, team, "control"));
        await test.step('admin disables "Generate a presentation" for the team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a presentation",
            team.name,
            "Disable",
          );
        });
        await test.step("admin opens the members of the team and adds secondUser", async () => {
          await admin.flows.openTeamMembers(team);
          await admin.pages.teamMembers.addMember(
            secondUser.account,
            team.name,
          );
        });
        await test.step("secondUser opens the agents of the team", () =>
          secondUser.flows.openAgents(team));
        await test.step("secondUser reloads the agents and sees the second agent", () =>
          secondUser.pages.agents.reloadAndExpectListed(control.name));
        await test.step("secondUser reloads the agents and does not see the first agent", () =>
          secondUser.pages.agents.reloadAndExpectNotListed(presenter.name));
      });
    });

    test.describe("A platform admin opens a feature team by team", () => {
      test("The agent form of another team still shows a capability disabled for one team", async ({
        admin,
        teams,
        testData,
      }) => {
        const other =
          await test.step("admin creates a second team in which admin can create agents", () =>
            teams.create("closed", {
              roles: { admin: ["Editor"] },
              agentTemplate: testData.agentTemplate,
            }));
        await test.step('admin disables "Generate a presentation" for the second team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a presentation",
            other.name,
            "Disable",
          );
        });
        await test.step("admin opens the agents of the first team", () =>
          admin.flows.openAgents(team));
        await test.step('admin reloads the agents, sees "Generate a presentation" in the form of a new agent and closes it unsaved', () =>
          admin.pages.agents.reloadAndExpectCapabilityListedForNewAgent(
            testData.agentTemplate,
            "Generate a presentation",
          ));
      });

      test.fixme("The agent form of a team without a setting of its own does not show a capability enabled for one team", () => {
        // Planned: changes a choice for every team or every user, which no fixture puts back.
        // admin creates a second team in which admin can create agents
        // admin turns "Enabled for all" off for the capability "Generate a presentation" in the console section "Features"
        // admin opens the capabilities of a new agent of the second team and does not see "Generate a presentation"
      });
    });

    test.describe(
      "Enabling the capability again restores its agents",
      { tag: "@chat" },
      () => {
        test('The suspended agent is available again, with "Chat"', async ({
          admin,
          agents,
        }) => {
          const presenter =
            await test.step('admin creates an agent in the team and turns on "Generate a presentation" for it', async () => {
              const created = await agents.create(admin, team, "presenter");
              await admin.pages.agents.turnOn(
                created.name,
                "Generate a presentation",
              );
              return created;
            });
          await test.step('admin disables "Generate a presentation" for the team in the console section "Features"', async () => {
            await admin.flows.openConsoleSection("Features");
            await admin.pages.features.setCapabilityAccess(
              "Generate a presentation",
              team.name,
              "Disable",
            );
          });
          await test.step('admin enables "Generate a presentation" for the team', () =>
            admin.pages.features.setCapabilityAccess(
              "Generate a presentation",
              team.name,
              "Enable",
            ));
          await test.step('admin opens the agents of the team, reloads them and sees the agent available, with "Chat"', async () => {
            await admin.flows.openAgents(team);
            await admin.pages.agents.reloadAndExpectAvailable(presenter.name);
          });
        });
      },
    );

    test.describe("The agent form has advanced capabilities", () => {
      test('The "Advanced" switch shows more capabilities', async ({
        admin,
        testData,
      }) => {
        await test.step('admin opens the agents of the team, reloads them and opens "Capabilities" in the form of a new agent from the template of the test data', async () => {
          await admin.flows.openAgents(team);
          await admin.pages.agents.reloadAndOpenNewAgentCapabilities(
            testData.agentTemplate,
          );
        });
        await test.step('admin turns on "Advanced capabilities view"', () =>
          admin.pages.agents.showAdvancedCapabilities());
        await test.step('admin sees the capability "Search documents by label"', () =>
          admin.pages.agents.expectAdvancedCapabilityListed(
            "Search documents by label",
          ));
      });
    });
  },
);
