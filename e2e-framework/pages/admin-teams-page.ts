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

  /** Creates a team with one admin; the list then shows it. */
  @step
  async createTeam(
    name: string,
    description: string,
    admin: Account,
  ): Promise<void> {
    await this.createTeamButton.click();
    await this.createTeamDialog.submit(name, description, admin);
    await this.expectListed(name);
  }

  /** Opens a listed team's edit form, expects its name and closes it unsaved. */
  @step
  async expectEditForm(name: string): Promise<void> {
    await this.expectListed(name);
    await this.edit(name).click();
    await this.editTeamDialog.expectName(name);
    await this.editTeamDialog.close();
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
