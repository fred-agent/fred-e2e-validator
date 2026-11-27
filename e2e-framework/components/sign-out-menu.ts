import type { Locator, Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import {
  readSignOutSteps,
  type SignOutSteps,
} from "../config/sign-in-steps.ts";
import { SignInPage } from "../pages/sign-in-page.ts";
import { step } from "../pages/step.ts";
import { accountMenuButton } from "./account-menu.ts";
import { SignInActions } from "./sign-in-actions.ts";

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
  private readonly steps: SignOutSteps;
  private readonly actions: SignInActions;

  constructor(page: Page) {
    this.page = page;
    this.trigger = accountMenuButton(page);
    this.disconnect = page
      .getByRole("menu")
      .getByRole("menuitem", { name: "Disconnect", exact: true });
    this.signInPage = new SignInPage(page);
    this.steps = readSignOutSteps();
    this.actions = new SignInActions(page);
  }

  /**
   * Chooses "Disconnect", carries out the steps of `sign-out.json`, such as
   * choosing the account to sign out of, and waits for the first sign-in page.
   */
  @step
  async signOut(account: Account): Promise<void> {
    await this.trigger.click();
    await this.disconnect.click();
    for (const signOutStep of this.steps) {
      if ("click" in signOutStep) await this.actions.click(signOutStep.click);
      else await this.actions.choose(signOutStep.choose, account);
    }
    await this.signInPage.expectShown();
  }
}
