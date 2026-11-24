import { expect, type Locator, type Page } from "@playwright/test";
import type { Account } from "../config/accounts.ts";
import { step } from "../pages/step.ts";
import { UserPicker } from "./user-picker.ts";

/** The platform admin's "Create team" dialog. */
export class CreateTeamDialog {
  static readonly displayName = "Create team dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly name: Locator;
  private readonly description: Locator;
  private readonly admins: UserPicker;
  private readonly create: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: "Create team",
      exact: true,
    });
    this.name = this.dialog.getByRole("textbox", {
      name: "Team name *",
      exact: true,
    });
    this.description = this.dialog.getByRole("textbox", {
      name: "Team description *",
      exact: true,
    });
    this.admins = new UserPicker(page, this.dialog);
    this.create = this.dialog.getByRole("button", {
      name: "Create team",
      exact: true,
    });
  }

  /**
   * Creates a team with one admin and waits for the dialog to close. The
   * field truncates long names, so check the complete name before submitting.
   */
  @step
  async submit(
    name: string,
    description: string,
    admin: Account,
  ): Promise<void> {
    await this.name.fill(name);
    await expect(this.name).toHaveValue(name);
    await this.description.fill(description);
    await this.admins.choose(admin);
    await this.create.click();
    await expect(this.dialog).toBeHidden();
  }
}

/** The platform admin's "Edit team" dialog. */
export class EditTeamDialog {
  static readonly displayName = "Edit team dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly name: Locator;
  private readonly cancel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: "Edit team", exact: true });
    this.name = this.dialog.getByRole("textbox", {
      name: "Team name *",
      exact: true,
    });
    this.cancel = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
  }

  @step
  async expectName(name: string): Promise<void> {
    await expect(this.name).toHaveValue(name);
  }

  /** Closes the form without saving. */
  @step
  async close(): Promise<void> {
    await this.cancel.click();
    await expect(this.dialog).toBeHidden();
  }
}

/** The platform admin's "Invitations for <team>" dialog: a team's invite links. */
export class TeamInvitationsDialog {
  static readonly displayName = "Team invitations dialog";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private dialog(team: string): Locator {
    return this.page.getByRole("dialog", {
      name: `Invitations for ${team}`,
      exact: true,
    });
  }

  private button(team: string, name: string): Locator {
    return this.dialog(team).getByRole("button", { name, exact: true });
  }

  /** Expects the dialog of this team, which offers "Create link". */
  @step
  async expectShown(team: string): Promise<void> {
    await expect(this.button(team, "Create link")).toBeVisible();
  }

  @step
  async close(team: string): Promise<void> {
    await this.button(team, "Close").click();
    await expect(this.dialog(team)).toBeHidden();
  }
}

/** A team's "Add new members" dialog. */
export class AddMembersDialog {
  static readonly displayName = "Add members dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly users: UserPicker;
  private readonly add: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: "Add new members",
      exact: true,
    });
    this.users = new UserPicker(page, this.dialog);
    this.add = this.dialog.getByRole("button", { name: "Add", exact: true });
  }

  /** Adds a user without a role and waits for the dialog to close. */
  @step
  async submit(account: Account): Promise<void> {
    await this.users.choose(account);
    await this.add.click();
    await expect(this.dialog).toBeHidden();
  }
}

/** A team's "Invite link" dialog, where a team admin turns invitation by link on or off. */
export class InviteLinkDialog {
  static readonly displayName = "Invite link dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly enable: Locator;
  private readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: "Invite link",
      exact: true,
    });
    this.enable = this.dialog.getByRole("checkbox", {
      name: "Enable invitation by link",
      exact: true,
    });
    this.closeButton = this.dialog.getByRole("button", {
      name: "Close",
      exact: true,
    });
  }

  /** Expects the switch that enables invitation by link. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.enable).toBeVisible();
  }

  /** Closes the dialog without a change. */
  @step
  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
