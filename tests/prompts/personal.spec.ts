// Personal prompts: a member keeps reusable prompts in their personal space:
// they create, edit, duplicate and delete them, find them by search and
// favorites, and give them a command. Source: Help Center, "Prompts" and
// "Commands"; the new prompt form, whose "Create" needs a name and a prompt
// text, and the duplicate dialog come from the prompts page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Personal prompts", { tag: "@prompt" }, () => {
  test.describe("A member creates prompts in their personal space", () => {
    test(
      'A member sees "Create prompt" in the personal space',
      { tag: "@preprod" },
      async ({ member, testData }) => {
        await test.step("member opens the prompts of the test space and reloads them", async () => {
          await member.flows.openSpaceSection(testData.space, "Prompts");
          await member.pages.prompts.reloadAndExpectPromptList();
        });
        await test.step('member sees "Create prompt"', () =>
          member.pages.prompts.expectButtonVisible("Create prompt"));
      },
    );
  });

  test.describe("A prompt needs content before it can be created", () => {
    test(
      "A member cannot create an empty prompt",
      { tag: "@preprod" },
      async ({ member, testData }) => {
        await test.step("member opens the prompts of the test space and reloads them", async () => {
          await member.flows.openSpaceSection(testData.space, "Prompts");
          await member.pages.prompts.reloadAndExpectPromptList();
        });
        await test.step('member opens "Create prompt", sees the new prompt form empty with "Create" disabled and cancels it', () =>
          member.pages.prompts.expectEmptyPromptRefused());
      },
    );
  });

  test.describe("A member creates, edits and deletes their prompts", () => {
    test(
      "A created prompt is listed",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        const prompt =
          await test.step("member creates a prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt"));
        await test.step("member opens the prompts of the test space again and sees the prompt", async () => {
          await member.flows.openPrompts(testData.space);
          await member.pages.prompts.expectListed(prompt.name);
        });
      },
    );

    test(
      "An edited prompt shows its new text",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        const prompt =
          await test.step("member creates a prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt"));
        await test.step("member changes the text of the prompt", () =>
          member.pages.prompts.replaceText(prompt, "List the key points."));
        await test.step("member opens the prompts of the test space again, opens the prompt and sees its new text", async () => {
          await member.flows.openPrompts(testData.space);
          await member.pages.prompts.expectText(
            prompt.name,
            "List the key points.",
          );
        });
      },
    );

    test(
      "A deleted prompt is no longer listed",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        const prompt =
          await test.step("member creates a prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt"));
        await test.step("member opens the prompts of the test space and deletes the prompt", () =>
          prompts.delete(member, prompt));
        await test.step("member opens the prompts of the test space again and does not see the prompt", async () => {
          await member.flows.openPrompts(testData.space);
          await member.pages.prompts.expectNotListed(prompt.name);
        });
      },
    );
  });

  test.describe("A member duplicates their prompts", () => {
    test(
      "A duplicate holds the whole text without a command, which stays with the original",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        // Longer than a card shows, with its own ending; it starts with a word.
        const text =
          "Read the whole document, list each of its sections with the main point it makes, note every date, name and figure it gives, compare its conclusion with its introduction, and finish your answer with the words end of the full prompt text.";
        const created =
          await test.step("member creates a prompt with a command in the test space", () =>
            prompts.create(member, testData.space, "prompt source", {
              command: true,
            }));
        const source =
          await test.step("member changes the text of the prompt to a text longer than its card shows", async () => {
            await member.pages.prompts.replaceText(created, text);
            return { ...created, text };
          });
        const copy =
          await test.step("member reopens the prompts of the test space and duplicates the prompt from its card under a new name", () =>
            prompts.duplicate(member, source, "prompt copy"));
        await test.step("member opens the prompts of the test space again, opens the copy and sees its name and whole text without a command", async () => {
          await member.flows.openPrompts(testData.space);
          await member.pages.prompts.expectDetail(copy);
        });
        await test.step("member opens the prompt and sees its name, its whole text and its command", () =>
          member.pages.prompts.expectDetail(source));
      },
    );
  });

  test.describe("A member finds prompts by search and by favorites", () => {
    test(
      "A search lists only the matching prompt",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        const found =
          await test.step("member creates a prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt found"));
        const other =
          await test.step("member creates a second prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt other"));
        await test.step("member searches the prompts for the first prompt's name", () =>
          member.pages.prompts.search(found.name));
        await test.step("member sees the first prompt and not the second", () =>
          member.pages.prompts.expectListedWithout(found.name, other.name));
      },
    );

    test(
      "The favorites filter lists only the prompts marked as favorite",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        const favorite =
          await test.step("member creates a prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt favorite"));
        const other =
          await test.step("member creates a second prompt in the test space", () =>
            prompts.create(member, testData.space, "prompt other"));
        await test.step("member marks the first prompt as a favorite and reloads the prompts", () =>
          member.pages.prompts.addToFavoritesAndReload(favorite.name));
        await test.step("member shows only the favorite prompts", () =>
          member.pages.prompts.showOnlyFavorites());
        await test.step("member sees the first prompt and not the second", () =>
          member.pages.prompts.expectListedWithout(favorite.name, other.name));
      },
    );
  });

  test.describe("Favorites belong to each user", { tag: "@team" }, () => {
    test(
      "A second user does not see the first user's favorite",
      { tag: "@preprod" },
      async ({ admin, secondUser, teams, prompts }) => {
        const team =
          await test.step("admin creates a team with secondUser as a member, in which admin also holds the Editor role", () =>
            teams.create("favorites", {
              members: ["secondUser"],
              roles: { admin: ["Editor"] },
            }));
        const prompt =
          await test.step("admin creates a prompt in the team", () =>
            prompts.create(admin, team, "prompt"));
        await test.step("admin marks the prompt as a favorite and reloads the prompts", () =>
          admin.pages.prompts.addToFavoritesAndReload(prompt.name));
        await test.step("secondUser opens the prompts of the team", () =>
          secondUser.flows.openPrompts(team));
        await test.step("secondUser sees the prompt not marked as a favorite", () =>
          secondUser.pages.prompts.expectNotFavorite(prompt.name));
      },
    );
  });

  test.describe("A prompt's command follows the command rules", () => {
    test(
      "A command that another prompt carries is refused",
      { tag: "@preprod" },
      async ({ member, prompts, testData }) => {
        const prompt =
          await test.step("member creates a prompt with a command in the test space", () =>
            prompts.create(member, testData.space, "prompt command", {
              command: true,
            }));
        await test.step("member gives a second prompt the same command, is told that another prompt uses it and closes the form unsaved", () =>
          member.pages.prompts.expectCommandRefused(
            prompts.withCommandOf(member, prompt, "prompt second"),
          ));
      },
    );
  });
});
