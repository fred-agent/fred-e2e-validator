import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { step } from "../pages/step.ts";
import { literal } from "./text-patterns.ts";

/**
 * Team dialogs show user search results in a list outside the dialog. Each
 * option reads "First Last (username)". Choosing one clears the search field.
 */
export class UserPicker {
  static readonly displayName = "User picker";
  private readonly page: Page;
  private readonly search: Locator;

  /** `scope` is the dialog that holds the search field. */
  constructor(page: Page, scope: Locator) {
    this.page = page;
    this.search = scope.getByRole("textbox", {
      name: "Enter a name, first name, or user ID",
      exact: true,
    });
  }

  /** The match of an account, by the username at the end of its label. */
  private option(account: Account): Locator {
    return this.page.getByRole("option", {
      name: new RegExp(`\\(${literal(account.username)}\\)$`),
    });
  }

  @step
  async choose(account: Account): Promise<void> {
    await this.search.fill(account.username);
    await this.option(account).click();
    await expect(this.search).toHaveValue("");
  }
}
