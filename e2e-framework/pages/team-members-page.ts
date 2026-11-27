import { expect, type Locator, type Page } from "@playwright/test";
import { MemberTable } from "../components/member-table.ts";
import { ConfirmDialog } from "../components/dialogs.ts";
import {
  AddMembersDialog,
  InviteLinkDialog,
} from "../components/team-dialogs.ts";
import type { Account } from "../config/accounts.ts";
import { step } from "./step.ts";

/**
 * Assignable roles appear as toggle buttons. Every member also has a "Member"
 * badge.
 */
export type TeamRole = "Admin" | "Editor" | "Analyst";

/** What the page says when a change of the members is refused. */
const REFUSALS = {
  role: "Failed to update role",
  removal: "Failed to remove member",
} as const;

/** A team's members and their roles, in the team's settings. */
export class TeamMembersPage {
  static readonly displayName = "Team members page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly addMembers: Locator;
  private readonly search: Locator;
  private readonly inviteLink: Locator;
  private readonly moreActions: Locator;
  private readonly leaveTeamRefused: Locator;
  private readonly leaveTeamOption: Locator;
  private readonly table: MemberTable;
  private readonly confirmDialog: ConfirmDialog;
  private readonly addMembersDialog: AddMembersDialog;
  private readonly inviteLinkDialog: InviteLinkDialog;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", {
      level: 1,
      name: "Team members",
      exact: true,
    });
    this.addMembers = page
      .getByRole("main")
      .getByRole("button", { name: "Add members", exact: true });
    this.search = page.getByRole("textbox", {
      name: "Search for a member",
      exact: true,
    });
    this.inviteLink = page.getByRole("button", {
      name: "Invite link",
      exact: true,
    });
    this.moreActions = page
      .getByRole("main")
      .getByRole("button", { name: "More actions", exact: true });
    // Named by its label followed by why it is disabled.
    this.leaveTeamRefused = page.getByRole("listbox").getByRole("option", {
      name: "Leave team You are the only admin of this team — promote another admin before leaving.",
      exact: true,
    });
    this.leaveTeamOption = page.getByRole("listbox").getByRole("option", {
      name: "Leave team",
      exact: true,
    });
    this.table = new MemberTable(page);
    this.confirmDialog = new ConfirmDialog(page);
    this.addMembersDialog = new AddMembersDialog(page);
    this.inviteLinkDialog = new InviteLinkDialog(page);
  }

  /** Expects the page with its member table loaded. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.table.expectLoaded();
  }

  /** Expects the search of the team's members. */
  @step
  async expectSearch(): Promise<void> {
    await expect(this.search).toBeVisible();
  }

  /** Opens the invite link dialog, expects it and closes it without a change. */
  @step
  async expectInviteLinkDialog(): Promise<void> {
    await this.inviteLink.click();
    await this.inviteLinkDialog.expectShown();
    await this.inviteLinkDialog.close();
  }

  /**
   * Waits for the member list to load, adds the user if eligible, and checks
   * that the new row appears. A user already listed is an error.
   */
  @step
  async addMember(account: Account, team: string): Promise<void> {
    if (await this.table.lists(account))
      throw new Error(
        `"${account.name}" is already a member of the team "${team}".`,
      );
    await this.addMembers.click();
    await this.addMembersDialog.submit(account);
    await this.table.expectListed(account);
  }

  @step
  async expectMember(account: Account): Promise<void> {
    await this.table.expectListed(account);
  }

  /** Gives a member a role they do not hold yet. */
  @step
  async grant(account: Account, role: TeamRole): Promise<void> {
    await this.table.grant(account, role);
  }

  @step
  async expectRole(account: Account, role: TeamRole): Promise<void> {
    await this.table.expectRole(account, role);
  }

  /** Removes a listed member from the team; its row disappears. */
  @step
  async removeMember(account: Account): Promise<void> {
    await this.table.remove(account);
  }

  /**
   * Leaves the team through "More actions" and confirms it; the personal
   * space opens once the team has let the user go.
   */
  @step
  async leaveTeam(): Promise<void> {
    await this.moreActions.click();
    await this.leaveTeamOption.click();
    await this.confirmDialog.confirm("Leave this team?", "Leave");
    await expect(this.page).toHaveURL(/\/team\/personal[^/]*\/agents$/);
  }

  /**
   * Expects no "Add members", once the table shows the member's roles that
   * the member cannot change.
   */
  @step
  async expectCannotManageMembers(account: Account): Promise<void> {
    await this.table.expectRolesLocked(account);
    await expect(this.addMembers).toHaveCount(0);
  }

  /** Turns off the role "Admin" of the only admin; the application refuses it. */
  @step
  async turnOffOnlyAdminAndExpectRefused(account: Account): Promise<void> {
    await this.table.clickHeldRole(account, "Admin");
    await this.expectRefused(REFUSALS.role);
  }

  /** Removes the only admin from the team; the application refuses it. */
  @step
  async removeOnlyAdminAndExpectRefused(account: Account): Promise<void> {
    await this.table.chooseDelete(account);
    await this.expectRefused(REFUSALS.removal);
  }

  /** Opens "More actions", expects "Leave team" disabled for the only admin and closes the menu. */
  @step
  async expectOnlyAdminCannotLeave(): Promise<void> {
    await this.moreActions.click();
    await expect(this.leaveTeamRefused).toBeDisabled();
    await this.page.keyboard.press("Escape");
    await expect(this.leaveTeamRefused).toBeHidden();
  }

  /** The refusal names the refused change and that a team keeps an admin. */
  private async expectRefused(refusal: string): Promise<void> {
    const alert = this.page.getByRole("alert").filter({ hasText: refusal });
    await expect(alert).toContainText("a team must keep at least one");
  }
}
