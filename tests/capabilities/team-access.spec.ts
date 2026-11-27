// Capabilities of a team: a platform admin grants capabilities to a
// team or withdraws them, team by team. A team's agent form shows only the
// capabilities the team may use, an agent keeps those it was saved with, and
// an agent that uses a capability withdrawn from the team is suspended until
// the team may use it again, and hidden meanwhile from members who cannot
// change agents. A team set back to "Default", and a team without a setting
// of its own, follows the capability's setting for all teams. The console
// and the agent form use different labels for some capabilities.
// Sources include the help articles on agents, capabilities and platform
// administration. The advanced view comes from the agent form.
import { test, type TemporaryTeam } from "../../e2e-framework/fixtures/test.ts";

test.describe(
  "Capabilities of a team",
  { tag: ["@capability", "@team"] },
  () => {
    let team: TemporaryTeam;

    // The setup of each rule whose cases start from a team with "Generate a
    // presentation" enabled. A case that first reads the settings for all
    // teams creates its teams itself, after that read, so its rule does not
    // call it.
    const createTeamBeforeEach = (): void =>
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

    test.describe(
      "A team's agent form does not show a capability disabled for the team",
      { tag: "@ppt" },
      () => {
        createTeamBeforeEach();

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
      },
    );

    test.describe(
      "A team's agent form shows a capability enabled for the team",
      { tag: "@ppt" },
      () => {
        createTeamBeforeEach();

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
      },
    );

    test.describe(
      "An agent keeps the tools it was saved with",
      { tag: "@ppt" },
      () => {
        createTeamBeforeEach();

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
      },
    );

    test.describe(
      "Disabling a capability suspends the agents that use it",
      { tag: "@ppt" },
      () => {
        createTeamBeforeEach();

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
      },
    );

    test.describe(
      "A reader does not see a suspended agent",
      { tag: "@ppt" },
      () => {
        createTeamBeforeEach();

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
      },
    );

    test.describe('A team set back to "Default" follows the setting for all teams', () => {
      test('A capability enabled for all teams and disabled for the team is shown again after "Default"', async ({
        admin,
        teams,
        testData,
      }) => {
        const shared =
          await test.step('admin opens the console section "Features", sees "Enabled for all" on for "Generate a web page (HTML/CSS)" and reads its choice for "All personal spaces"', async () => {
            await admin.flows.openConsoleSection("Features");
            return admin.pages.features.readSharedAccess(
              "Generate a web page (HTML/CSS)",
              true,
            );
          });
        const target =
          await test.step("admin creates a team in which admin can create agents", () =>
            teams.create("html", {
              roles: { admin: ["Editor"] },
              agentTemplate: testData.agentTemplate,
            }));
        await test.step('admin disables "Generate a web page (HTML/CSS)" for the team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a web page (HTML/CSS)",
            target.name,
            "Disable",
          );
        });
        await test.step('admin sees "Enabled for all" and "All personal spaces" of "Generate a web page (HTML/CSS)" unchanged', () =>
          admin.pages.features.expectSharedAccess(shared));
        await test.step("admin opens the agents of the team", () =>
          admin.flows.openAgents(target));
        await test.step('admin reloads the agents, sees "Team documents" and not "Generate a web page (HTML/CSS)" in the form of a new agent and closes it unsaved', () =>
          admin.pages.agents.reloadAndExpectCapabilityAbsentForNewAgent(
            testData.agentTemplate,
            "Generate a web page (HTML/CSS)",
            "Team documents",
          ));
        await test.step('admin chooses "Default" for "Generate a web page (HTML/CSS)" for the team in the console section "Features"', async () => {
          await admin.flows.openConsoleSection("Features");
          await admin.pages.features.setCapabilityAccess(
            "Generate a web page (HTML/CSS)",
            target.name,
            "Default",
          );
        });
        await test.step('admin sees "Enabled for all" and "All personal spaces" of "Generate a web page (HTML/CSS)" unchanged', () =>
          admin.pages.features.expectSharedAccess(shared));
        await test.step("admin opens the agents of the team", () =>
          admin.flows.openAgents(target));
        await test.step('admin reloads the agents, sees "Generate a web page (HTML/CSS)" in the form of a new agent and closes it unsaved', () =>
          admin.pages.agents.reloadAndExpectCapabilityListedForNewAgent(
            testData.agentTemplate,
            "Generate a web page (HTML/CSS)",
          ));
      });

      test(
        'A capability disabled for all teams and enabled for the team is no longer shown after "Default"',
        { tag: "@ppt" },
        async ({ admin, teams, testData }) => {
          const shared =
            await test.step('admin opens the console section "Features", sees "Enabled for all" off for "Fill a PowerPoint file" and reads its choice for "All personal spaces"', async () => {
              await admin.flows.openConsoleSection("Features");
              return admin.pages.features.readSharedAccess(
                "Fill a PowerPoint file",
                false,
              );
            });
          const target =
            await test.step("admin creates a team in which admin can create agents", () =>
              teams.create("powerpoint", {
                roles: { admin: ["Editor"] },
                agentTemplate: testData.agentTemplate,
              }));
          await test.step('admin enables "Fill a PowerPoint file" for the team in the console section "Features"', async () => {
            await admin.flows.openConsoleSection("Features");
            await admin.pages.features.setCapabilityAccess(
              "Fill a PowerPoint file",
              target.name,
              "Enable",
            );
          });
          await test.step('admin sees "Enabled for all" and "All personal spaces" of "Fill a PowerPoint file" unchanged', () =>
            admin.pages.features.expectSharedAccess(shared));
          await test.step("admin opens the agents of the team", () =>
            admin.flows.openAgents(target));
          await test.step('admin reloads the agents, sees "Fill in a PowerPoint document" in the form of a new agent and closes it unsaved', () =>
            admin.pages.agents.reloadAndExpectCapabilityListedForNewAgent(
              testData.agentTemplate,
              "Fill in a PowerPoint document",
            ));
          await test.step('admin chooses "Default" for "Fill a PowerPoint file" for the team in the console section "Features"', async () => {
            await admin.flows.openConsoleSection("Features");
            await admin.pages.features.setCapabilityAccess(
              "Fill a PowerPoint file",
              target.name,
              "Default",
            );
          });
          await test.step('admin sees "Enabled for all" and "All personal spaces" of "Fill a PowerPoint file" unchanged', () =>
            admin.pages.features.expectSharedAccess(shared));
          await test.step("admin opens the agents of the team", () =>
            admin.flows.openAgents(target));
          await test.step('admin reloads the agents, sees "Team documents" and not "Fill in a PowerPoint document" in the form of a new agent and closes it unsaved', () =>
            admin.pages.agents.reloadAndExpectCapabilityAbsentForNewAgent(
              testData.agentTemplate,
              "Fill in a PowerPoint document",
              "Team documents",
            ));
        },
      );
    });

    test.describe(
      "A platform admin opens a feature team by team",
      { tag: "@ppt" },
      () => {
        test("The agent form of another team still shows a capability disabled for one team", async ({
          admin,
          teams,
          testData,
        }) => {
          const first =
            await test.step('admin creates a team in which admin can create agents, with "Generate a presentation" enabled for it', () =>
              teams.create("capabilities", {
                roles: { admin: ["Editor"] },
                agentTemplate: testData.agentTemplate,
                capabilities: [
                  { capability: "Generate a presentation", access: "Enable" },
                ],
              }));
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
            admin.flows.openAgents(first));
          await test.step('admin reloads the agents, sees "Generate a presentation" in the form of a new agent and closes it unsaved', () =>
            admin.pages.agents.reloadAndExpectCapabilityListedForNewAgent(
              testData.agentTemplate,
              "Generate a presentation",
            ));
        });

        test("The agent form of a team without a setting of its own does not show a capability enabled for one team", async ({
          admin,
          teams,
          testData,
        }) => {
          const shared =
            await test.step('admin opens the console section "Features", sees "Enabled for all" off for "Fill a PowerPoint file" and reads its choice for "All personal spaces"', async () => {
              await admin.flows.openConsoleSection("Features");
              return admin.pages.features.readSharedAccess(
                "Fill a PowerPoint file",
                false,
              );
            });
          const first =
            await test.step("admin creates a team in which admin can create agents", () =>
              teams.create("override", {
                roles: { admin: ["Editor"] },
                agentTemplate: testData.agentTemplate,
              }));
          const second =
            await test.step("admin creates a second team in which admin can create agents", () =>
              teams.create("inherits", {
                roles: { admin: ["Editor"] },
                agentTemplate: testData.agentTemplate,
              }));
          await test.step('admin enables "Fill a PowerPoint file" for the first team in the console section "Features"', async () => {
            await admin.flows.openConsoleSection("Features");
            await admin.pages.features.setCapabilityAccess(
              "Fill a PowerPoint file",
              first.name,
              "Enable",
            );
          });
          await test.step('admin sees "Enabled for all" and "All personal spaces" of "Fill a PowerPoint file" unchanged', () =>
            admin.pages.features.expectSharedAccess(shared));
          await test.step("admin opens the agents of the first team", () =>
            admin.flows.openAgents(first));
          await test.step('admin reloads the agents, sees "Fill in a PowerPoint document" in the form of a new agent and closes it unsaved', () =>
            admin.pages.agents.reloadAndExpectCapabilityListedForNewAgent(
              testData.agentTemplate,
              "Fill in a PowerPoint document",
            ));
          await test.step("admin opens the agents of the second team", () =>
            admin.flows.openAgents(second));
          await test.step('admin reloads the agents, sees "Team documents" and not "Fill in a PowerPoint document" in the form of a new agent and closes it unsaved', () =>
            admin.pages.agents.reloadAndExpectCapabilityAbsentForNewAgent(
              testData.agentTemplate,
              "Fill in a PowerPoint document",
              "Team documents",
            ));
        });
      },
    );

    test.describe(
      "Enabling the capability again restores its agents",
      { tag: ["@chat", "@ppt"] },
      () => {
        createTeamBeforeEach();

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

    test.describe(
      "The agent form has advanced capabilities",
      { tag: "@ppt" },
      () => {
        createTeamBeforeEach();

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
      },
    );
  },
);
