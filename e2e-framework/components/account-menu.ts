import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { step } from "../pages/step.ts";

/**
 * The account button appears after sign-in and acceptance of the terms, once
 * the page has loaded. Its accessible name ends in "'s account", or starts
 * with "Compte de " for an account whose language is French.
 */
export function accountMenuButton(page: Page): Locator {
  return page.getByRole("button", { name: /('s account$|^Compte de )/ });
}

/**
 * Every signed-in page shares the sidebar account menu, headed by the user's
 * name and email. Only the visitor fixture also provides the sign-out action.
 */
export class AccountMenu {
  static readonly displayName = "Account menu";
  private readonly page: Page;
  private readonly trigger: Locator;
  private readonly menu: Locator;
  private readonly profile: Locator;
  // The picture has no name: a decorative image, found by its element.
  private readonly picture: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trigger = accountMenuButton(page);
    this.menu = page.getByRole("menu");
    this.profile = this.menu.getByRole("menuitem", {
      name: /^(Profile|Profil)$/,
    });
    this.picture = this.trigger.locator("img");
  }

  private async open(): Promise<void> {
    await this.trigger.click();
    await expect(this.menu).toBeVisible();
  }

  private async close(): Promise<void> {
    await this.trigger.click();
    await expect(this.menu).toBeHidden();
  }

  /** Expects the menu to show the account's email, then closes it. */
  @step
  async expectSignedInAs(account: Account): Promise<void> {
    await this.open();
    await expect(this.menu).toContainText(account.email);
    await this.close();
  }

  /**
   * Expects the account's picture, which the browser has loaded: an image
   * that has not loaded, or failed to, has no width of its own.
   */
  @step
  async expectPicture(): Promise<void> {
    await expect(this.picture).toBeVisible();
    await expect(this.picture).not.toHaveJSProperty("naturalWidth", 0);
  }

  /** Expects the account's initials, shown without a picture. */
  @step
  async expectInitials(): Promise<void> {
    await expect(this.trigger).toHaveText(/^\p{L}{1,3}$/u);
    await expect(this.picture).toHaveCount(0);
  }

  /** Opens the profile and waits for the browser to reach the profile page. */
  @step
  async openProfile(): Promise<void> {
    await this.open();
    await this.profile.click();
    await expect(this.page).toHaveURL(/\/settings$/);
  }
}
