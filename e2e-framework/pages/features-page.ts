import { expect, type Locator, type Page } from "@playwright/test";
import { DataTable } from "../components/data-table.ts";
import {
  TeamAccessPanel,
  type TeamAccessChoice,
} from "../components/team-access-panel.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The kinds of feature a test sets for its team, by their labels in the filter. */
type FeatureKind = "Agents" | "Capabilities";

/** The capabilities a test sets for its team, by their names in the list. */
export type TeamCapability = "Generate a presentation" | "Team wiki";

/**
 * A team's own access to a feature, as "Manage by team" offers it: "Enable"
 * or "Disable". "Default", which follows the setting for all teams, is never
 * chosen.
 */
export type FeatureAccess = TeamAccessChoice;

/** The address of the features page. */
const FEATURES_ADDRESS = /\/admin\/features$/;

/**
 * "Manage by team" changes access for one team. The "Enabled for all" switch
 * applies immediately to every team, so team-specific changes use the panel.
 */
export class FeaturesPage {
  static readonly displayName = "Features page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly kinds: Locator;
  // The listed features of the chosen kind.
  private readonly features: DataTable;
  private readonly teamAccess: TeamAccessPanel;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Features");
    this.kinds = page.getByRole("main").getByRole("radiogroup", {
      name: "Filter by feature kind",
      exact: true,
    });
    this.features = new DataTable(page);
    this.teamAccess = new TeamAccessPanel(page);
  }

  /** A kind's choice in the filter. */
  private kind(label: FeatureKind): Locator {
    return this.kinds.getByRole("radio", { name: label, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.kinds).toBeVisible();
  }

  /** Sets one team's own access to a capability, on the open features page. */
  @step
  async setCapabilityAccess(
    capability: TeamCapability,
    team: string,
    access: FeatureAccess,
  ): Promise<void> {
    await this.setTeamAccess("Capabilities", capability, team, access);
  }

  /**
   * Sets one team's own access to an agent template, a name of the test
   * data, on the open features page.
   */
  @step
  async setAgentTemplateAccess(
    template: string,
    team: string,
    access: FeatureAccess,
  ): Promise<void> {
    await this.setTeamAccess("Agents", template, team, access);
  }

  /**
   * Filter by kind and open "Manage by team" on the feature's row. Find the
   * team and choose a different access setting. Wait for confirmation and the
   * updated choice on that team's row before closing the panel.
   */
  private async setTeamAccess(
    kind: FeatureKind,
    feature: string,
    team: string,
    access: FeatureAccess,
  ): Promise<void> {
    await expect(this.page).toHaveURL(FEATURES_ADDRESS);
    await this.expectShown();
    const choice = this.kind(kind);
    await choice.click();
    await expect(choice).toBeChecked();
    const row = this.features.row(feature);
    await expect(
      row,
      `The features of the kind "${kind}" list no "${feature}"`,
    ).toBeVisible();
    await row
      .getByRole("button", { name: "Manage by team", exact: true })
      .click();
    await this.teamAccess.findTeam(feature, team);
    await this.teamAccess.choose(feature, team, access);
    await this.teamAccess.expectChanged(feature, team, access);
    await this.teamAccess.close(feature);
  }
}
