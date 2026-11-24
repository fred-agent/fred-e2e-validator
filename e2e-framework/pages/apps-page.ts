import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "./step.ts";

/** Applications available to members of the current team. */
export class AppsPage {
  static readonly displayName = "Apps page";
  private readonly page: Page;
  private readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", {
      level: 1,
      name: "Applications",
      exact: true,
    });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.page).toHaveURL(/\/team\/[^/]+\/apps/);
    await expect(this.heading).toBeVisible();
  }
}
