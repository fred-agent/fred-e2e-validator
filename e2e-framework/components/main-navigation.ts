import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";

/** The entries of the main navigation the tests open, by their labels. */
export type MainNavigationEntry = "Marketplace" | "Technical console";

/** Main navigation links include Home, Marketplace and Help Center. */
export class MainNavigation {
  static readonly displayName = "Main navigation";
  private readonly page: Page;
  private readonly bar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bar = page.getByRole("navigation", {
      name: "Main navigation",
      exact: true,
    });
  }

  /** A navigation entry by its visible name. */
  private entry(name: MainNavigationEntry): Locator {
    return this.bar.getByRole("button", { name, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.bar).toBeVisible();
  }

  /** Expects no entry of this name once the navigation shows "Home". */
  @step
  async expectEntryAbsent(name: MainNavigationEntry): Promise<void> {
    await expect(
      this.bar.getByRole("button", { name: "Home", exact: true }),
    ).toBeVisible();
    await expect(this.entry(name)).toHaveCount(0);
  }

  /** Clicks an entry; the page it opens says when it has loaded. */
  @step
  async goTo(name: MainNavigationEntry): Promise<void> {
    await this.entry(name).click();
  }
}
