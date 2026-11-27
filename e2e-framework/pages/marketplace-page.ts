import { expect, type Locator, type Page } from "@playwright/test";
import { ImportAgentDialog } from "../components/agent-dialogs.ts";
import { MainNavigation } from "../components/main-navigation.ts";
import { literal } from "../components/text-patterns.ts";
import { step } from "./step.ts";

/** The kinds of content, by their labels in the marketplace's side panel. */
export type MarketplaceKind = "Teams" | "Agents" | "Prompts";

/**
 * These content types always have a search field. Agent search appears only
 * when agents are listed.
 */
export type MarketplaceSearch = Exclude<MarketplaceKind, "Agents">;

/**
 * Agent and prompt headings appear after their lists load. The teams heading
 * also requires that the user belongs to a team.
 */
const KIND_HEADINGS: Readonly<Record<MarketplaceKind, string>> = {
  Teams: "Community teams",
  Agents: "Community agents",
  Prompts: "Community prompts",
};

/** The content type selected on entry from the main navigation. */
const OPENING_KIND: MarketplaceKind = "Teams";

/**
 * The marketplace opens on community teams for users with a team membership.
 * The side panel also lists shared agents and prompts.
 */
export class MarketplacePage {
  static readonly displayName = "Marketplace page";
  private readonly page: Page;
  private readonly searches: Readonly<Record<MarketplaceSearch, Locator>>;
  private readonly navigation: MainNavigation;
  private readonly importDialog: ImportAgentDialog;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.searches = {
      Teams: main.getByRole("textbox", {
        name: "Search for a team",
        exact: true,
      }),
      Prompts: main.getByRole("textbox", {
        name: "Search a prompt...",
        exact: true,
      }),
    };
    this.navigation = new MainNavigation(page);
    this.importDialog = new ImportAgentDialog(page);
  }

  /**
   * A community agent's card, by the agent's name. The cards and their names
   * have no ARIA role or test ID: their CSS module classes contain
   * "agentCard" and "agentName".
   */
  private agent(name: string): Locator {
    return this.page
      .getByRole("main")
      .locator('[class*="agentCard"]')
      .filter({
        has: this.page
          .locator('[class*="agentName"]')
          .filter({ hasText: new RegExp(`^${literal(name)}$`) }),
      });
  }

  /** The like button of an agent's card, named by its count of likes. */
  private like(name: string): Locator {
    return this.agent(name).getByRole("button", {
      name: /^Like this agent \(\d+ likes?\)$/,
    });
  }

  @step
  async expectAgentListed(name: string): Promise<void> {
    await expect(this.agent(name)).toBeVisible();
  }

  /** Likes an agent the user has not liked; the button is then pressed. */
  @step
  async likeAgent(name: string): Promise<void> {
    await expect(this.like(name)).toHaveAttribute("aria-pressed", "false");
    await this.like(name).click();
    await expect(this.like(name)).toHaveAttribute("aria-pressed", "true");
  }

  /** Expects an agent's count of likes. */
  @step
  async expectLikes(name: string, count: number): Promise<void> {
    await expect(this.like(name)).toHaveAccessibleName(
      `Like this agent (${count} ${count === 1 ? "like" : "likes"})`,
    );
  }

  /** Imports a community agent into a space. */
  @step
  async importAgent(name: string, space: string): Promise<void> {
    await this.agent(name)
      .getByRole("button", { name: /^Import this agent / })
      .click();
    await this.importDialog.importInto(name, space);
  }

  /** A kind's link in the side panel. */
  private kindLink(kind: MarketplaceKind): Locator {
    return this.page.getByRole("link", { name: kind, exact: true });
  }

  private kindHeading(kind: MarketplaceKind): Locator {
    return this.page.getByRole("main").getByRole("heading", {
      level: 1,
      name: KIND_HEADINGS[kind],
      exact: true,
    });
  }

  /**
   * Opens the marketplace from the home page, chooses a content type in the
   * side panel, and checks that its link is current.
   */
  @step
  async browse(kind: MarketplaceKind): Promise<void> {
    const link = this.kindLink(kind);
    await this.page.goto("/");
    await this.navigation.goTo("Marketplace");
    await expect(this.kindHeading(OPENING_KIND)).toBeVisible();
    await link.click();
    await expect(link).toHaveAttribute("aria-current", "page");
  }

  /** Expects a kind to be chosen and its heading to be shown. */
  @step
  async expectKind(kind: MarketplaceKind): Promise<void> {
    await expect(this.kindLink(kind)).toHaveAttribute("aria-current", "page");
    await expect(this.kindHeading(kind)).toBeVisible();
  }

  /** Expects a kind to be chosen and to offer its search. */
  @step
  async expectSearch(kind: MarketplaceSearch): Promise<void> {
    await this.expectKind(kind);
    await expect(this.searches[kind]).toBeVisible();
  }
}
