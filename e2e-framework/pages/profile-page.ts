import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { step } from "./step.ts";

/**
 * Profile settings use the labels on the interface preferences card and in the
 * Help Center.
 */
export type ProfileSetting = "theme" | "mode" | "language";

/** The choices of each setting with radio choices; the themes are each platform's own. */
const CHOICES: Readonly<Record<ProfileSetting, readonly string[]>> = {
  theme: [],
  mode: ["Light", "Dark", "System"],
  language: ["French", "English"],
};

/**
 * The signed-in user's profile, opened from the account menu: their account,
 * picture, theme, mode and language. "Back" returns to the page it was
 * opened from. The profile has no main landmark, so its elements are found
 * on the whole page by role and name.
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

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByText("Your profile", { exact: true });
    this.back = page.getByRole("button", { name: "Back", exact: true });
    this.settings = {
      theme: page.getByRole("button", { name: "UI theme", exact: true }),
      mode: page.getByRole("radiogroup", { name: "Theme", exact: true }),
      language: page.getByRole("radiogroup", {
        name: "Language",
        exact: true,
      }),
    };
  }

  /**
   * A text of the profile. The profile has no landmark around the account's
   * username, full name and email, so a text is found on the whole page; the
   * accounts' usernames differ from their emails.
   */
  private text(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.page).toHaveURL(/\/settings$/);
    await expect(this.title).toBeVisible();
  }

  /** Expects the profile of this account, shown by its email. */
  @step
  async expectAccount(account: Account): Promise<void> {
    await this.expectShown();
    await expect(this.text(account.email)).toBeVisible();
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

  /** Leaves the profile with "Back"; the profile then closes. */
  @step
  async leave(): Promise<void> {
    await this.back.click();
    await expect(this.title).toBeHidden();
  }
}
