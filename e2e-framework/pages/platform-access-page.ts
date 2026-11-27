import { expect, type Locator, type Page } from "@playwright/test";
import { Tabs } from "../components/tabs.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The views of platform access, by the labels of their tabs. */
export type PlatformAccessView = "Rules" | "Users" | "Teams";

/**
 * The platform access page opens on "Rules". Separate tabs list allowed users
 * and teams.
 */
export class PlatformAccessPage {
  static readonly displayName = "Platform access page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly views: Tabs<PlatformAccessView>;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Platform access");
    this.views = new Tabs(
      page.getByRole("main").getByRole("tablist", {
        name: "Platform access sections",
        exact: true,
      }),
    );
  }

  /** The selected view supplies the panel's accessible name. */
  private viewPanel(name: PlatformAccessView): Locator {
    return this.page
      .getByRole("main")
      .getByRole("tabpanel", { name, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.views.expectShown();
  }

  /** Selects a view and checks its tab. */
  @step
  async chooseView(name: PlatformAccessView): Promise<void> {
    await this.views.select(name);
  }

  /** Expects a view's tab to be selected and its panel to be shown. */
  @step
  async expectView(name: PlatformAccessView): Promise<void> {
    await this.views.expectSelected(name);
    await expect(this.viewPanel(name)).toBeVisible();
  }
}
