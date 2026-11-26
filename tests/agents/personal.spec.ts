// Personal agents: a member keeps agents in their personal space, duplicates
// them and starts conversations with them, whose prompt library lists the
// member's personal prompts. Source: Help Center, "Agents" and
// "Conversations"; the duplicate's own description and the prompt library's
// list come from the agents and conversation pages.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Personal agents", { tag: "@agent" }, () => {
  test.describe("A duplicate is an agent of its own", () => {
    test(
      "A duplicate starts with the original's description and keeps its own after an edit",
      { tag: "@preprod" },
      async ({ member, agents, testData }) => {
        const original = "Written for the original agent.";
        const edited = "Written for the duplicate agent.";
        const agent =
          await test.step("member creates an agent in the test space", () =>
            agents.create(member, testData.space, "agent"));
        await test.step("member opens the agents of the test space and changes the description of the agent", async () => {
          await member.flows.openAgents(testData.space);
          await member.pages.agents.setDescription(agent.name, original);
        });
        const duplicate =
          await test.step("member opens the agents of the test space again and duplicates the agent under a new name", () =>
            agents.duplicate(member, agent, "agent duplicate"));
        await test.step("member reloads the agents, opens the form of the duplicate, sees the description of the agent and closes the form unsaved", () =>
          member.pages.agents.reloadAndExpectDescription(
            duplicate.name,
            original,
          ));
        await test.step("member changes the description of the duplicate", () =>
          member.pages.agents.setDescription(duplicate.name, edited));
        await test.step("member reloads the agents, opens the form of the duplicate, sees its new description and closes the form unsaved", () =>
          member.pages.agents.reloadAndExpectDescription(
            duplicate.name,
            edited,
          ));
        await test.step("member reloads the agents, opens the form of the agent, sees its first description and closes the form unsaved", () =>
          member.pages.agents.reloadAndExpectDescription(agent.name, original));
      },
    );
  });

  test.describe(
    "A conversation's prompt library lists the member's personal prompts",
    { tag: ["@chat", "@prompt"] },
    () => {
      test(
        'A new conversation with a personal agent lists a new personal prompt in "Prompt library"',
        { tag: "@preprod" },
        async ({ member, personalAgent, prompts, testData }) => {
          const agent =
            await test.step("member creates an agent in the test space", () =>
              personalAgent.create("agent"));
          const prompt =
            await test.step("member creates a prompt in the test space", () =>
              prompts.create(member, testData.space, "prompt"));
          await test.step('member opens a conversation with the agent from the "Chat" of its card', () =>
            member.flows.openConversation(testData.space, agent.name));
          await test.step('member opens the panel "Prompt library", sees the prompt in it and closes the panel', () =>
            member.pages.chat.expectPromptInLibrary(prompt.name));
          await test.step("member sees the composer empty", () =>
            member.pages.chat.expectComposerEmpty());
        },
      );
    },
  );
});
