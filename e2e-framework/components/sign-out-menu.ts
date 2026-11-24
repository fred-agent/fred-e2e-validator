import type { Locator, Page } from "@playwright/test";
import { SignInPage } from "../pages/sign-in-page.ts";
import { step } from "../pages/step.ts";
import { accountMenuButton } from "./account-menu.ts";

/**
 * "Disconnect" ends the account's sign-in session. Only the visitor fixture,
 * which starts with an empty browser context, provides this action.
 */
export class SignOutMenu {
  static readonly displayName = "Sign-out menu";
  private readonly page: Page;
  private readonly trigger: Locator;
  private readonly disconnect: Locator;
  private readonly signInPage: SignInPage;

  constructor(page: Page) {
    this.page = page;
    this.trigger = accountMenuButton(page);
    this.disconnect = page
      .getByRole("menu")
      .getByRole("menuitem", { name: "Disconnect", exact: true });
    this.signInPage = new SignInPage(page);
  }

  /** Chooses "Disconnect" and waits for the sign-in form. */
  @step
  async signOut(): Promise<void> {
    await this.trigger.click();
    await this.disconnect.click();
    await this.signInPage.expectShown();
  }
}
