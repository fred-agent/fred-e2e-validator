import { expect, type Locator, type Page } from "@playwright/test";
import { accountMenuButton } from "../components/account-menu.ts";
import { lastElement } from "../components/sign-in-actions.ts";
import { readSignInSteps } from "../config/sign-in-steps.ts";
import { FRED_NOT_SHOWN, SIGN_IN_FAILED } from "../reporting/run-log.ts";
import { step } from "./step.ts";
import { FRED_START_TIMEOUT } from "./waits.ts";

/**
 * The heading is shared across environments. Each environment supplies its own
 * terms.
 */
export function termsTitle(page: Page): Locator {
  return page.getByText("Terms of Service (ToS)", { exact: true });
}

/**
 * After sign-in, an account with outstanding terms sees this page. Scrolling
 * to the end enables the accept button.
 */
export class TermsPage {
  static readonly displayName = "Terms page";
  private readonly page: Page;
  private readonly title: Locator;
  private readonly accept: Locator;
  private readonly lastParagraph: Locator;
  /** The signed-in account menu, which follows the terms or comes instead of them. */
  private readonly signedIn: Locator;
  /** The last sign-in page, which comes back when it refuses the account. */
  private readonly signInForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = termsTitle(page);
    this.accept = page.getByRole("button", {
      name: "Accept the TOS",
      exact: true,
    });
    // Depends on position: the terms text ends the page, so the page's last
    // paragraph is the end of the terms, which the reader scrolls to.
    this.lastParagraph = page.getByRole("paragraph").last();
    this.signedIn = accountMenuButton(page);
    this.signInForm = lastElement(page, readSignInSteps());
  }

  /**
   * Waits through startup for the terms or the signed-in menu and accepts any
   * outstanding terms. Returning to the last sign-in page means the session was
   * refused.
   */
  @step
  async acceptIfShown(): Promise<void> {
    await expect(
      this.signedIn.or(this.title).or(this.signInForm).first(),
      FRED_NOT_SHOWN,
    ).toBeVisible({ timeout: FRED_START_TIMEOUT });
    await expect(this.signInForm, SIGN_IN_FAILED).toBeHidden();
    await expect(
      this.signedIn.or(this.title).first(),
      FRED_NOT_SHOWN,
    ).toBeVisible({ timeout: FRED_START_TIMEOUT });
    if (!(await this.title.isVisible())) return;
    await this.lastParagraph.scrollIntoViewIfNeeded();
    await expect(this.accept).toBeEnabled();
    await this.accept.click();
    await expect(this.title).toBeHidden();
  }
}
