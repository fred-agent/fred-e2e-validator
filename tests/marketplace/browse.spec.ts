// Browsing the marketplace: the marketplace shows a member the community's
// teams, and the agents and prompts that teams share with every user. Source:
// Help Center, "First steps", "Teams and permissions" and "Agents"; the
// community's prompts and the searches come from the marketplace.
import {
  test,
  type Agent,
  type TemporaryTeam,
} from "../../e2e-framework/fixtures/test.ts";

test.describe(
  "Browsing the marketplace",
  { tag: ["@marketplace", "@team"] },
  () => {
    test.beforeEach(async ({ teams }) => {
      await test.step("admin creates a team with secondUser as a member", () =>
        teams.create("market", { members: ["secondUser"] }));
    });

    test.describe("A member browses the community's teams, agents and prompts", () => {
      for (const [kind, tags] of [
        ["Teams", ["@preprod", "@multi-user"]],
        ["Agents", ["@preprod", "@multi-user"]],
        ["Prompts", ["@preprod", "@multi-user"]],
      ] as const) {
        test(
          `A member sees the community's "${kind}"`,
          { tag: [...tags] },
          async ({ secondUser }) => {
            await test.step(`secondUser loads the home page, opens the marketplace and chooses "${kind}"`, () =>
              secondUser.pages.marketplace.browse(kind));
            await test.step(`secondUser sees the community's "${kind}"`, () =>
              secondUser.pages.marketplace.expectKind(kind));
          },
        );
      }
    });

    test.describe("The marketplace shows a search of teams and of prompts", () => {
      test(
        "A member sees a search of the community's teams",
        { tag: ["@preprod", "@multi-user"] },
        async ({ secondUser }) => {
          await test.step('secondUser loads the home page, opens the marketplace and chooses "Teams"', () =>
            secondUser.pages.marketplace.browse("Teams"));
          await test.step('secondUser sees the search "Search for a team"', () =>
            secondUser.pages.marketplace.expectSearch("Teams"));
        },
      );

      test(
        "A member sees a search of the community's prompts",
        { tag: ["@preprod", "@multi-user"] },
        async ({ secondUser }) => {
          await test.step('secondUser loads the home page, opens the marketplace and chooses "Prompts"', () =>
            secondUser.pages.marketplace.browse("Prompts"));
          await test.step('secondUser sees the search "Search a prompt..."', () =>
            secondUser.pages.marketplace.expectSearch("Prompts"));
        },
      );
    });

    test.describe("An agent is shared through the marketplace", () => {
      let team: TemporaryTeam;
      let agent: Agent;

      test.beforeEach(async ({ admin, teams, agents, testData }) => {
        team =
          await test.step("admin creates a team in which admin can create agents", () =>
            teams.create("publishing", {
              roles: { admin: ["Editor"] },
              agentTemplate: testData.agentTemplate,
            }));
        await test.step('admin makes the team public in its settings and turns its publishing "On" in the console section "Marketplaces"', async () => {
          await admin.flows.openTeamSettings(team, "Settings");
          await admin.pages.teamParameters.makePublicAndReload();
          await admin.flows.openConsoleSection("Marketplaces");
          await admin.pages.marketplaceSettings.setTeamPublishing(
            team.name,
            "On",
          );
        });
        agent =
          await test.step("admin creates an agent in the team and publishes it to the marketplace", async () => {
            const created = await agents.create(admin, team, "published");
            await admin.pages.agents.publish(created.name);
            return created;
          });
      });

      test("A published agent is listed in the marketplace", async ({
        secondUser,
      }) => {
        await test.step('secondUser opens the marketplace, chooses "Agents" and sees the agent', async () => {
          await secondUser.pages.marketplace.browse("Agents");
          await secondUser.pages.marketplace.expectAgentListed(agent.name);
        });
      });

      test("A liked agent shows the like", async ({ secondUser }) => {
        await test.step('secondUser opens the marketplace, chooses "Agents" and likes the agent', async () => {
          await secondUser.pages.marketplace.browse("Agents");
          await secondUser.pages.marketplace.likeAgent(agent.name);
        });
        await test.step("secondUser sees one like on the agent", () =>
          secondUser.pages.marketplace.expectLikes(agent.name, 1));
      });

      test("An imported agent is listed in the importing team", async ({
        admin,
        teams,
        agents,
        testData,
      }) => {
        const second =
          await test.step("admin creates a second team in which admin can create agents", () =>
            teams.create("importing", {
              roles: { admin: ["Editor"] },
              agentTemplate: testData.agentTemplate,
            }));
        const copy =
          await test.step('admin opens the marketplace, chooses "Agents" and imports the agent into the second team', () =>
            agents.importFromMarketplace(admin, agent, second));
        await test.step("admin opens the agents of the second team, reloads them and sees the agent", async () => {
          await admin.flows.openAgents(second);
          await admin.pages.agents.reloadAndExpectListed(copy.name);
        });
      });
    });
  },
);
