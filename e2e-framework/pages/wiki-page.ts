import { expect, type Locator, type Page } from "@playwright/test";
import { SpaceNavigation } from "../components/space-navigation.ts";
import { step } from "./step.ts";

export const WIKI_LINK = /^Wiki( Beta)?$/;

/** The page every agent with wiki access reads, as the page list names it. */
const AGENT_RULES = "Agent rules";

/** The address of a team's wiki. */
const WIKI_ADDRESS = /\/team\/[^/]+\/wiki$/;

/**
 * Enabling the team wiki gives the team an agent rules page. The page list
 * appears after the request completes. A failed request can also show an empty
 * wiki.
 */
export class WikiPage {
  static readonly displayName = "Wiki page";
  private readonly page: Page;
  private readonly pageList: Locator;
  private readonly rulesButton: Locator;
  // The open page: its title and its version history.
  private readonly title: Locator;
  private readonly history: Locator;
  // The open page's version history: a side panel that stays in the page
  // while closed, off to the side and inert.
  private readonly historyPanel: Locator;
  private readonly closeHistory: Locator;
  // What the history shows for a page that has no earlier version.
  private readonly noEarlierVersion: Locator;
  private readonly spaceNavigation: SpaceNavigation;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.pageList = main.getByRole("navigation", {
      name: "Wiki pages",
      exact: true,
    });
    this.rulesButton = this.pageList.getByRole("button", {
      name: AGENT_RULES,
      exact: true,
    });
    const article = main.getByRole("article");
    this.title = article.getByRole("heading", { level: 1 });
    this.history = article.getByRole("button", {
      name: "Version history",
      exact: true,
    });
    this.historyPanel = page.getByRole("complementary", {
      name: "Version history",
      exact: true,
    });
    this.closeHistory = this.historyPanel.getByRole("button", {
      name: "Close the history",
      exact: true,
    });
    this.noEarlierVersion = this.historyPanel.getByText(
      "No earlier versions.",
      { exact: true },
    );
    this.spaceNavigation = new SpaceNavigation(page);
  }

  /** Opens the wiki from the current space and waits for the page list. */
  @step
  async open(): Promise<void> {
    await this.spaceNavigation.goTo("Wiki");
    await expect(this.page).toHaveURL(WIKI_ADDRESS);
    await expect(this.pageList).toBeVisible();
  }

  /** Opens the "Agent rules" page from the page list. */
  @step
  async openRules(): Promise<void> {
    await this.rulesButton.click();
    await expect(this.title).toHaveText(AGENT_RULES);
    await expect(this.history).toBeVisible();
  }

  /**
   * A new team's agent rules have no previous version. The history panel stays
   * in the document while closed, so its open state must be checked before
   * reading the empty message.
   */
  @step
  async expectEmptyHistory(): Promise<void> {
    await this.history.click();
    await expect(this.historyPanel).toBeVisible();
    await expect(this.historyPanel).not.toHaveAttribute("inert");
    await expect(this.noEarlierVersion).toBeVisible();
    await this.closeHistory.click();
    await expect(this.historyPanel).toHaveAttribute("inert");
  }
}
