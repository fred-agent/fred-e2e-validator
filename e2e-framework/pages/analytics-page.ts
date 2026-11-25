import {
  expect,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";
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

/** The periods the period list offers, by the labels of their buttons. */
export type AnalyticsPeriod = "Last 7 days" | "Last 30 days";

/** Time allowed for an export to start downloading. */
const EXPORT_TIMEOUT = 60_000;

/**
 * The console and team settings offer different analytics topics. Both have an
 * "Export" action.
 */
export class AnalyticsPage {
  static readonly displayName = "Analytics page";
  private readonly page: Page;
  private readonly heading: Locator;
  // It downloads the analytics of the chosen period.
  private readonly exportButton: Locator;
  private readonly buttons: Readonly<Record<AnalyticsButton, Locator>>;
  private readonly topics: Tabs<AnalyticsTopic>;
  // The period list, which the button named by the chosen period opens.
  private readonly periods: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Analytics");
    this.exportButton = page
      .getByRole("main")
      .getByRole("button", { name: "Export", exact: true });
    this.buttons = { Export: this.exportButton };
    this.periods = page.getByRole("main").getByRole("dialog");
    this.topics = new Tabs(
      page.getByRole("tablist", { name: "Topics", exact: true }),
    );
  }

  private period(name: AnalyticsPeriod): Locator {
    return this.page
      .getByRole("main")
      .getByRole("button", { name, exact: true });
  }

  /**
   * Chooses a period from the list that the period of a fresh page, "Last 30
   * days", opens; the button then names the chosen period.
   */
  @step
  async choosePeriod(name: AnalyticsPeriod): Promise<void> {
    await this.period("Last 30 days").click();
    await this.periods.getByRole("button", { name, exact: true }).click();
    await expect(this.periods).toBeHidden();
    await expect(this.period(name)).toBeVisible();
  }

  /** Exports the analytics of the chosen period and returns the download. */
  @step
  async exportWorkbook(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent("download", { timeout: EXPORT_TIMEOUT }),
      this.exportButton.click(),
    ]);
    return download;
  }

  /** Expects a download that arrived whole as a workbook. */
  @step
  async expectWorkbook(download: Download): Promise<void> {
    const failure = await download.failure();
    if (failure !== null)
      throw new Error(`The export of the analytics failed: ${failure}.`);
    const name = download.suggestedFilename();
    if (!name.endsWith(".xlsx"))
      throw new Error(`Fred exported "${name}", not a workbook (.xlsx).`);
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
