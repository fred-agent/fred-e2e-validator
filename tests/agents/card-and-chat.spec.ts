// Agent card and conversation: an agent's card offers a team's editors its
// actions and its details, the team's agents can be sorted, and an editor
// starts a conversation with an agent from its card; a conversation is
// opened and never typed into. Source: Help Center, "Agents" and
// "Conversations"; the card's details, the orders of the agents and the
// conversation's chat actions and panels come from the agents and
// conversation pages.
import {
  test,
  type Agent,
  type TemporaryTeam,
} from "../../e2e-framework/fixtures/test.ts";

test.describe("Agent card and conversation", { tag: "@team" }, () => {
  let team: TemporaryTeam;
  let agent: Agent;

  test.beforeEach(async ({ teams, agents, admin, testData }) => {
    team =
      await test.step("admin creates a team in which admin can create agents", () =>
        teams.create("agents", {
          roles: { admin: ["Editor"] },
          agentTemplate: testData.agentTemplate,
        }));
    agent = await test.step("admin creates an agent in the team", () =>
      agents.create(admin, team, "agent"));
  });

  test.describe("An agent's card shows an editor its actions", () => {
    test("The card menu shows exactly Edit, Deactivate, Duplicate, Copy to… and Delete", async ({
      admin,
    }) => {
      await test.step("admin opens the agents of the team", () =>
        admin.flows.openAgents(team));
      await test.step('admin opens "More actions" of the agent, sees exactly "Edit", "Deactivate", "Duplicate", "Copy to…" and "Delete", and closes the menu', () =>
        admin.pages.agents.expectCardActions(agent.name, [
          "Edit",
          "Deactivate",
          "Duplicate",
          "Copy to…",
          "Delete",
        ]));
    });

    test("The details of a card name the agent's template", async ({
      admin,
      testData,
    }) => {
      await test.step("admin opens the agents of the team", () =>
        admin.flows.openAgents(team));
      await test.step('admin hovers "Agent details" of the agent and sees the template of the test data', () =>
        admin.pages.agents.expectTemplateInDetails(
          agent.name,
          testData.agentTemplate,
        ));
    });
  });

  test.describe("The agents of a team can be sorted", () => {
    test('An editor sees the orders "Alphabetical", "Recently created" and "Recently updated"', async ({
      admin,
    }) => {
      await test.step("admin opens the agents of the team", () =>
        admin.flows.openAgents(team));
      await test.step('admin opens "Sort", sees exactly "Alphabetical", "Recently created" and "Recently updated", and closes it without choosing', () =>
        admin.pages.agents.expectSortOrders([
          "Alphabetical",
          "Recently created",
          "Recently updated",
        ]));
    });

    test("Agents are listed in the chosen order", async ({ admin, agents }) => {
      const second =
        await test.step("admin creates a second agent in the team", () =>
          agents.create(admin, team, "agent second"));
      await test.step('admin opens the agents of the team and sorts them by "Alphabetical"', () =>
        agents.sort(admin, team, "Alphabetical"));
      await test.step("admin sees the first agent before the second", () =>
        admin.pages.agents.expectListedBefore(agent.name, second.name));
      await test.step('admin sorts the agents by "Recently created"', () =>
        agents.sort(admin, team, "Recently created"));
      await test.step("admin sees the second agent before the first", () =>
        admin.pages.agents.expectListedBefore(second.name, agent.name));
    });
  });

  test.describe("An editor starts a conversation with an agent from its card", () => {
    test('A new conversation shows "Prompt library" among its chat actions', async ({
      admin,
    }) => {
      await test.step('admin opens a conversation with the agent from the "Chat" of its card', () =>
        admin.flows.openConversation(team, agent.name));
      await test.step('admin opens the chat actions, sees "Prompt library" and closes them', () =>
        admin.pages.chat.expectChatAction("Prompt library"));
    });

    for (const panel of [
      "Prompt library",
      "Full reasoning",
      "Debug",
    ] as const) {
      test(`A new conversation shows the panel "${panel}"`, async ({
        admin,
      }) => {
        await test.step('admin opens a conversation with the agent from the "Chat" of its card', () =>
          admin.flows.openConversation(team, agent.name));
        await test.step(`admin opens the panel "${panel}", sees it and closes it`, () =>
          admin.pages.chat.expectPanel(panel));
      });
    }
  });
});
