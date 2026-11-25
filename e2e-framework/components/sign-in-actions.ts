import type { Locator, Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import {
  lastStep,
  type AccountValue,
  type SignInStep,
  type SignInSteps,
} from "../config/sign-in-steps.ts";
import { step } from "../pages/step.ts";

/** The one visible button, link or field of a step, by the whole text the page shows. */
function elementOf(page: Page, signInStep: SignInStep): Locator {
  if ("click" in signInStep) {
    const name = { name: signInStep.click, exact: true };
    return page
      .getByRole("button", name)
      .or(page.getByRole("link", name))
      .filter({ visible: true });
  }
  const { fill } = signInStep;
  return page
    .getByLabel(fill, { exact: true })
    .or(page.getByPlaceholder(fill, { exact: true }))
    .filter({ visible: true });
}

/** Visible once the first sign-in page has loaded. */
export function firstElement(page: Page, steps: SignInSteps): Locator {
  return elementOf(page, steps[0]);
}

/** Visible while the last sign-in page is open, as when it refuses the account. */
export function lastElement(page: Page, steps: SignInSteps): Locator {
  return elementOf(page, lastStep(steps));
}

/** The actions of the sign-in pages. */
export class SignInActions {
  static readonly displayName = "Sign-in actions";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  @step
  async click(text: string): Promise<void> {
    await elementOf(this.page, { click: text }).click();
  }

  @step
  async fill(
    text: string,
    value: AccountValue,
    account: Account,
  ): Promise<void> {
    await elementOf(this.page, { fill: text, with: value }).fill(
      account[value],
    );
  }
}
