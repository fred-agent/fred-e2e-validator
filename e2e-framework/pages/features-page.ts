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
export type TeamCapability =
  | "Generate a presentation"
  | "Team wiki"
  | "Generate a web page (HTML/CSS)"
  | "Fill a PowerPoint file";

/**
 * A team's own access to a feature that a team is created with, as "Manage
 * by team" offers it: "Enable" or "Disable".
 */
export type FeatureAccess = Exclude<TeamAccessChoice, "Default">;

/**
 * What a capability gives every team and every personal space: its switch
 * "Enabled for all" and the choice of its row "All personal spaces". A test
 * reads both before it creates its teams and never changes them.
 */
export type SharedAccess = Readonly<{
  capability: TeamCapability;
  enabledForAll: boolean;
  personalSpaces: TeamAccessChoice;
}>;

/** The address of the features page. */
const FEATURES_ADDRESS = /\/admin\/features$/;

function onOrOff(on: boolean): string {
  return on ? "on" : "off";
}

/**
 * "Manage by team" changes access for one team. The "Enabled for all" switch
 * applies immediately to every team, so team-specific changes use the panel
 * and the switch is only read.
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

  /** A row's switch "Enabled for all", which a test only reads. */
  private enabledForAll(row: Locator): Locator {
    return row.getByRole("checkbox", { name: "Enabled for all", exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.kinds).toBeVisible();
  }

  /**
   * Expects the filter by kind open on "Capabilities" and the capabilities
   * listed, each with its switch "Enabled for all".
   */
  @step
  async expectCapabilitiesListed(): Promise<void> {
    await expect(this.kind("Capabilities")).toBeChecked();
    const first = this.features.rows.first();
    await expect(first).toBeVisible();
    await expect(this.enabledForAll(first)).toBeVisible();
  }

  /**
   * Sets one team's own access to a capability, on the open features page;
   * "Default" removes it, so the team follows "Enabled for all".
   */
  @step
  async setCapabilityAccess(
    capability: TeamCapability,
    team: string,
    access: TeamAccessChoice,
  ): Promise<void> {
    await this.setTeamAccess("Capabilities", capability, team, access);
  }

  /**
   * On the open features page, expects a capability's "Enabled for all" to
   * be as the test relies on, and reads the choice of "All personal spaces".
   * Nothing is changed.
   */
  @step
  async readSharedAccess(
    capability: TeamCapability,
    enabledForAll: boolean,
  ): Promise<SharedAccess> {
    const row = this.features.row(capability);
    await this.showFeature("Capabilities", capability, row);
    await expect(
      this.enabledForAll(row),
      `"Enabled for all" of "${capability}" is ${onOrOff(!enabledForAll)}; the test relies on it being ${onOrOff(enabledForAll)}`,
    ).toBeChecked({ checked: enabledForAll });
    await this.openTeamAccess(row);
    const personalSpaces = await this.teamAccess.readPersonalSpaces(capability);
    await this.teamAccess.close(capability);
    return Object.freeze({ capability, enabledForAll, personalSpaces });
  }

  /**
   * On the open features page, expects a capability's "Enabled for all" and
   * the choice of "All personal spaces" to be as `readSharedAccess` read them.
   * Nothing is changed.
   */
  @step
  async expectSharedAccess(shared: SharedAccess): Promise<void> {
    const { capability, enabledForAll, personalSpaces } = shared;
    const row = this.features.row(capability);
    await this.showFeature("Capabilities", capability, row);
    await this.openTeamAccess(row);
    await this.teamAccess.expectPersonalSpaces(capability, personalSpaces);
    await this.teamAccess.close(capability);
    await expect(
      this.enabledForAll(row),
      `"Enabled for all" of "${capability}" is no longer ${onOrOff(enabledForAll)}`,
    ).toBeChecked({ checked: enabledForAll });
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

  /** Chooses the kind in the filter and expects the feature's row listed. */
  private async showFeature(
    kind: FeatureKind,
    feature: string,
    row: Locator,
  ): Promise<void> {
    await expect(this.page).toHaveURL(FEATURES_ADDRESS);
    await this.expectShown();
    const choice = this.kind(kind);
    await choice.click();
    await expect(choice).toBeChecked();
    await expect(
      row,
      `The features of the kind "${kind}" list no "${feature}"`,
    ).toBeVisible();
  }

  /** Opens the panel of a feature's row; the panel waits until it shows. */
  private async openTeamAccess(row: Locator): Promise<void> {
    await row
      .getByRole("button", { name: "Manage by team", exact: true })
      .click();
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
    access: TeamAccessChoice,
  ): Promise<void> {
    const row = this.features.row(feature);
    await this.showFeature(kind, feature, row);
    await this.openTeamAccess(row);
    await this.teamAccess.findTeam(feature, team);
    await this.teamAccess.choose(feature, team, access);
    await this.teamAccess.expectChanged(feature, team, access);
    await this.teamAccess.close(feature);
  }
}
