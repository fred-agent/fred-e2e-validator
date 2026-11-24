// The folders of one test. `create` makes a folder at the top level of a
// space's resources through the resources page; the fixture's teardown
// deletes each folder, with what was uploaded to it, in a browser context of
// its own opened as the account that created it.
import type { AccountName } from "../config/accounts.ts";
import type { Space } from "../config/test-data.ts";
import type { Removal } from "./test.ts";
import type { User } from "./users.ts";

/** The space and unique name of a folder created by a test. */
export type Folder = Readonly<{ space: Space; name: string }>;

/**
 * The fixture records the folder and its creator before starting creation.
 * Seeing the folder in the list confirms that it exists.
 */
type RecordedFolder = {
  readonly folder: Folder;
  readonly account: AccountName;
  inFred: "no" | "not known" | "yes";
};

export type FoldersOptions = Readonly<{
  /** `e2e <word> <stamp>`, the name of what the test creates. */
  uniqueName: (word: string) => string;
}>;

export class Folders {
  private readonly options: FoldersOptions;
  private readonly recorded: RecordedFolder[] = [];

  constructor(options: FoldersOptions) {
    this.options = options;
  }

  /**
   * Records the folder, then creates it as the user in the space's
   * resources, which the user must be able to edit.
   */
  async create(user: User, space: Space, word: string): Promise<Folder> {
    const folder: Folder = Object.freeze({
      space,
      name: this.options.uniqueName(word),
    });
    const recorded: RecordedFolder = {
      folder,
      account: user.account.name,
      inFred: "no",
    };
    this.recorded.push(recorded);
    await user.flows.openResources(space);
    recorded.inFred = "not known";
    await user.pages.resources.createFolder(folder.name);
    recorded.inFred = "yes";
    return folder;
  }

  /** Deletes a folder the test created, as the user, in the space's resources. */
  async delete(user: User, folder: Folder): Promise<void> {
    await user.flows.openResources(folder.space);
    await user.pages.resources.deleteFolder(folder.name);
    for (const recorded of this.recorded)
      if (recorded.folder === folder) recorded.inFred = "not known";
  }

  /**
   * Each creator removes their folders newest first. A confirmed folder must
   * appear in the list. After an uncertain creation or a deletion, another
   * row confirms that the list has loaded before an absence is accepted.
   */
  removals(): Removal[] {
    return this.recorded
      .toReversed()
      .filter(({ inFred }) => inFred !== "no")
      .map(({ folder, account, inFred }) => ({
        title: `Delete the folder "${folder.name}" of "${folder.space.name}"`,
        account,
        remove: async (user) =>
          user.flows.deleteFolder(folder, { expected: inFred === "yes" }),
      }));
  }
}
