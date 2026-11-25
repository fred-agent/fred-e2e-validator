import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";

/** What a new prompt holds; its command is optional. */
export type PromptContent = Readonly<{
  name: string;
  text: string;
  command?: string;
}>;

/**
 * The "New prompt" and "Edit prompt" dialogs lack accessible names. Their
 * prompt text field distinguishes them from other dialogs. "Create" requires
 * both a name and prompt text containing at least one non-space character
 * each.
 */
export class PromptForm {
  static readonly displayName = "Prompt form";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly title: Locator;
  private readonly name: Locator;
  private readonly command: Locator;
  private readonly description: Locator;
  // A text editor, not an input: its text is its content.
  private readonly text: Locator;
  private readonly create: Locator;
  private readonly save: Locator;
  private readonly cancel: Locator;
  private readonly commandInUse: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog").filter({
      has: page.getByRole("textbox", { name: "Prompt text *", exact: true }),
    });
    this.title = this.dialog.getByText("New prompt", { exact: true });
    // Required field labels end in " *".
    this.name = this.dialog.getByRole("textbox", {
      name: "Name *",
      exact: true,
    });
    this.command = this.dialog.getByRole("textbox", {
      name: "Command",
      exact: true,
    });
    this.description = this.dialog.getByRole("textbox", {
      name: "Description",
      exact: true,
    });
    this.text = this.dialog.getByRole("textbox", {
      name: "Prompt text *",
      exact: true,
    });
    this.create = this.dialog.getByRole("button", {
      name: "Create",
      exact: true,
    });
    this.save = this.dialog.getByRole("button", { name: "Save", exact: true });
    this.cancel = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.commandInUse = this.dialog.getByText(
      "This command is already used by another prompt",
      { exact: true },
    );
  }

  /** Fills the form of a new prompt and clicks "Create"; the caller checks the result. */
  @step
  async submitNew(prompt: PromptContent): Promise<void> {
    await expect(this.title).toBeVisible();
    await this.name.fill(prompt.name);
    if (prompt.command !== undefined) await this.command.fill(prompt.command);
    await this.text.fill(prompt.text);
    await this.create.click();
  }

  /** The form closes after the prompt has been saved. */
  @step
  async expectSaved(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }

  /** A command in use keeps the form open after "Create" and is named on its field. */
  @step
  async expectCommandInUse(): Promise<void> {
    await expect(this.commandInUse).toBeVisible();
    await expect(this.command).toHaveAttribute("aria-invalid", "true");
  }

  /**
   * Replaces the text of the prompt being edited, once the form shows the
   * prompt's own name and text, and saves it.
   */
  @step
  async replaceText(prompt: PromptContent, text: string): Promise<void> {
    await expect(this.name).toHaveValue(prompt.name);
    await expect(this.text).toHaveText(prompt.text);
    await this.text.fill(text);
    await this.save.click();
    await this.expectSaved();
  }

  /** Expects the new prompt form with every field empty and "Create" disabled. */
  @step
  async expectEmptyNewPrompt(): Promise<void> {
    await expect(this.title).toBeVisible();
    for (const field of [this.name, this.command, this.description])
      await expect(field).toHaveValue("");
    await expect(this.text).toHaveText("");
    await expect(this.create).toBeDisabled();
  }

  /** Closes the form without saving. */
  @step
  async close(): Promise<void> {
    await this.cancel.click();
    await expect(this.dialog).toBeHidden();
  }
}

/**
 * The read-only view of a prompt, which its card opens. It has no accessible
 * name; its "Copy prompt" button, which only this dialog has, identifies it.
 */
export class PromptView {
  static readonly displayName = "Prompt view";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog").filter({
      has: page.getByRole("button", { name: "Copy prompt", exact: true }),
    });
    this.closeButton = this.dialog.getByRole("button", {
      name: "Close",
      exact: true,
    });
  }

  /** Expects a prompt's name and text, then closes the view. */
  @step
  async expectAndClose(name: string, text: string): Promise<void> {
    await expect(this.dialog.getByText(name, { exact: true })).toBeVisible();
    await expect(this.dialog.getByText(text, { exact: true })).toBeVisible();
    await this.closeButton.click();
    await expect(this.dialog).toBeHidden();
  }
}

/**
 * The "Manage categories" dialog of a prompts page. Like the prompt form, it
 * has no accessible name; its new category field, which only this dialog has,
 * identifies it.
 */
export class CategoriesDialog {
  static readonly displayName = "Categories dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly newCategory: Locator;
  private readonly cancel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog").filter({
      has: page.getByRole("textbox", { name: "New category...", exact: true }),
    });
    this.newCategory = this.dialog.getByRole("textbox", {
      name: "New category...",
      exact: true,
    });
    this.cancel = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
  }

  /** Expects the dialog, which offers a new category. */
  @step
  async expectShown(): Promise<void> {
    await expect(this.newCategory).toBeVisible();
  }

  /** Closes the dialog without saving. */
  @step
  async close(): Promise<void> {
    await this.cancel.click();
    await expect(this.dialog).toBeHidden();
  }
}
