import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { literal, quoted } from "./text-patterns.ts";

/**
 * The confirmation names the team and the access change. Disabling a feature,
 * or setting it back to the default, can also report how many agents were
 * suspended. The toast's icon ligature precedes its message, so the text
 * match allows a prefix.
 */
const CONFIRMATIONS = {
  Enable: (team: string) =>
    new RegExp(`Feature enabled for ${literal(team)}\\.`),
  Disable: (team: string) =>
    new RegExp(
      `(Feature disabled for ${literal(team)}\\.|Disabled for ${literal(team)} — )`,
    ),
  Default: (team: string) =>
    new RegExp(
      `${literal(team)} now follows the platform default( — \\d+ instance\\(s\\) suspended)?\\.`,
    ),
} as const;

/**
 * The choices of a team's row. "Default" removes the team's own setting, so
 * the team follows "Enabled for all".
 */
export type TeamAccessChoice = keyof typeof CONFIRMATIONS;

/** The choices of a row, in the panel's order, to read the one it holds. */
const CHOICES: readonly TeamAccessChoice[] = ["Disable", "Default", "Enable"];

/** The row for every user's personal space at once, named like a team's. */
const PERSONAL_SPACES = "All personal spaces";

/**
 * Each team has an access row with "Disable", "Default" and "Enable". Every
 * kind but apps and knowledge bases also has the row "All personal spaces"
 * at the top of the list. Searching by team name hides that row, so the
 * choice applies to the team alone. Choosing an option saves it immediately.
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

  private search(feature: string): Locator {
    return this.panel(feature).getByRole("textbox", {
      name: "Search teams...",
      exact: true,
    });
  }

  /**
   * Empties the search, which shows the row "All personal spaces" again, and
   * waits until that row is no longer busy.
   */
  private async showPersonalSpaces(feature: string): Promise<Locator> {
    await expect(this.panel(feature)).toBeVisible();
    const search = this.search(feature);
    await search.clear();
    await expect(search).toHaveValue("");
    const access = this.access(feature, PERSONAL_SPACES);
    await expect(
      access,
      `The team access of "${feature}" shows no row "${PERSONAL_SPACES}"`,
    ).toBeVisible();
    await expect(this.row(feature, PERSONAL_SPACES)).toHaveAttribute(
      "aria-busy",
      "false",
    );
    return access;
  }

  /** Searches the open panel for a team, which must then be listed. */
  @step
  async findTeam(feature: string, team: string): Promise<void> {
    await expect(this.panel(feature)).toBeVisible();
    await this.search(feature).fill(team);
    await expect(
      this.access(feature, team),
      `The team access of "${feature}" lists no team "${team}"`,
    ).toBeVisible();
  }

  /**
   * Reads the choice that "All personal spaces" holds, with the search
   * empty. Nothing is chosen.
   */
  @step
  async readPersonalSpaces(feature: string): Promise<TeamAccessChoice> {
    const access = await this.showPersonalSpaces(feature);
    await expect(
      access.getByRole("radio", { checked: true }),
      `"${PERSONAL_SPACES}" of "${feature}" holds no single choice`,
    ).toHaveCount(1);
    for (const choice of CHOICES)
      if (await this.choice(feature, PERSONAL_SPACES, choice).isChecked())
        return choice;
    throw new Error(
      `"${PERSONAL_SPACES}" of "${feature}" holds none of the choices ${quoted(CHOICES)}.`,
    );
  }

  /** Expects "All personal spaces" to hold a choice, with the search empty. */
  @step
  async expectPersonalSpaces(
    feature: string,
    choice: TeamAccessChoice,
  ): Promise<void> {
    await this.showPersonalSpaces(feature);
    await expect(
      this.choice(feature, PERSONAL_SPACES, choice),
      `"${PERSONAL_SPACES}" of "${feature}" no longer holds "${choice}"`,
    ).toBeChecked();
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
