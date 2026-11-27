import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { WIKI_LINK } from "../pages/wiki-page.ts";

/** The sections of a personal or team space, by the labels of their links. */
export type SpaceSection = "Agents" | "Resources" | "Prompts" | "Wiki" | "Apps";

/** The sections of a personal or team space: Agents, Resources, Prompts, Wiki and, in a team space, Apps. */
export class SpaceNavigation {
  static readonly displayName = "Space menu";
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * A section's link, by its name, or for "Wiki" by the wiki page's pattern
   * for a name that may carry a badge. The record is built on each call, as
   * the wiki page imports this module.
   */
  private section(name: SpaceSection): Locator {
    const links: Readonly<Record<SpaceSection, string | RegExp>> = {
      Agents: "Agents",
      Resources: "Resources",
      Prompts: "Prompts",
      Wiki: WIKI_LINK,
      Apps: "Apps",
    };
    return this.page.getByRole("link", { name: links[name], exact: true });
  }

  /** Opens a section and waits for its link to be marked as the current page. */
  @step
  async goTo(name: SpaceSection): Promise<void> {
    await expect(this.section(name)).toBeVisible();
    await this.section(name).click();
    await expect(this.section(name)).toHaveAttribute("aria-current", "page");
  }
}
