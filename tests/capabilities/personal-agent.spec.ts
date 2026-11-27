// Capabilities of a personal agent: a user turns capabilities on and off for
// an agent of their personal space, and the agent keeps them and their
// options. What an agent does with a capability shows only in a conversation.
// Source: Help Center, "Agents" and "Capabilities"; the agents of the
// personal space come from its agents page.
import { test, type Agent } from "../../e2e-framework/fixtures/test.ts";

const CAPABILITIES = [
  ["Attachments", ["@preprod"]],
  ["Team documents", ["@document", "@preprod"]],
  ["Access to the team wiki", ["@wiki", "@preprod"]],
  ["Generate a Word document", ["@docx", "@preprod"]],
  ["Generate a presentation", ["@ppt", "@preprod"]],
  ["Generate a web page (HTML/CSS)", ["@preprod"]],
] as const;

test.describe(
  "Capabilities of a personal agent",
  { tag: "@capability" },
  () => {
    let agent: Agent;

    test.beforeEach(async ({ member, agents, testData }) => {
      agent = await test.step("member creates an agent in the test space", () =>
        agents.create(member, testData.space, "capabilities"));
    });

    test.describe("An agent keeps a capability that is turned on", () => {
      for (const [capability, tags] of CAPABILITIES) {
        test(
          `"${capability}" is still on after the page is opened again`,
          { tag: [...tags] },
          async ({ member }) => {
            await test.step(`member turns on "${capability}" for the agent`, () =>
              member.pages.agents.turnOn(agent.name, capability));
            await test.step(`member reloads the agents, opens the form of the agent, sees "${capability}" on and closes the form unsaved`, () =>
              member.pages.agents.reloadAndExpectCapabilityOn(
                agent.name,
                capability,
              ));
          },
        );
      }
    });

    test.describe("An agent keeps a capability that is turned off", () => {
      for (const [capability, tags] of CAPABILITIES) {
        test(
          `"${capability}" turned off is off after the page is opened again`,
          { tag: [...tags] },
          async ({ member }) => {
            await test.step(`member turns on "${capability}" for the agent`, () =>
              member.pages.agents.turnOn(agent.name, capability));
            await test.step(`member reloads the agents and turns off "${capability}" for the agent`, () =>
              member.pages.agents.reloadAndTurnOff(agent.name, capability));
            await test.step(`member reloads the agents, opens the form of the agent, sees "${capability}" off and closes the form unsaved`, () =>
              member.pages.agents.reloadAndExpectCapabilityOff(
                agent.name,
                capability,
              ));
          },
        );
      }
    });

    test.describe(
      "An agent keeps several capabilities at once",
      { tag: "@docx" },
      () => {
        test(
          "The capabilities that are turned on are on and the others off",
          { tag: "@preprod" },
          async ({ member }) => {
            await test.step('member turns on "Attachments" and "Generate a Word document" for the agent', () =>
              member.pages.agents.turnOnAll(agent.name, [
                "Attachments",
                "Generate a Word document",
              ]));
            await test.step('member reloads the agents, opens the form of the agent, sees both on, "Team documents" and "Generate a web page (HTML/CSS)" off, and closes the form unsaved', () =>
              member.pages.agents.reloadAndExpectCapabilities(
                agent.name,
                ["Attachments", "Generate a Word document"],
                ["Team documents", "Generate a web page (HTML/CSS)"],
              ));
          },
        );
      },
    );

    test.describe("A change that is not saved is not kept", () => {
      test(
        "A capability turned on in a form that is cancelled is off",
        { tag: "@preprod" },
        async ({ member }) => {
          await test.step('member turns on "Attachments" for the agent and closes the form unsaved', () =>
            member.pages.agents.turnOnUnsaved(agent.name, "Attachments"));
          await test.step('member reloads the agents, opens the form of the agent, sees "Attachments" off and closes the form unsaved', () =>
            member.pages.agents.reloadAndExpectCapabilityOff(
              agent.name,
              "Attachments",
            ));
        },
      );
    });

    test.describe("An agent keeps the options of a capability", () => {
      test(
        'The wiki option "Read and propose" is kept',
        { tag: ["@preprod", "@wiki"] },
        async ({ member }) => {
          await test.step('member turns on "Access to the team wiki" for the agent with "Read and propose"', () =>
            member.pages.agents.turnOnWiki(agent.name, "Read and propose"));
          await test.step('member reloads the agents, opens the form of the agent, sees "Read and propose" and closes the form unsaved', () =>
            member.pages.agents.reloadAndExpectWikiMode(
              agent.name,
              "Read and propose",
            ));
        },
      );

      test(
        'The wiki option "Read only" chosen again is kept',
        { tag: ["@preprod", "@wiki"] },
        async ({ member }) => {
          await test.step('member turns on "Access to the team wiki" for the agent with "Read and propose"', () =>
            member.pages.agents.turnOnWiki(agent.name, "Read and propose"));
          await test.step('member reloads the agents and chooses "Read only" for the agent', () =>
            member.pages.agents.reloadAndChooseWikiMode(
              agent.name,
              "Read only",
            ));
          await test.step('member reloads the agents, opens the form of the agent, sees "Read only" and closes the form unsaved', () =>
            member.pages.agents.reloadAndExpectWikiMode(
              agent.name,
              "Read only",
            ));
        },
      );

      test(
        'The presentation option "Validate the plan before building" is kept',
        { tag: ["@ppt", "@preprod"] },
        async ({ member }) => {
          await test.step('member turns on "Generate a presentation" for the agent with "Validate the plan before building"', () =>
            member.pages.agents.turnOnPresentationWithPlan(agent.name));
          await test.step('member reloads the agents, opens the form of the agent, sees "Validate the plan before building" on and closes the form unsaved', () =>
            member.pages.agents.reloadAndExpectPresentationWithPlan(
              agent.name,
            ));
        },
      );
    });
  },
);
