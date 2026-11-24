// Browsing the marketplace: the marketplace shows a member the community's
// teams, and the agents and prompts that teams share with every user. Source:
// Help Center, "First steps", "Teams and permissions" and "Agents"; the
// community's prompts and the searches come from the marketplace.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Browsing the marketplace", () => {
  test.beforeEach(async ({ teams }) => {
    await test.step("admin creates a team with secondUser as a member", () =>
      teams.create("market", { members: ["secondUser"] }));
  });

  test.describe("A member browses the community's teams, agents and prompts", () => {
    for (const kind of ["Teams", "Agents", "Prompts"] as const) {
      test(`A member sees the community's "${kind}"`, async ({
        secondUser,
      }) => {
        await test.step(`secondUser loads the home page, opens the marketplace and chooses "${kind}"`, () =>
          secondUser.pages.marketplace.browse(kind));
        await test.step(`secondUser sees the community's "${kind}"`, () =>
          secondUser.pages.marketplace.expectKind(kind));
      });
    }
  });

  test.describe("The marketplace shows a search of teams and of prompts", () => {
    test("A member sees a search of the community's teams", async ({
      secondUser,
    }) => {
      await test.step('secondUser loads the home page, opens the marketplace and chooses "Teams"', () =>
        secondUser.pages.marketplace.browse("Teams"));
      await test.step('secondUser sees the search "Search for a team"', () =>
        secondUser.pages.marketplace.expectSearch("Teams"));
    });

    test("A member sees a search of the community's prompts", async ({
      secondUser,
    }) => {
      await test.step('secondUser loads the home page, opens the marketplace and chooses "Prompts"', () =>
        secondUser.pages.marketplace.browse("Prompts"));
      await test.step('secondUser sees the search "Search a prompt..."', () =>
        secondUser.pages.marketplace.expectSearch("Prompts"));
    });
  });

  test.describe("An agent is shared through the marketplace", () => {
    test.fixme("A published agent is listed in the marketplace", () => {
      // Planned: publishes to the marketplace.
      // admin creates a public team in which admin also holds the Editor role
      // admin creates an agent in the team
      // admin publishes the agent to the marketplace
      // secondUser opens the marketplace, chooses "Agents" and sees the agent
    });

    test.fixme("A liked agent shows the like", () => {
      // Planned: publishes to the marketplace.
      // admin creates a team in which admin also holds the Editor role
      // admin creates an agent in the team and publishes it to the marketplace
      // secondUser opens the marketplace, chooses "Agents" and likes the agent
      // secondUser sees one like on the agent
    });

    test.fixme("An imported agent is listed in the importing team", () => {
      // Planned: publishes to the marketplace.
      // admin creates a team in which admin also holds the Editor role
      // admin creates an agent in the team and publishes it to the marketplace
      // admin creates a second team in which admin also holds the Editor role
      // admin opens the marketplace, chooses "Agents" and imports the agent into the second team
      // admin opens the agents of the second team and sees the agent
    });
  });
});
