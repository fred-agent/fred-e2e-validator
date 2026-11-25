import { expect, type Locator, type Page } from "@playwright/test";
import { AnalyticsPage } from "../pages/analytics-page.ts";
import { step } from "../pages/step.ts";
import { TeamMembersPage } from "../pages/team-members-page.ts";
import {
  TeamActivityPage,
  TeamModelsPage,
  TeamParametersPage,
} from "../pages/team-sections-pages.ts";

/** The sections of a team's settings, by the labels of their links. */
export type TeamSection =
  "Members" | "Settings" | "Activity" | "Analytics" | "Models";

/**
 * The settings button in a team space opens "Members". The side panel links
 * to each settings section, including "Activity".
 */
export class TeamSettings {
  static readonly displayName = "Team settings";
  private readonly page: Page;
  private readonly openButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openButton = page.getByRole("button", {
      name: "Settings",
      exact: true,
    });
  }

  /** A section link by its visible name. */
  private section(name: TeamSection): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  @step
  async open(): Promise<void> {
    await this.openButton.click();
    await expect(this.page).toHaveURL(/\/team\/[^/]+\/settings\//);
  }

  /** Opens a section and waits for its link to be marked as the current page. */
  @step
  async goTo(name: TeamSection): Promise<void> {
    await this.section(name).click();
    await expect(this.section(name)).toHaveAttribute("aria-current", "page");
  }

  /** Expects a section to be the open one and its page to show. */
  @step
  async expectSectionShown(name: TeamSection): Promise<void> {
    await expect(this.section(name)).toHaveAttribute("aria-current", "page");
    switch (name) {
      case "Members":
        return new TeamMembersPage(this.page).expectShown();
      case "Settings":
        return new TeamParametersPage(this.page).expectShown();
      case "Activity":
        return new TeamActivityPage(this.page).expectShown();
      case "Analytics":
        return new AnalyticsPage(this.page).expectShown();
      case "Models":
        return new TeamModelsPage(this.page).expectShown();
      default: {
        const unknown: never = name;
        throw new Error(
          `The team settings have no section "${String(unknown)}".`,
        );
      }
    }
  }
}
