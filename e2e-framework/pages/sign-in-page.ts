import { expect, type Locator, type Page } from "@playwright/test";
import {
  firstElement,
  lastElement,
  SignInActions,
  stepElement,
} from "../components/sign-in-actions.ts";
import type { Account } from "../config/accounts.ts";
import {
  isOptional,
  readSignInSteps,
  type SignInSteps,
} from "../config/sign-in-steps.ts";
import { SIGN_IN_FAILED, SIGN_IN_NOT_SHOWN } from "../reporting/run-log.ts";
import { step } from "./step.ts";
import { FRED_START_TIMEOUT } from "./waits.ts";

/** The environment's sign-in pages, as `sign-in.json` describes them. */
export class SignInPage {
  static readonly displayName = "Sign-in page";
  private readonly page: Page;
  private readonly steps: SignInSteps;
  private readonly actions: SignInActions;
  private readonly first: Locator;
  private readonly last: Locator;

  constructor(page: Page) {
    const steps = readSignInSteps();
    this.page = page;
    this.steps = steps;
    this.actions = new SignInActions(page);
    this.first = firstElement(page, steps);
    this.last = lastElement(page, steps);
  }

  /** The initial redirect to the sign-in pages can take longer during startup. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.first, SIGN_IN_NOT_SHOWN).toBeVisible({
      timeout: FRED_START_TIMEOUT,
    });
  }

  @step
  async signIn(account: Account): Promise<void> {
    const { actions } = this;
    for (const signInStep of this.steps) {
      if (
        isOptional(signInStep) &&
        !(await stepElement(this.page, signInStep).isVisible())
      )
        continue;
      if ("click" in signInStep) await actions.click(signInStep.click);
      else await actions.fill(signInStep.fill, signInStep.with, account);
    }
    await expect(this.last, SIGN_IN_FAILED).toBeHidden();
  }
}
