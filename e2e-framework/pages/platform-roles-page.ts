import { expect, type Locator, type Page } from "@playwright/test";
import { expectButtonVisible } from "./buttons.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The buttons of the platform roles page a test checks by name. */
export type PlatformRolesButton = "Grant role";

/** The grant form enables "Grant role" once a user is selected. */
export class PlatformRolesPage {
  static readonly displayName = "Platform roles page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly searchUsers: Locator;
  // It grants the chosen role to the chosen users: nothing here clicks it.
  private readonly grantRole: Locator;
  private readonly buttons: Readonly<Record<PlatformRolesButton, Locator>>;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = pageHeading(page, "Platform roles");
    this.searchUsers = main.getByRole("textbox", {
      name: "Search and add users",
      exact: true,
    });
    this.grantRole = main.getByRole("button", {
      name: "Grant role",
      exact: true,
    });
    this.buttons = { "Grant role": this.grantRole };
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /** Expects the search of the users to grant a role to, ready to take a name. */
  @step
  async expectUserSearch(): Promise<void> {
    await expect(this.searchUsers).toBeVisible();
    await expect(this.searchUsers).toBeEnabled();
  }

  @step
  async expectButtonVisible(name: PlatformRolesButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }
}
