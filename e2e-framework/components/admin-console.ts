import { expect, type Locator, type Page } from "@playwright/test";
import { AdminTeamsPage } from "../pages/admin-teams-page.ts";
import { AnalyticsPage } from "../pages/analytics-page.ts";
import { AnnouncementsPage } from "../pages/announcements-page.ts";
import {
  ActivityPage,
  CorpusAuditPage,
  PlatformPromptsPage,
} from "../pages/console-views-pages.ts";
import { FeaturesPage } from "../pages/features-page.ts";
import { MarketplaceSettingsPage } from "../pages/marketplace-settings-page.ts";
import { PlatformAccessPage } from "../pages/platform-access-page.ts";
import { PlatformDataPage } from "../pages/platform-data-page.ts";
import { PlatformRolesPage } from "../pages/platform-roles-page.ts";
import { SelfTestPage } from "../pages/self-test-page.ts";
import { UserInterfacePage } from "../pages/user-interface-page.ts";
import { step } from "../pages/step.ts";
import { MainNavigation } from "./main-navigation.ts";
import { literal } from "./text-patterns.ts";

/**
 * The sections of the technical console the tests open, by the labels of
 * their links, each with a page object.
 */
export type ConsoleSection =
  | "Teams"
  | "Platform roles"
  | "Activity"
  | "Analytics"
  | "Platform prompts"
  | "Announcements"
  | "User interface"
  | "Features"
  | "Marketplaces"
  | "Platform data"
  | "Corpus audit"
  | "Self-test"
  | "Platform access";

/**
 * The main navigation opens the technical console on "Teams". Its side panel
 * links to each section, including "Marketplaces".
 */
export class AdminConsole {
  static readonly displayName = "Technical console";
  private readonly page: Page;
  private readonly navigation: MainNavigation;

  constructor(page: Page) {
    this.page = page;
    this.navigation = new MainNavigation(page);
  }

  /**
   * A section link. A link may carry a count after its name, such as the
   * number of active tasks, so it is matched by its first word or words.
   */
  private section(name: ConsoleSection): Locator {
    return this.page.getByRole("link", {
      name: new RegExp(`^${literal(name)}( |$)`),
    });
  }

  @step
  async open(): Promise<void> {
    await this.navigation.goTo("Technical console");
    await expect(this.page).toHaveURL(/\/admin\//);
  }

  /** Opens a section and waits for its link to be marked as the current page. */
  @step
  async goTo(name: ConsoleSection): Promise<void> {
    await this.section(name).click();
    await expect(this.section(name)).toHaveAttribute("aria-current", "page");
  }

  /** Expects a section to be the open one and its page to show. */
  @step
  async expectSectionShown(name: ConsoleSection): Promise<void> {
    await expect(this.section(name)).toHaveAttribute("aria-current", "page");
    switch (name) {
      case "Teams":
        return new AdminTeamsPage(this.page).expectShown();
      case "Platform roles":
        return new PlatformRolesPage(this.page).expectShown();
      case "Activity":
        return new ActivityPage(this.page).expectShown();
      case "Analytics":
        return new AnalyticsPage(this.page).expectShown();
      case "Platform prompts":
        return new PlatformPromptsPage(this.page).expectShown();
      case "Announcements":
        return new AnnouncementsPage(this.page).expectShown();
      case "User interface":
        return new UserInterfacePage(this.page).expectShown();
      case "Features":
        return new FeaturesPage(this.page).expectShown();
      case "Marketplaces":
        return new MarketplaceSettingsPage(this.page).expectShown();
      case "Platform data":
        return new PlatformDataPage(this.page).expectShown();
      case "Corpus audit":
        return new CorpusAuditPage(this.page).expectShown();
      case "Self-test":
        return new SelfTestPage(this.page).expectShown();
      case "Platform access":
        return new PlatformAccessPage(this.page).expectShown();
      default: {
        const unknown: never = name;
        throw new Error(
          `The technical console has no section "${String(unknown)}".`,
        );
      }
    }
  }
}
