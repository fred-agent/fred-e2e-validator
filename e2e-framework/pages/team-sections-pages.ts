import { expect, type Locator, type Page } from "@playwright/test";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

// The sections of a team's settings other than its members and its analytics,
// each a small page object. Members are in team-members-page.ts and analytics
// in analytics-page.ts. Nothing here saves a change.

/** A team's "Settings" section: its name, description, visibility and retention. */
export class TeamParametersPage {
  static readonly displayName = "Team parameters page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly teamName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Settings");
    this.teamName = page.getByRole("textbox", {
      name: "Team name",
      exact: true,
    });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.teamName).toBeVisible();
  }

  /** Expects the team's name in the name field. */
  @step
  async expectName(name: string): Promise<void> {
    await expect(this.teamName).toHaveValue(name);
  }
}

/** A team's "Activity" section: its scheduled, running and completed tasks. */
export class TeamActivityPage {
  static readonly displayName = "Team activity page";
  private readonly page: Page;
  private readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Activity");
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}

/** A team's "Models" section: the models the team may use, and its default. */
export class TeamModelsPage {
  static readonly displayName = "Team models page";
  private readonly page: Page;
  private readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Models");
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
