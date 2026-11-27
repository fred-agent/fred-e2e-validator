import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { picturePath, type PictureFile } from "../config/uploads.ts";
import { step } from "./step.ts";

/**
 * Profile settings use the labels on the interface preferences card and in the
 * Help Center.
 */
export type ProfileSetting = "theme" | "mode" | "language";

const MODES = ["Light", "Dark", "System"] as const;
const THEMES = ["Pebble", "Cobalt", "Cloud"] as const;

/** The choices of "Theme", by their labels. */
export type ProfileMode = (typeof MODES)[number];

/** The built-in themes; a platform can hide some and add others. */
export type ProfileTheme = (typeof THEMES)[number];

/** The languages of the interface, by their English labels. */
export type ProfileLanguage = "French" | "English";

/** The theme that is on and the other built-in themes the platform offers. */
export type ThemeChoice = Readonly<{
  chosen: ProfileTheme;
  others: readonly ProfileTheme[];
}>;

/** The choices of each setting with radio choices; the themes are each platform's own. */
const CHOICES: Readonly<Record<ProfileSetting, readonly string[]>> = {
  theme: [],
  mode: MODES,
  language: ["French", "English"],
};

/** The title of the profile in each language. */
const TITLES: Readonly<Record<ProfileLanguage, string>> = {
  French: "Votre profil",
  English: "Your profile",
};

/**
 * The signed-in user's profile, opened from the account menu: their account,
 * picture, theme, mode and language. "Back" returns to the page it was
 * opened from. The profile has no main landmark, so its elements are found
 * on the whole page by role and name. The title, "Back" and the languages
 * are found in both languages, as a test can choose French.
 */
export class ProfilePage {
  static readonly displayName = "Profile page";
  private readonly page: Page;
  private readonly title: Locator;
  private readonly back: Locator;
  /**
   * The "UI theme" selector appears when multiple themes are available. The
   * mode choices use the label "Theme".
   */
  private readonly settings: Readonly<Record<ProfileSetting, Locator>>;
  // The themes "UI theme" opens.
  private readonly themes: Locator;
  private readonly languages: Readonly<Record<ProfileLanguage, Locator>>;
  private readonly importPictureButton: Locator;
  // Offered only while the account has a picture.
  private readonly deletePictureButton: Locator;
  // Shown instead of a picture.
  private readonly noPicture: Locator;
  private readonly cropDialog: Locator;
  private readonly deleteDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByText(/^(Your profile|Votre profil)$/);
    this.back = page.getByRole("button", { name: /^(Back|Retour)$/ });
    const languageGroup = page.getByRole("radiogroup", {
      name: /^(Language|Langue)$/,
    });
    this.settings = {
      theme: page.getByRole("button", { name: "UI theme", exact: true }),
      mode: page.getByRole("radiogroup", { name: "Theme", exact: true }),
      language: languageGroup,
    };
    this.themes = page.getByRole("listbox");
    this.languages = {
      French: languageGroup.getByRole("radio", {
        name: /^(French|Français)$/,
      }),
      English: languageGroup.getByRole("radio", {
        name: /^(English|Anglais)$/,
      }),
    };
    this.importPictureButton = page.getByRole("button", {
      name: "Import",
      exact: true,
    });
    this.deletePictureButton = page.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    this.noPicture = page.getByText("No picture", { exact: true });
    this.cropDialog = page.getByRole("dialog", {
      name: "Crop avatar",
      exact: true,
    });
    this.deleteDialog = page.getByRole("alertdialog", {
      name: "Delete your profile picture?",
      exact: true,
    });
  }

  /**
   * A text of the profile. The profile has no landmark around the account's
   * username, full name and email, so a text is found on the whole page.
   */
  private text(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** A theme "UI theme" offers, or the one that is on. */
  private theme(name: ProfileTheme, selected?: boolean): Locator {
    return this.themes.getByRole("option", {
      name,
      exact: true,
      ...(selected === undefined ? {} : { selected }),
    });
  }

  private mode(name: ProfileMode): Locator {
    return this.settings.mode.getByRole("radio", { name, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.page).toHaveURL(/\/settings$/);
    await expect(this.title).toBeVisible();
  }

  /**
   * Expects the profile of this account, shown by its email. An identity
   * provider whose username is the email, such as Microsoft Entra ID with a
   * UPN that is the address, shows that text twice.
   */
  @step
  async expectAccount(account: Account): Promise<void> {
    await this.expectShown();
    await expect(this.text(account.email).first()).toBeVisible();
  }

  /**
   * Expects a setting's control and the choices it offers: the "UI theme"
   * select for the theme, the radio choices for the mode and the language.
   */
  @step
  async expectSetting(name: ProfileSetting): Promise<void> {
    const control = this.settings[name];
    await expect(control).toBeVisible();
    for (const choice of CHOICES[name])
      await expect(
        control.getByRole("radio", { name: choice, exact: true }),
      ).toBeVisible();
  }

  /**
   * The theme that is on and the other built-in themes, from the list of
   * "UI theme".
   */
  @step
  async readThemes(): Promise<ThemeChoice> {
    await this.settings.theme.click();
    await expect(this.themes).toBeVisible();
    let chosen: ProfileTheme | undefined;
    const others: ProfileTheme[] = [];
    for (const name of THEMES)
      if (await this.theme(name, true).isVisible()) chosen = name;
      else if (await this.theme(name).isVisible()) others.push(name);
    await this.page.keyboard.press("Escape");
    await expect(this.themes).toBeHidden();
    if (chosen === undefined)
      throw new Error(
        `The theme of the account is not one of Fred's own, ${THEMES.join(", ")}, so it could not be restored.`,
      );
    return { chosen, others };
  }

  @step
  async chooseTheme(name: ProfileTheme): Promise<void> {
    await this.settings.theme.click();
    await this.theme(name).click();
    await this.expectTheme(name);
  }

  /** Expects a theme to be on. */
  @step
  async expectTheme(name: ProfileTheme): Promise<void> {
    await expect(this.settings.theme).toContainText(name);
  }

  /** The mode that is on. */
  @step
  async readMode(): Promise<ProfileMode> {
    await expect(
      this.settings.mode.getByRole("radio", { checked: true }),
    ).toBeVisible();
    for (const name of MODES)
      if (await this.mode(name).isChecked()) return name;
    throw new Error(
      `The profile shows none of the modes ${MODES.join(", ")} chosen.`,
    );
  }

  @step
  async chooseMode(name: ProfileMode): Promise<void> {
    await this.mode(name).click();
    await this.expectMode(name);
  }

  /** Expects a mode to be on. */
  @step
  async expectMode(name: ProfileMode): Promise<void> {
    await expect(this.mode(name)).toBeChecked();
  }

  /** Chooses a language, in which the profile then shows its title. */
  @step
  async chooseLanguage(name: ProfileLanguage): Promise<void> {
    await this.languages[name].click();
    await this.expectLanguage(name);
  }

  /** Expects a language to be on and the profile to be in it. */
  @step
  async expectLanguage(name: ProfileLanguage): Promise<void> {
    await expect(this.languages[name]).toBeChecked();
    await expect(this.text(TITLES[name])).toBeVisible();
  }

  @step
  async expectNoPicture(): Promise<void> {
    await expect(
      this.noPicture,
      "The account has a profile picture, which the test could not put back",
    ).toBeVisible();
  }

  /** Imports a picture and saves its crop; the profile then offers to delete it. */
  @step
  async importPicture(file: PictureFile): Promise<void> {
    const fileChooser = this.page.waitForEvent("filechooser");
    await this.importPictureButton.click();
    await (await fileChooser).setFiles(picturePath(file));
    await this.cropDialog
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await expect(this.cropDialog).toBeHidden();
    await expect(this.deletePictureButton).toBeVisible();
  }

  @step
  async deletePicture(): Promise<void> {
    await this.deletePictureButton.click();
    await this.deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(this.noPicture).toBeVisible();
  }

  /** Deletes the picture, unless the profile shows that there is none. */
  @step
  async deletePictureIfShown(): Promise<void> {
    await expect(
      this.deletePictureButton.or(this.noPicture).first(),
    ).toBeVisible();
    if (await this.deletePictureButton.isVisible()) await this.deletePicture();
  }

  /** Leaves the profile with "Back"; the profile then closes. */
  @step
  async leave(): Promise<void> {
    await this.back.click();
    await expect(this.title).toBeHidden();
  }
}
