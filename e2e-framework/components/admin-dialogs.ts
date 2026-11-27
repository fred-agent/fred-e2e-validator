import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";

/**
 * "New banner" opens the "New announcement" form. Saving requires a title and
 * short description in at least one language.
 */
export class NewAnnouncementDialog {
  static readonly displayName = "New announcement dialog";
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly title: Locator;
  private readonly shortDescription: Locator;
  private readonly longDescription: Locator;
  private readonly save: Locator;
  private readonly cancel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole("dialog", {
      name: "New announcement",
      exact: true,
    });
    this.title = this.dialog.getByRole("textbox", {
      name: "Title",
      exact: true,
    });
    this.shortDescription = this.dialog.getByRole("textbox", {
      name: "Short description",
      exact: true,
    });
    this.longDescription = this.dialog.getByRole("textbox", {
      name: "Long description (optional)",
      exact: true,
    });
    this.save = this.dialog.getByRole("button", { name: "Save", exact: true });
    this.cancel = this.dialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
  }

  /** Expects the form of a new banner with every text empty and "Save" disabled. */
  @step
  async expectEmptyNewBanner(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    for (const field of [
      this.title,
      this.shortDescription,
      this.longDescription,
    ])
      await expect(field).toHaveValue("");
    await expect(this.save).toBeDisabled();
  }

  /** Closes the form without saving. */
  @step
  async close(): Promise<void> {
    await this.cancel.click();
    await expect(this.dialog).toBeHidden();
  }
}
