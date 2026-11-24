import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { literal } from "./text-patterns.ts";

/**
 * The confirmation names the team and the access change. Disabling a feature
 * can also report how many agents were suspended. The toast's icon ligature
 * precedes its message, so the text match allows a prefix.
 */
const CONFIRMATIONS = {
  Enable: (team: string) =>
    new RegExp(`Feature enabled for ${literal(team)}\\.`),
  Disable: (team: string) =>
    new RegExp(
      `(Feature disabled for ${literal(team)}\\.|Disabled for ${literal(team)} — )`,
    ),
} as const;

/** The choices of a team's row that this panel makes: never "Default". */
export type TeamAccessChoice = keyof typeof CONFIRMATIONS;

/**
 * Each team has an access row with "Disable", "Default" and "Enable". Agent
 * templates also have a row for all personal spaces. Searching by team name
 * hides the personal spaces row so the choice applies to the team alone.
 * Choosing an option saves it immediately.
 */
export class TeamAccessPanel {
  static readonly displayName = "Team access panel";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private panel(feature: string): Locator {
    return this.page.getByRole("complementary", {
      name: `${feature} — team access`,
      exact: true,
    });
  }

  /** The team's radio group, named after the team. */
  private access(feature: string, team: string): Locator {
    return this.panel(feature).getByRole("radiogroup", {
      name: `Access for ${team}`,
      exact: true,
    });
  }

  private choice(
    feature: string,
    team: string,
    choice: TeamAccessChoice,
  ): Locator {
    return this.access(feature, team).getByRole("radio", {
      name: choice,
      exact: true,
    });
  }

  /** A short-lived toast confirms the team's new access setting. */
  private confirmation(team: string, choice: TeamAccessChoice): Locator {
    return this.page
      .getByRole("alert")
      .filter({ hasText: CONFIRMATIONS[choice](team) });
  }

  /** The team row stays busy until the catalog refreshes after a change. */
  private row(feature: string, team: string): Locator {
    return this.panel(feature)
      .getByRole("listitem")
      .filter({
        has: this.page.getByRole("radiogroup", {
          name: `Access for ${team}`,
          exact: true,
        }),
      });
  }

  /** Searches the open panel for a team, which must then be listed. */
  @step
  async findTeam(feature: string, team: string): Promise<void> {
    const panel = this.panel(feature);
    await expect(panel).toBeVisible();
    await panel
      .getByRole("textbox", { name: "Search teams...", exact: true })
      .fill(team);
    await expect(
      this.access(feature, team),
      `The team access of "${feature}" lists no team "${team}"`,
    ).toBeVisible();
  }

  /**
   * A new team starts with "Default" access. Choose a different setting only
   * after any earlier confirmation for the same team and choice disappears,
   * so the next toast confirms this change.
   */
  @step
  async choose(
    feature: string,
    team: string,
    choice: TeamAccessChoice,
  ): Promise<void> {
    const radio = this.choice(feature, team, choice);
    await expect(
      radio,
      `The team access of "${feature}" already holds "${choice}" for the team "${team}"`,
    ).not.toBeChecked();
    await expect(
      this.confirmation(team, choice),
      `An earlier confirmation of "${choice}" for the team "${team}" is still shown`,
    ).toHaveCount(0);
    await radio.click();
  }

  /**
   * Waits for the confirmation naming the team, then checks the saved choice
   * after the refreshed row stops being busy.
   */
  @step
  async expectChanged(
    feature: string,
    team: string,
    choice: TeamAccessChoice,
  ): Promise<void> {
    await expect(this.confirmation(team, choice)).toBeVisible();
    await expect(this.row(feature, team)).toHaveAttribute("aria-busy", "false");
    await expect(this.choice(feature, team, choice)).toBeChecked();
  }

  @step
  async close(feature: string): Promise<void> {
    const panel = this.panel(feature);
    await panel
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
    await expect(panel).toBeHidden();
  }
}
