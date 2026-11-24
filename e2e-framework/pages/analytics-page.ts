import { expect, type Locator, type Page } from "@playwright/test";
import { Tabs } from "../components/tabs.ts";
import { expectButtonVisible } from "./buttons.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The buttons of the analytics page a test checks by name. */
export type AnalyticsButton = "Export";

/**
 * The topics of the analytics, by the labels of their tabs; "Agents and
 * tools" carries the platform's name for agents. A team's analytics add
 * "My usage" and leave out "Technical", which the platform's analytics show.
 */
export type AnalyticsTopic =
  | "Overview"
  | "Adoption"
  | "Usage"
  | "Teams"
  | "Agents and tools"
  | "Quality and cost"
  | "Technical"
  | "My usage";

/**
 * The console and team settings offer different analytics topics. Both have an
 * "Export" action.
 */
export class AnalyticsPage {
  static readonly displayName = "Analytics page";
  private readonly page: Page;
  private readonly heading: Locator;
  // It downloads the analytics of the period: nothing here clicks it.
  private readonly exportButton: Locator;
  private readonly buttons: Readonly<Record<AnalyticsButton, Locator>>;
  private readonly topics: Tabs<AnalyticsTopic>;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Analytics");
    this.exportButton = page
      .getByRole("main")
      .getByRole("button", { name: "Export", exact: true });
    this.buttons = { Export: this.exportButton };
    this.topics = new Tabs(
      page.getByRole("tablist", { name: "Topics", exact: true }),
    );
  }

  /** The selected topic supplies the panel's accessible name. */
  private topicPanel(name: AnalyticsTopic): Locator {
    return this.page.getByRole("tabpanel", { name, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await this.topics.expectShown();
  }

  /** Selects a topic and checks its tab. */
  @step
  async chooseTopic(name: AnalyticsTopic): Promise<void> {
    await this.topics.select(name);
  }

  @step
  async expectButtonVisible(name: AnalyticsButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /** Expects a topic's tab to be selected and its panel to be shown. */
  @step
  async expectTopic(name: AnalyticsTopic): Promise<void> {
    await this.topics.expectSelected(name);
    await expect(this.topicPanel(name)).toBeVisible();
  }
}
