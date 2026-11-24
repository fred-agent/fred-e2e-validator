// Platform prompts: a platform admin keeps the platform's own prompts: the
// platform system prompt every agent receives, and the instructions of the
// assistant that drafts agents. Source: Help Center, "Platform
// administration", which also states changing a platform prompt, restoring
// the creation assistant's default instructions, and choosing the model and
// reasoning of the creation assistant.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform prompts", () => {
  test.describe("A platform admin reads the platform's prompts", () => {
    for (const prompt of [
      "Creation assistant",
      "Platform system prompt",
    ] as const) {
      test.fixme(`A platform admin sees the text of the prompt "${prompt}"`, () => {
        // Planned: these UI tests cannot independently read the stored records for comparison.
        // admin opens the console section "Platform prompts" and chooses the prompt
        // admin sees the text of the prompt in "Prompt text"
      });
    }
  });

  test.describe("A platform admin changes a platform prompt", () => {
    test.fixme("A saved prompt text is shown again", () => {
      // Planned: changes a prompt every agent receives.
      // admin opens the console section "Platform prompts" and chooses "Platform system prompt"
      // admin saves a new text in "Prompt text"
      // admin opens the console section "Platform prompts" again and sees the new text in "Platform system prompt"
    });
  });

  test.describe("A platform admin restores the creation assistant's default instructions", () => {
    test.fixme("Restored instructions are the default ones again", () => {
      // Planned: changes a prompt every agent receives.
      // admin opens the console section "Platform prompts" and chooses "Creation assistant"
      // admin saves a new text in "Prompt text"
      // admin restores the default instructions
      // admin sees the default instructions in "Creation assistant"
    });
  });

  test.describe("A platform admin chooses the creation assistant's model and reasoning", () => {
    test.fixme("A chosen reasoning of the creation assistant is shown again", () => {
      // Planned: changes a prompt every agent receives.
      // admin opens the console section "Platform prompts" and chooses "Creation assistant"
      // admin saves the reasoning "Low" for the creation assistant
      // admin opens the console section "Platform prompts" again and sees the reasoning "Low" in "Creation assistant"
    });
  });
});
