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
  private readonly cancel: Locator;
  private readonly nameInUse: Locator;

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
    this.cancel = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    // The application's message names the conflict in its own words.
    this.nameInUse = page
      .getByRole("alert")
      .filter({ hasText: "Failed to create team" })
      .filter({ hasText: /already has this name|already exists/ });
  }

  /**
   * Creates a team with its admins and waits for the dialog to close. The
   * field truncates long names, so check the complete name before submitting.
   */
  @step
  async submit(
    name: string,
    description: string,
    admins: readonly Account[],
  ): Promise<void> {
    await this.fill(name, description, admins);
    await this.create.click();
    await expect(this.dialog).toBeHidden();
  }

  /**
   * Submits a team with a name in use; the application refuses it and says
   * so, and the form is cancelled.
   */
  @step
  async submitAndExpectNameRefused(
    name: string,
    description: string,
    admin: Account,
  ): Promise<void> {
    await this.fill(name, description, [admin]);
    await this.create.click();
    await expect(this.nameInUse).toBeVisible();
    await this.cancel.click();
    await expect(this.dialog).toBeHidden();
  }

  private async fill(
    name: string,
    description: string,
    admins: readonly Account[],
  ): Promise<void> {
    await this.name.fill(name);
    await expect(this.name).toHaveValue(name);
    await this.description.fill(description);
    for (const admin of admins) await this.admins.choose(admin);
  }
}

/** The platform admin's "Edit team" dialog. */
export class EditTeamDialog {
  static readonly displayName = "Edit team dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly name: Locator;
  private readonly cancel: Locator;
  private readonly save: Locator;

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
    this.save = this.dialog.getByRole("button", { name: "Save", exact: true });
  }

  /** Renames the team, once the form shows its name, and saves; the dialog closes. */
  @step
  async rename(current: string, name: string): Promise<void> {
    await expect(this.name).toHaveValue(current);
    await this.name.fill(name);
    await expect(this.name).toHaveValue(name);
    await this.save.click();
    await expect(this.dialog).toBeHidden();
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

  /**
   * Creates a link without a note or an expiry and returns its address, which
   * the dialog "Link created" shows; that dialog is then closed.
   */
  @step
  async createLink(team: string): Promise<string> {
    await this.button(team, "Create link").click();
    const form = this.page.getByRole("dialog", {
      name: "Create link",
      exact: true,
    });
    await form
      .getByRole("button", { name: "Create link", exact: true })
      .click();
    const created = this.page.getByRole("dialog", {
      name: "Link created",
      exact: true,
    });
    const address = created.getByRole("textbox", {
      name: "Invitation link",
      exact: true,
    });
    await expect(address).toHaveValue(/\/join\//);
    const link = await address.inputValue();
    await created.getByRole("button", { name: "Close", exact: true }).click();
    await expect(created).toBeHidden();
    return link;
  }

  /** Revokes the team's one link; the list then marks it "Revoked". */
  @step
  async revokeOnlyLink(team: string): Promise<void> {
    const rows = this.dialog(team).locator('[class*="datatable-row"]');
    await expect(rows).toHaveCount(1);
    await rows.getByRole("button", { name: "Revoke", exact: true }).click();
    // A dialog, not an alert dialog as the other confirmations are.
    const confirm = this.page.getByRole("dialog", {
      name: "Revoke this invitation?",
      exact: true,
    });
    await confirm.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(rows.getByText("Revoked", { exact: true })).toBeVisible();
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
