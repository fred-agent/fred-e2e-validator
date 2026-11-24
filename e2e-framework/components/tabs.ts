import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";

/**
 * A tab list, such as an analytics page's topics; its tabs are named by their
 * labels, of the union `Label` the page that holds the list declares.
 */
export class Tabs<Label extends string> {
  static readonly displayName = "Tabs";
  private readonly page: Page;
  private readonly tablist: Locator;

  constructor(tablist: Locator) {
    this.page = tablist.page();
    this.tablist = tablist;
  }

  private tab(name: Label): Locator {
    return this.tablist.getByRole("tab", { name, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.tablist).toBeVisible();
  }

  /** Selects a tab and checks its selected state. */
  @step
  async select(name: Label): Promise<void> {
    await this.tab(name).click();
    await this.expectSelected(name);
  }

  @step
  async expectSelected(name: Label): Promise<void> {
    await expect(this.tab(name)).toHaveAttribute("aria-selected", "true");
  }
}
