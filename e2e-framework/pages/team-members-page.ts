import { expect, type Locator, type Page } from "@playwright/test";
import { MemberTable } from "../components/member-table.ts";
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

/** A team's members and their roles, in the team's settings. */
export class TeamMembersPage {
  static readonly displayName = "Team members page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly addMembers: Locator;
  private readonly search: Locator;
  private readonly inviteLink: Locator;
  private readonly table: MemberTable;
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
    this.table = new MemberTable(page);
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
}
