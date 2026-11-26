import { expect, type Locator, type Page } from "@playwright/test";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

// The sections of a team's settings other than its members and its analytics,
// each a small page object. Members are in team-members-page.ts and analytics
// in analytics-page.ts. A description, and a period the application accepts,
// is saved when its field loses the focus.

/** The most characters a team's description holds. */
const DESCRIPTION_LIMIT = 500;

/** A period above every platform's cap. */
const PERIOD_ABOVE_CAP = "P99999D";

/**
 * A name typed in the name field and never submitted. A temporary team's name
 * ends with a stamp, so this name differs from it.
 */
const DRAFT_NAME = "e2e draft name";

/** A valid description other than the one a temporary team is created with. */
const NEW_DESCRIPTION =
  "A description saved while a new team name is still a draft.";

/** The new description with spaces around it, which saving trims. */
const PADDED_DESCRIPTION = `   ${NEW_DESCRIPTION}   `;

/** A team's "Settings" section: its name, description, visibility and retention. */
export class TeamParametersPage {
  static readonly displayName = "Team parameters page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly teamName: Locator;
  private readonly description: Locator;
  private readonly descriptionLimit: Locator;
  private readonly descriptionUpdated: Locator;
  // The first of the two periods; both fields have this name.
  private readonly gracePeriod: Locator;
  private readonly aboveCap: Locator;
  private readonly visibility: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Settings");
    this.teamName = page.getByRole("textbox", {
      name: "Team name",
      exact: true,
    });
    const main = page.getByRole("main");
    // A required field's label ends with " *".
    this.description = main.getByRole("textbox", {
      name: "Team description *",
      exact: true,
    });
    this.descriptionLimit = main.getByText(
      `${DESCRIPTION_LIMIT} characters maximum`,
    );
    // The confirmation shown once a description is saved, found on the whole
    // page, as it may show outside the main region.
    this.descriptionUpdated = page.getByText("Team description updated", {
      exact: true,
    });
    this.gracePeriod = main
      .getByRole("textbox", { name: "Team value", exact: true })
      .first();
    this.aboveCap = main.getByText("This value exceeds the platform cap.", {
      exact: true,
    });
    this.visibility = main.getByRole("radiogroup", {
      name: "Team visibility",
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

  /**
   * Makes the team public, which lists it in the marketplace; the section,
   * loaded again, shows that it was saved.
   */
  @step
  async makePublicAndReload(): Promise<void> {
    const choice = this.visibility.getByRole("radio", {
      name: "Public",
      exact: true,
    });
    await choice.click();
    await expect(choice).toBeChecked();
    await this.page.reload();
    await expect(choice).toBeChecked();
  }

  /** Writes a description one character too long. */
  @step
  async writeTooLongDescription(): Promise<void> {
    await this.description.fill("x".repeat(DESCRIPTION_LIMIT + 1));
  }

  /** Expects the description cut at its limit, which the field names. */
  @step
  async expectDescriptionCut(): Promise<void> {
    await expect(this.description).toHaveValue("x".repeat(DESCRIPTION_LIMIT));
    await expect(this.descriptionLimit).toBeVisible();
  }

  /**
   * Types a different name in the name field. The rename is sent only by its
   * own button, which this leaves untouched.
   */
  @step
  async typeDraftName(): Promise<void> {
    await this.teamName.fill(DRAFT_NAME);
    await expect(this.teamName).toHaveValue(DRAFT_NAME);
  }

  /** Expects the name field to still hold the name typed but not submitted. */
  @step
  async expectDraftName(): Promise<void> {
    await expect(this.teamName).toHaveValue(DRAFT_NAME);
  }

  /**
   * Writes the new description with spaces around it, then takes the focus
   * off the field once, which saves it.
   */
  @step
  async writePaddedDescriptionAndLeave(): Promise<void> {
    await this.description.fill(PADDED_DESCRIPTION);
    await expect(this.description).toHaveValue(PADDED_DESCRIPTION);
    await this.description.blur();
  }

  /**
   * Expects the confirmation of the saved description, then the field to
   * hold the description trimmed, as the team loaded again after the save
   * supplies it.
   */
  @step
  async expectDescriptionUpdated(): Promise<void> {
    await expect(this.descriptionUpdated).toBeVisible();
    await expect(this.description).toHaveValue(NEW_DESCRIPTION);
  }

  /** Expects the new description, trimmed, in the description field. */
  @step
  async expectNewDescription(): Promise<void> {
    await expect(this.description).toHaveValue(NEW_DESCRIPTION);
  }

  /** Sets a deletion grace period above the platform cap and leaves the field. */
  @step
  async setGracePeriodAboveCap(): Promise<void> {
    await this.gracePeriod.fill(PERIOD_ABOVE_CAP);
    await this.gracePeriod.press("Tab");
  }

  /** Expects the deletion grace period refused as above the platform cap. */
  @step
  async expectGracePeriodRefused(): Promise<void> {
    await expect(this.aboveCap).toBeVisible();
    await expect(this.gracePeriod).toHaveAttribute("aria-invalid", "true");
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
  // The switch of the model whose row says that it cannot be disabled.
  private readonly defaultModel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Models");
    this.defaultModel = page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: "The default model cannot be disabled" })
      .getByRole("checkbox", { name: /^Enable .+ for the team$/ });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
  /** Expects the default model on, with a switch that cannot turn it off. */
  @step
  async expectDefaultModelFixed(): Promise<void> {
    await expect(this.defaultModel).toBeChecked();
    await expect(this.defaultModel).toBeDisabled();
  }
}
