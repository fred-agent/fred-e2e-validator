import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { SIGN_IN_FAILED } from "../reporting/run-log.ts";
import { step } from "./step.ts";
import { FRED_START_TIMEOUT } from "./waits.ts";

/** The submit button appears once the sign-in form has loaded. */
export function signInButton(page: Page): Locator {
  return page.getByRole("button", { name: "Sign In", exact: true });
}

export class SignInPage {
  static readonly displayName = "Sign-in page";
  private readonly page: Page;
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByLabel("Username or email");
    this.password = page.getByLabel("Password", { exact: true });
    this.submit = signInButton(page);
  }

  /** The initial redirect to the sign-in form can take longer during startup. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.submit).toBeVisible({ timeout: FRED_START_TIMEOUT });
  }

  @step
  async signIn(account: Account): Promise<void> {
    await this.username.fill(account.username);
    await this.password.fill(account.password);
    await this.submit.click();
    await expect(this.submit, SIGN_IN_FAILED).toBeHidden();
  }
}
