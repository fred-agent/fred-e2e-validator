import { expect, type Locator, type Page } from "@playwright/test";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The home pages the platform offers its users, by the titles of their buttons. */
export type HomeLayout = "Simple home" | "Advanced home";

/**
 * The console's "User interface": the themes offered to users, the default
 * one, and the home page every user is offered with its featured agents and
 * its question field. A home page's button is named by its title followed by
 * its description.
 */
export class UserInterfacePage {
  static readonly displayName = "User interface page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly layouts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "User interface");
    this.layouts = page.getByRole("group", {
      name: "Home page offered to users",
      exact: true,
    });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /** Expects both home pages, one of them chosen. */
  @step
  async expectHomeChoice(): Promise<void> {
    for (const layout of ["Simple home", "Advanced home"] as const)
      await expect(
        this.layouts.getByRole("button", { name: new RegExp(`^${layout} `) }),
      ).toBeVisible();
    await expect(
      this.layouts.getByRole("button", { pressed: true }),
    ).toHaveCount(1);
  }
}
