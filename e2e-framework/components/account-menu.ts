import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { step } from "../pages/step.ts";

/**
 * The account button appears after sign-in and acceptance of the terms, once
 * the page has loaded. Its accessible name ends in "'s account".
 */
export function accountMenuButton(page: Page): Locator {
  return page.getByRole("button", { name: /'s account$/ });
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

  constructor(page: Page) {
    this.page = page;
    this.trigger = accountMenuButton(page);
    this.menu = page.getByRole("menu");
    this.profile = this.menu.getByRole("menuitem", {
      name: "Profile",
      exact: true,
    });
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

  /** Opens the profile and waits for the browser to reach the profile page. */
  @step
  async openProfile(): Promise<void> {
    await this.open();
    await this.profile.click();
    await expect(this.page).toHaveURL(/\/settings$/);
  }
}
