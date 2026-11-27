import type { Locator, Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import {
  lastStep,
  leadingOptional,
  type AccountChoice,
  type AccountValue,
  type SignInStep,
  type SignInSteps,
} from "../config/sign-in-steps.ts";
import { step } from "../pages/step.ts";
import { literal } from "./text-patterns.ts";

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

/**
 * Visible once the first sign-in page has loaded: the element of the first
 * step, or of an optional step before it, such as an account picker's.
 */
export function firstElement(page: Page, steps: SignInSteps): Locator {
  const optional = leadingOptional(steps);
  const required = steps[optional.length] ?? steps[0];
  return optional
    .reduce(
      (element, step) => element.or(elementOf(page, step)),
      elementOf(page, required),
    )
    .first();
}

/** The element of a step, for a check of whether the page shows it. */
export function stepElement(page: Page, signInStep: SignInStep): Locator {
  return elementOf(page, signInStep);
}

/** Visible while the last sign-in page is open, as when it refuses the account. */
export function lastElement(page: Page, steps: SignInSteps): Locator {
  return elementOf(page, lastStep(steps));
}

/** The actions of the sign-in pages, and of the pages that end a sign-out. */
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

  /**
   * Clicks the account's user name or email where the page shows it alone,
   * as on a tile of an account picker, whatever its capitals.
   */
  @step
  async choose(value: AccountChoice, account: Account): Promise<void> {
    await this.page
      .getByText(new RegExp(`^${literal(account[value])}$`, "i"))
      .filter({ visible: true })
      .click();
  }
}
