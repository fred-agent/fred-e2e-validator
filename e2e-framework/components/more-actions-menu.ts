import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";

/**
 * The "More actions" button on a table row or agent card opens a listbox.
 * Matching options by accessible name excludes their icon's ligature text.
 * `Option` limits choices to the labels available in each menu.
 */
export class MoreActionsMenu<Option extends string> {
  static readonly displayName = "More actions menu";
  private readonly page: Page;
  private readonly options: Locator;

  constructor(page: Page) {
    this.page = page;
    this.options = page.getByRole("listbox");
  }

  /** The menu button inside a row or a card. */
  private button(scope: Locator): Locator {
    return scope.getByRole("button", { name: "More actions", exact: true });
  }

  private option(label: Option): Locator {
    return this.options.getByRole("option", { name: label, exact: true });
  }

  /** Expects no menu button inside a row or a card that shows. */
  @step
  async expectAbsent(scope: Locator): Promise<void> {
    await expect(scope).toBeVisible();
    await expect(this.button(scope)).toHaveCount(0);
  }

  @step
  async choose(scope: Locator, option: Option): Promise<void> {
    await this.button(scope).click();
    await this.option(option).click();
  }

  /** Opens the menu, expects exactly these options and closes it unchanged. */
  @step
  async expectOptions(
    scope: Locator,
    options: readonly Option[],
  ): Promise<void> {
    await this.button(scope).click();
    for (const option of options)
      await expect(this.option(option)).toBeVisible();
    await expect(this.options.getByRole("option")).toHaveCount(options.length);
    await this.page.keyboard.press("Escape");
    await expect(this.options).toBeHidden();
  }
}
