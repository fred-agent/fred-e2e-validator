import { expect, type Locator, type Page } from "@playwright/test";
import { DataTable } from "../components/data-table.ts";
import {
  CreateTeamDialog,
  EditTeamDialog,
  TeamInvitationsDialog,
} from "../components/team-dialogs.ts";
import type { Account } from "../config/accounts.ts";
import { expectButtonVisible } from "./buttons.ts";
import { step } from "./step.ts";

/** The buttons of the console's Teams page a test checks by name. */
export type AdminTeamsButton = "Create team";

/**
 * An invitation link of a team. A step title shows an object as "…", and the
 * link admits whoever follows it, so its address stays out of reports.
 */
export type InvitationLink = Readonly<{ address: string }>;

/**
 * The technical console's Teams page, where the platform admin creates and
 * edits teams and chooses the teams every new user joins.
 */
export class AdminTeamsPage {
  static readonly displayName = "Admin teams page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly createTeamButton: Locator;
  // The existing teams.
  private readonly teams: DataTable;
  // Choosing a team here saves it at once as a default team of new users:
  // nothing here types into it.
  private readonly defaultTeams: Locator;
  private readonly buttons: Readonly<Record<AdminTeamsButton, Locator>>;
  private readonly createTeamDialog: CreateTeamDialog;
  private readonly editTeamDialog: EditTeamDialog;
  private readonly invitationsDialog: TeamInvitationsDialog;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = page.getByRole("heading", {
      level: 1,
      name: "Teams",
      exact: true,
    });
    this.createTeamButton = main.getByRole("button", {
      name: "Create team",
      exact: true,
    });
    this.teams = new DataTable(page);
    this.defaultTeams = main.getByRole("textbox", {
      name: "Add a team by name",
      exact: true,
    });
    this.buttons = { "Create team": this.createTeamButton };
    this.createTeamDialog = new CreateTeamDialog(page);
    this.editTeamDialog = new EditTeamDialog(page);
    this.invitationsDialog = new TeamInvitationsDialog(page);
  }

  /** A listed team's edit button, named after the team. */
  private edit(name: string): Locator {
    return this.page.getByRole("button", { name: `Edit ${name}`, exact: true });
  }

  /** A team's row, by the team's edit button. */
  private row(name: string): Locator {
    return this.teams.rows.filter({ has: this.edit(name) });
  }

  private async expectListed(name: string): Promise<void> {
    await expect(this.edit(name)).toBeVisible();
  }

  /**
   * Waits for the heading and "Create team". The empty message can appear
   * during loading or after a failure, so checking for a team requires waiting
   * for its row.
   */
  @step
  async open(): Promise<void> {
    await this.page.goto("/admin/teams");
    await this.expectShown();
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.createTeamButton).toBeVisible();
  }

  /** Expects the list of the platform's existing teams to show a team. */
  @step
  async expectTeamsListed(): Promise<void> {
    await expect(this.teams.rows.first()).toBeVisible();
  }

  /**
   * The default-team field accepts input once the current default teams have
   * loaded.
   */
  @step
  async expectDefaultTeamsField(): Promise<void> {
    await expect(this.defaultTeams).toBeVisible();
    await expect(this.defaultTeams).toBeEnabled();
  }

  @step
  async expectButtonVisible(name: AdminTeamsButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /** Creates a team with its admins; the list then shows it. */
  @step
  async createTeam(
    name: string,
    description: string,
    admins: readonly Account[],
  ): Promise<void> {
    await this.createTeamButton.click();
    await this.createTeamDialog.submit(name, description, admins);
    await this.expectListed(name);
  }

  /**
   * Fills "Create team" with the name of a listed team; the application
   * refuses it and the form is cancelled, so the list holds the one team of
   * that name.
   */
  @step
  async expectExistingNameRefused(
    name: string,
    description: string,
    admin: Account,
  ): Promise<void> {
    await this.expectListed(name);
    await this.createTeamButton.click();
    await this.createTeamDialog.submitAndExpectNameRefused(
      name,
      description,
      admin,
    );
    await expect(this.edit(name)).toHaveCount(1);
  }

  /** Opens a listed team's edit form, expects its name and closes it unsaved. */
  @step
  async expectEditForm(name: string): Promise<void> {
    await this.expectListed(name);
    await this.edit(name).click();
    await this.editTeamDialog.expectName(name);
    await this.editTeamDialog.close();
  }

  /** Renames a listed team in its edit form; the list then shows the new name. */
  @step
  async rename(name: string, next: string): Promise<void> {
    await this.expectListed(name);
    await this.edit(name).click();
    await this.editTeamDialog.rename(name, next);
    await this.expectListed(next);
  }

  /** Expects a team listed under a name, and none under another. */
  @step
  async expectListedInstead(name: string, instead: string): Promise<void> {
    await this.expectListed(name);
    await expect(this.edit(instead)).toHaveCount(0);
  }

  /**
   * Turns a listed team's link access on or off; the checkbox then shows the
   * choice. The checkbox is a native input under a styled switch, which its
   * label element, without a text of its own, draws and receives the click.
   */
  @step
  async setLinkAccess(name: string, on: boolean): Promise<void> {
    const access = this.row(name).getByRole("checkbox", {
      name: `Link access ${name}`,
      exact: true,
    });
    if (on) await expect(access).not.toBeChecked();
    else await expect(access).toBeChecked();
    // The inner locator of a filter is looked up inside each label, so it
    // starts from the page.
    await this.row(name)
      .locator("label")
      .filter({
        has: this.page.getByRole("checkbox", {
          name: `Link access ${name}`,
          exact: true,
        }),
      })
      .click();
    if (on) await expect(access).toBeChecked();
    else await expect(access).not.toBeChecked();
  }

  /** Creates an invitation link of a listed team and returns it. */
  @step
  async createInvitationLink(name: string): Promise<InvitationLink> {
    await this.openInvitations(name);
    const address = await this.invitationsDialog.createLink(name);
    await this.invitationsDialog.close(name);
    return Object.freeze({ address });
  }

  /** Revokes the one invitation link of a listed team. */
  @step
  async revokeInvitationLink(name: string): Promise<void> {
    await this.openInvitations(name);
    await this.invitationsDialog.revokeOnlyLink(name);
    await this.invitationsDialog.close(name);
  }

  private async openInvitations(name: string): Promise<void> {
    await this.expectListed(name);
    await this.row(name)
      .getByRole("button", { name: "Manage links", exact: true })
      .click();
    await this.invitationsDialog.expectShown(name);
  }

  /** Opens a listed team's invite links and closes them without a change. */
  @step
  async expectInvitations(name: string): Promise<void> {
    await this.expectListed(name);
    await this.row(name)
      .getByRole("button", { name: "Manage links", exact: true })
      .click();
    await this.invitationsDialog.expectShown(name);
    await this.invitationsDialog.close(name);
  }
}
