import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { step } from "../pages/step.ts";
import type { TeamRole } from "../pages/team-members-page.ts";
import { DataTable } from "./data-table.ts";

/**
 * The member table of a team's members page, a data table whose row is
 * filtered by the member's username. Each row has one toggle button per
 * role, pressed while the member holds it; a nominated admin who has not
 * accepted the admin charter has "Admin (pending)" instead.
 */
export class MemberTable {
  static readonly displayName = "Member table";
  private readonly page: Page;
  private readonly table: DataTable;

  constructor(page: Page) {
    this.page = page;
    this.table = new DataTable(page);
  }

  private row(account: Account): Locator {
    return this.table.row(account.username);
  }

  private role(account: Account, role: TeamRole): Locator {
    return this.row(account).getByRole("button", { name: role, exact: true });
  }

  /**
   * Every team lists its admin and all members load together, so one visible
   * row signals that the table is complete.
   */
  @step
  async expectLoaded(): Promise<void> {
    await expect(this.table.rows.first()).toBeVisible();
  }

  /** Whether the loaded table lists an account. */
  @step
  async lists(account: Account): Promise<boolean> {
    await this.expectLoaded();
    return this.row(account).isVisible();
  }

  @step
  async expectListed(account: Account): Promise<void> {
    await expect(this.row(account)).toBeVisible();
  }

  @step
  async expectRole(account: Account, role: TeamRole): Promise<void> {
    await expect(this.role(account, role)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }

  /**
   * Gives a listed member a role they do not hold. The role button is a
   * toggle, so a member who already holds the role is an error, not a click
   * that would take it away.
   */
  @step
  async grant(account: Account, role: TeamRole): Promise<void> {
    const button = this.role(account, role);
    await expect(button).toBeVisible();
    if ((await button.getAttribute("aria-pressed")) === "true")
      throw new Error(`"${account.name}" already holds the role ${role}.`);
    await button.click();
    await this.expectRole(account, role);
  }
}
