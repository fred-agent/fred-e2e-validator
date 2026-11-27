import { expect, type Locator, type Page } from "@playwright/test";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

// Sections of the technical console that a test reads: the platform's
// activity, the corpus audit and the platform prompts. Each is a small page
// object; nothing here saves a change.

/** The prompts of the platform, by the labels of their tabs. */
export type PlatformPrompt = "Platform system prompt" | "Creation assistant";

/** The console's "Activity": the platform's tasks, grouped by their state. */
export class ActivityPage {
  static readonly displayName = "Activity page";
  private readonly page: Page;
  private readonly heading: Locator;
  // The title of a group, which its count follows, or the text of no task in
  // progress.
  private readonly groups: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Activity");
    const main = page.getByRole("main");
    this.groups = main
      .getByText(/^(In progress|Completed)( \d+)?$/)
      .or(main.getByText("No tasks in progress", { exact: true }));
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /** Expects a group of tasks by state, or the text that no task is in progress. */
  @step
  async expectTaskGroups(): Promise<void> {
    await expect(this.groups.first()).toBeVisible();
  }
}

/** The console's "Corpus audit": the documents' records against the stores. */
export class CorpusAuditPage {
  static readonly displayName = "Corpus audit page";
  private readonly page: Page;
  private readonly heading: Locator;
  // Says that anomalies were found, or that the stores are in sync.
  private readonly result: Locator;
  private readonly repair: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Corpus audit");
    const main = page.getByRole("main");
    this.result = main
      .getByRole("status")
      .filter({ hasText: /(anomal|in sync)/ });
    this.repair = main.getByRole("button", {
      name: "Repair documents",
      exact: true,
    });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /** Expects the audit's result and "Repair documents"; nothing is repaired. */
  @step
  async expectResult(): Promise<void> {
    await expect(this.result).toBeVisible();
    await expect(this.repair).toBeVisible();
  }
}

/** The console's "Platform prompts": the platform system prompt and the creation assistant. */
export class PlatformPromptsPage {
  static readonly displayName = "Platform prompts page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly tabs: Locator;
  private readonly text: Locator;
  // The count of the prompt's characters under its text.
  private readonly length: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Platform prompts");
    const main = page.getByRole("main");
    this.tabs = main.getByRole("tablist", {
      name: "Platform prompts",
      exact: true,
    });
    this.text = main.getByRole("textbox", { name: "Prompt text", exact: true });
    this.length = main.getByText(/^\d+ \/ \d+$/);
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.tabs).toBeVisible();
  }

  /** Chooses a prompt's tab. */
  @step
  async choose(prompt: PlatformPrompt): Promise<void> {
    const tab = this.tabs.getByRole("tab", { name: prompt, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }

  /** Expects the open prompt's "Prompt text" with the count of its characters. */
  @step
  async expectText(): Promise<void> {
    await expect(this.text).toBeVisible();
    await expect(this.length).toBeVisible();
  }
}
