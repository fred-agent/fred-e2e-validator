// Personal prompts: a member keeps reusable prompts in their personal space:
// they create, edit and delete them, find them by search and favorites, and
// give them a command. Source: Help Center, "Prompts" and "Commands";
// the new prompt form, whose "Create" needs a name and a prompt text, comes
// from the prompts page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Personal prompts", () => {
  test.describe("A member creates prompts in their personal space", () => {
    test('A member sees "Create prompt" in the personal space', async ({
      member,
      testData,
    }) => {
      await test.step("member opens the prompts of the test space and reloads them", async () => {
        await member.flows.openSpaceSection(testData.space, "Prompts");
        await member.pages.prompts.reloadAndExpectPromptList();
      });
      await test.step('member sees "Create prompt"', () =>
        member.pages.prompts.expectButtonVisible("Create prompt"));
    });
  });

  test.describe("A prompt needs content before it can be created", () => {
    test("A member cannot create an empty prompt", async ({
      member,
      testData,
    }) => {
      await test.step("member opens the prompts of the test space and reloads them", async () => {
        await member.flows.openSpaceSection(testData.space, "Prompts");
        await member.pages.prompts.reloadAndExpectPromptList();
      });
      await test.step('member opens "Create prompt", sees the new prompt form empty with "Create" disabled and cancels it', () =>
        member.pages.prompts.expectEmptyPromptRefused());
    });
  });

  test.describe("A member creates, edits and deletes their prompts", () => {
    test.fixme("A created prompt is listed", () => {
      // member opens the prompts of the test space and creates a prompt
      // member opens the prompts of the test space again and sees the prompt
    });

    test.fixme("An edited prompt shows its new text", () => {
      // member creates a prompt in the test space
      // member changes the text of the prompt to "List the key points."
      // member opens the prompt and sees the text "List the key points."
    });

    test.fixme("A deleted prompt is no longer listed", () => {
      // member creates a prompt in the test space
      // member deletes the prompt
      // member opens the prompts of the test space again and does not see the prompt
    });
  });

  test.describe("A member finds prompts by search and by favorites", () => {
    test.fixme("A search lists only the matching prompt", () => {
      // member creates two prompts in the test space
      // member searches the prompts of the test space for the first prompt's name
      // member sees only the first prompt among the prompts
    });

    test.fixme("The favorites filter lists only the prompts marked as favorite", () => {
      // member creates two prompts in the test space
      // member marks the first prompt as a favorite
      // member shows only the favorite prompts of the test space
      // member sees only the first prompt among the prompts
    });
  });

  test.describe("Favorites belong to each user", () => {
    test.fixme("A second user does not see the first user's favorite", () => {
      // admin creates a team with secondUser as a member, in which admin also holds the Editor role
      // admin creates a prompt in the team
      // admin marks the prompt as a favorite
      // secondUser opens the prompts of the team
      // secondUser sees the prompt not marked as a favorite
    });
  });

  test.describe("A prompt's command follows the command rules", () => {
    test.fixme("A command that breaks the rules is refused", () => {
      // member creates a prompt with the command "e2e-summary" in the test space
      // member opens "Create prompt" and gives a second prompt the command "e2e-summary"
      // member is told that the command is already used by another prompt
    });
  });
});
