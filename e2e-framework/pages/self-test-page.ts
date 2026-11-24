import { expect, type Locator, type Page } from "@playwright/test";
import { expectButtonVisible } from "./buttons.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The buttons of the self-test page a test checks by name. */
export type SelfTestButton = "Run all";

/** The section titles group self-tests by area. */
export type SelfTestArea =
  | "Platform"
  | "Identity and session"
  | "Documents and knowledge"
  | "Agents"
  | "Prompts"
  | "Conversations"
  | "Teams"
  | "Web research"
  | "Security"
  | "Observability"
  | "Authorization";

/**
 * The platform's self-test, by area, each with its own "Run", and "Run all".
 * A run creates and deletes test data on the real services, so nothing here
 * runs it.
 */
export class SelfTestPage {
  static readonly displayName = "Self-test page";
  private readonly page: Page;
  private readonly heading: Locator;
  // It runs every area's tests: nothing here clicks it.
  private readonly runAll: Locator;
  private readonly buttons: Readonly<Record<SelfTestButton, Locator>>;

  constructor(page: Page) {
    this.page = page;
    this.heading = pageHeading(page, "Self-test");
    this.runAll = page
      .getByRole("main")
      .getByRole("button", { name: "Run all", exact: true });
    this.buttons = { "Run all": this.runAll };
  }

  /** An area's title, a level 2 heading. */
  private area(title: SelfTestArea): Locator {
    return this.page
      .getByRole("main")
      .getByRole("heading", { level: 2, name: title, exact: true });
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  @step
  async expectButtonVisible(name: SelfTestButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /** Expects an area's title, such as "Security". */
  @step
  async expectArea(title: SelfTestArea): Promise<void> {
    await expect(this.area(title)).toBeVisible();
  }
}
