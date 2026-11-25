import { expect, type Locator, type Page } from "@playwright/test";
import {
  uploadPath,
  type UploadFile,
  type UploadVersion,
} from "../config/uploads.ts";
import { step } from "../pages/step.ts";

/** The "New folder" dialog of a resources page. */
export class NewFolderDialog {
  static readonly displayName = "New folder dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly name: Locator;
  private readonly create: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: "New folder", exact: true });
    this.name = this.dialog.getByRole("textbox", { name: "Name", exact: true });
    this.create = this.dialog.getByRole("button", {
      name: "Create",
      exact: true,
    });
  }

  @step
  async submit(folder: string): Promise<void> {
    await this.name.fill(folder);
    await this.create.click();
    await expect(this.dialog).toBeHidden();
  }
}

/** The ingestion modes of the "Add documents" dialog. */
export type UploadMode = "Upload & process" | "Upload only";

/** What to do with one file whose name exists in the folder, by the labels of the choices. */
export type FileDecision = "Replace" | "Skip";

/** What to do with every file whose name exists in the folder, by the labels of the buttons. */
export type AllFilesDecision = "Replace all" | "Skip all";

/**
 * The "Add documents" drop zone opens the browser's file chooser. The file
 * chooser event supplies the selected file.
 */
export class AddDocumentsDialog {
  static readonly displayName = "Add documents dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly dropZone: Locator;
  private readonly import: Locator;
  private readonly modeSelect: Locator;
  // Shown after "Import" while files of these names exist in the folder.
  private readonly conflicts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: "Add documents",
      exact: true,
    });
    this.dropZone = this.dialog.getByRole("button", {
      name: /^Drop your files here/,
    });
    this.import = this.dialog.getByRole("button", { name: /^Import\b/ });
    // The mode select has no label of its own: its button is named by the mode it shows.
    this.modeSelect = this.dialog.getByRole("button", {
      name: /^(Upload & process|Upload only)$/,
    });
    this.conflicts = this.dialog.getByRole("group", {
      name: /^\d+ files? already exists? in this folder$/,
    });
  }

  /** Imports the file in the selected mode and waits for the dialog to close. */
  @step
  async submit(
    file: UploadFile,
    mode: UploadMode,
    timeout: number,
  ): Promise<void> {
    await this.chooseFiles([file], "original", mode);
    await this.import.click();
    await expect(this.dialog).toBeHidden({ timeout });
  }

  /**
   * Imports the changed version of files whose names exist in the folder: the
   * dialog asks what to do, the decision is given for the one file or for
   * all, and the dialog closes after the second "Import".
   */
  @step
  async submitChanged(
    files: readonly UploadFile[],
    mode: UploadMode,
    decision: FileDecision | AllFilesDecision,
    timeout: number,
  ): Promise<void> {
    await this.chooseFiles(files, "changed", mode);
    await this.import.click();
    await expect(this.conflicts).toBeVisible({ timeout });
    await expect(this.import).toBeDisabled();
    await this.decide(files, decision);
    await this.import.click();
    await expect(this.dialog).toBeHidden({ timeout });
  }

  /** Chooses the mode, then the files. */
  private async chooseFiles(
    files: readonly UploadFile[],
    version: UploadVersion,
    mode: UploadMode,
  ): Promise<void> {
    await this.modeSelect.click();
    await this.page.getByRole("option", { name: mode, exact: true }).click();
    await expect(
      this.dialog.getByRole("button", { name: mode, exact: true }),
    ).toBeVisible();
    const fileChooser = this.page.waitForEvent("filechooser");
    await this.dropZone.click();
    await (
      await fileChooser
    ).setFiles(files.map((file) => uploadPath(file, version)));
  }

  /** Gives a decision: the button for all files, or each file's own choice. */
  private async decide(
    files: readonly UploadFile[],
    decision: FileDecision | AllFilesDecision,
  ): Promise<void> {
    if (decision === "Replace all" || decision === "Skip all") {
      await this.conflicts
        .getByRole("button", { name: decision, exact: true })
        .click();
      return;
    }
    for (const file of files) {
      const choice = this.conflicts
        .getByRole("radiogroup", {
          name: `What to do with “${file}”`,
          exact: true,
        })
        .getByRole("radio", { name: decision, exact: true });
      await choice.click();
      await expect(choice).toBeChecked();
    }
  }
}

/**
 * The document rename field holds the name without its extension. The
 * extension appears as a fixed suffix.
 */
export class RenameDialog {
  static readonly displayName = "Rename dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly name: Locator;
  private readonly save: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", { name: "Rename", exact: true });
    this.name = this.dialog.getByRole("textbox", { name: "Name", exact: true });
    this.save = this.dialog.getByRole("button", { name: "Save", exact: true });
  }

  /** Waits for the current name, replaces it, then saves and waits for the dialog to close. */
  @step
  async submit(current: string, next: string): Promise<void> {
    await expect(this.name).toHaveValue(current);
    await this.name.fill(next);
    await this.save.click();
    await expect(this.dialog).toBeHidden();
  }
}

/** The titles of the confirmation dialogs the page objects confirm. */
export type ConfirmTitle =
  | "Delete folder"
  | "Remove document"
  | "Delete this agent?"
  | "Delete prompt?"
  | "Leave this team?";

/** The confirm buttons of those dialogs, by their labels. */
export type ConfirmButton = "Confirm" | "Delete" | "Leave";

/** A confirmation dialog, found by its title, such as "Delete folder". */
export class ConfirmDialog {
  static readonly displayName = "Confirmation dialog";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Confirms with the dialog's confirm button, "Confirm" unless the dialog names it otherwise. */
  @step
  async confirm(
    title: ConfirmTitle,
    button: ConfirmButton = "Confirm",
  ): Promise<void> {
    const dialog = this.page.getByRole("alertdialog", {
      name: title,
      exact: true,
    });
    await dialog.getByRole("button", { name: button, exact: true }).click();
    await expect(dialog).toBeHidden();
  }
}
