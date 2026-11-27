// The prompts of one test. `create` makes a prompt of a space through the
// prompts page and `duplicate` copies one there; the fixture's teardown
// deletes each prompt in a browser context of its own opened as the account
// that created it.
import type { AccountName } from "../config/accounts.ts";
import type { Space } from "../config/test-data.ts";
import type { Removal } from "./test.ts";
import type { User } from "./users.ts";

/**
 * The space, unique name and text of a prompt created by a test, and its
 * command when it has one.
 */
export type Prompt = Readonly<{
  space: Space;
  name: string;
  text: string;
  command?: string;
}>;

export type PromptOptions = Readonly<{
  /** Gives the prompt a command that no other prompt carries. */
  command?: boolean;
}>;

/** The text of every prompt the fixture creates. */
const TEXT = "Summarize the document in three sentences.";

/**
 * The fixture records the prompt and its creator before starting creation.
 * Seeing the prompt in the list confirms that it exists.
 */
type RecordedPrompt = {
  readonly prompt: Prompt;
  readonly account: AccountName;
  inFred: "no" | "not known" | "yes";
};

export type PromptsOptions = Readonly<{
  /** `e2e <word> <stamp>`, the name of what the test creates. */
  uniqueName: (word: string) => string;
}>;

export class Prompts {
  private readonly options: PromptsOptions;
  private readonly recorded: RecordedPrompt[] = [];

  constructor(options: PromptsOptions) {
    this.options = options;
  }

  /**
   * Records the prompt, then creates it as the user in the space's prompts,
   * which the user must be able to edit.
   */
  async create(
    user: User,
    space: Space,
    word: string,
    { command = false }: PromptOptions = {},
  ): Promise<Prompt> {
    const name = this.options.uniqueName(word);
    const recorded = this.record(user, {
      space,
      name,
      text: TEXT,
      // A command holds lower-case letters, digits, "-" and "_".
      ...(command ? { command: name.replace(/[^a-z0-9]+/g, "-") } : {}),
    });
    await user.flows.openPrompts(space);
    recorded.inFred = "not known";
    await user.pages.prompts.create(recorded.prompt);
    recorded.inFred = "yes";
    return recorded.prompt;
  }

  /**
   * Records the copy, then duplicates a prompt as the user from its card in
   * its space under a new name. The copy holds the prompt's text, as the
   * caller passes it, and no command. The copy is newer than the source, so
   * its removal comes first.
   */
  async duplicate(user: User, prompt: Prompt, word: string): Promise<Prompt> {
    const recorded = this.record(user, {
      space: prompt.space,
      name: this.options.uniqueName(word),
      text: prompt.text,
    });
    await user.flows.openPrompts(prompt.space);
    recorded.inFred = "not known";
    await user.pages.prompts.duplicate(prompt.name, recorded.prompt.name);
    recorded.inFred = "yes";
    return recorded.prompt;
  }

  /**
   * Records a prompt with the command of another one, which the test submits
   * itself and the application refuses; its removal deletes it if it is listed.
   */
  withCommandOf(user: User, other: Prompt, word: string): Prompt {
    const recorded = this.record(user, {
      ...other,
      name: this.options.uniqueName(word),
    });
    recorded.inFred = "not known";
    return recorded.prompt;
  }

  /** Deletes a prompt the test created, as the user, in the space's prompts. */
  async delete(user: User, prompt: Prompt): Promise<void> {
    await user.flows.openPrompts(prompt.space);
    await user.pages.prompts.delete(prompt.name);
    for (const recorded of this.recorded)
      if (recorded.prompt === prompt) recorded.inFred = "not known";
  }

  private record(user: User, prompt: Prompt): RecordedPrompt {
    const recorded: RecordedPrompt = {
      prompt: Object.freeze(prompt),
      account: user.account.name,
      inFred: "no",
    };
    this.recorded.push(recorded);
    return recorded;
  }

  /**
   * The removals of the prompts, newest first. A confirmed prompt must be
   * listed; another one is deleted if the space's prompts list it.
   */
  removals(): Removal[] {
    return this.recorded
      .toReversed()
      .filter(({ inFred }) => inFred !== "no")
      .map(({ prompt, account, inFred }) => ({
        title: `Delete the prompt "${prompt.name}" of "${prompt.space.name}"`,
        account,
        remove: async (user) => {
          await user.flows.openPrompts(prompt.space);
          if (inFred === "yes") await user.pages.prompts.delete(prompt.name);
          else await user.pages.prompts.deleteIfListed(prompt.name);
        },
      }));
  }
}
