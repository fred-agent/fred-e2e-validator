// The profile settings a test changes. Each method changes one through the
// profile page; the fixture's teardown restores the value read before the
// change, in a browser context of its own opened as the account.
import type { AccountName } from "../config/accounts.ts";
import type { PictureFile } from "../config/uploads.ts";
import type {
  ProfileLanguage,
  ProfileMode,
  ProfileTheme,
} from "../pages/profile-page.ts";
import type { Removal } from "./test.ts";
import type { User } from "./users.ts";

/** A mode that differs from the one that is on. */
const OTHER_MODE: Readonly<Record<ProfileMode, ProfileMode>> = {
  Light: "Dark",
  Dark: "Light",
  System: "Dark",
};

const OTHER_LANGUAGE: Readonly<Record<ProfileLanguage, ProfileLanguage>> = {
  French: "English",
  English: "French",
};

export class Preferences {
  private readonly recorded: Removal[] = [];

  /** Chooses a built-in theme that is not on, and leaves the profile. */
  async chooseAnotherTheme(user: User): Promise<ProfileTheme> {
    const { profile } = user.pages;
    await user.flows.openProfile();
    const { chosen, others } = await profile.readThemes();
    const [next] = others;
    if (next === undefined)
      throw new Error(
        `The platform offers no theme of Fred beside "${chosen}".`,
      );
    this.record(user.account.name, `the theme "${chosen}"`, async (restoring) =>
      this.restore(
        restoring,
        async () => restoring.pages.profile.chooseTheme(chosen),
        async () => restoring.pages.profile.expectTheme(chosen),
      ),
    );
    await profile.chooseTheme(next);
    await profile.leave();
    return next;
  }

  /** Chooses a mode that is not on, and leaves the profile. */
  async chooseAnotherMode(user: User): Promise<ProfileMode> {
    const { profile } = user.pages;
    await user.flows.openProfile();
    const chosen = await profile.readMode();
    const next = OTHER_MODE[chosen];
    this.record(user.account.name, `the mode "${chosen}"`, async (restoring) =>
      this.restore(
        restoring,
        async () => restoring.pages.profile.chooseMode(chosen),
        async () => restoring.pages.profile.expectMode(chosen),
      ),
    );
    await profile.chooseMode(next);
    await profile.leave();
    return next;
  }

  /** Chooses a language that is not on, and leaves the profile. */
  async chooseLanguage(user: User, language: ProfileLanguage): Promise<void> {
    const { profile } = user.pages;
    const before = OTHER_LANGUAGE[language];
    await user.flows.openProfile();
    await profile.expectLanguage(before);
    this.record(
      user.account.name,
      `the language "${before}"`,
      async (restoring) =>
        this.restore(
          restoring,
          async () => restoring.pages.profile.chooseLanguage(before),
          async () => restoring.pages.profile.expectLanguage(before),
        ),
    );
    await profile.chooseLanguage(language);
    await profile.leave();
  }

  /** Imports a picture for an account that has none, and leaves the profile. */
  async importPicture(user: User, file: PictureFile): Promise<void> {
    const { profile } = user.pages;
    await user.flows.openProfile();
    await profile.expectNoPicture();
    this.record(
      user.account.name,
      "the profile without a picture",
      async (restoring) =>
        this.restore(
          restoring,
          async () => restoring.pages.profile.deletePictureIfShown(),
          async () => restoring.pages.profile.expectNoPicture(),
        ),
    );
    await profile.importPicture(file);
    await profile.leave();
  }

  /** The restorations of the settings the test changed, newest first. */
  removals(): Removal[] {
    return this.recorded.toReversed();
  }

  private record(
    account: AccountName,
    what: string,
    restore: (user: User) => Promise<void>,
  ): void {
    this.recorded.push({
      title: `Restore ${what}`,
      account,
      remove: restore,
    });
  }

  /**
   * Restores a setting from the page the restoration opened, which may be in
   * French, once the bootstrap response has loaded, then loads the home page
   * again, opens the profile and expects the setting.
   */
  private async restore(
    user: User,
    choose: () => Promise<void>,
    expectChosen: () => Promise<void>,
  ): Promise<void> {
    const { home, accountMenu, profile } = user.pages;
    await home.waitForBootstrap();
    await accountMenu.openProfile();
    await profile.expectShown();
    await choose();
    await profile.leave();
    await user.flows.openProfile();
    await expectChosen();
  }
}
