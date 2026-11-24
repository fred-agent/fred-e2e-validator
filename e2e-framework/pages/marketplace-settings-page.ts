import { expect, type Locator, type Page } from "@playwright/test";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** A team's own publishing choice, by the labels of its radios. */
export type TeamPublishingChoice = "Off" | "Default" | "On";

/**
 * Platform and per-team settings control whether teams can publish agents and
 * how many they can publish.
 */
export class MarketplaceSettingsPage {
  static readonly displayName = "Marketplace settings page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly publishing: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Marketplaces");
    this.publishing = page.getByRole("radiogroup", {
      name: "Publishing",
      exact: true,
    });
  }

  /** A team's publishing choice, in the row of that team. */
  private teamPublishing(team: string, choice: TeamPublishingChoice): Locator {
    return this.page
      .getByRole("radiogroup", { name: `Publishing for ${team}`, exact: true })
      .getByRole("radio", { name: choice, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.publishing).toBeVisible();
  }

  /** Waits for the team's settings row and checks the selected choice. */
  @step
  async expectTeamPublishing(
    team: string,
    choice: TeamPublishingChoice,
  ): Promise<void> {
    await expect(
      this.teamPublishing(team, choice),
      `The marketplace settings show no team "${team}" with the publishing choice "${choice}" checked`,
    ).toBeChecked();
  }
}
