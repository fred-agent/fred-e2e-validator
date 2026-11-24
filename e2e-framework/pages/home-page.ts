import { expect, type Locator, type Page } from "@playwright/test";
import { AccountMenu, accountMenuButton } from "../components/account-menu.ts";
import { MainNavigation } from "../components/main-navigation.ts";
import type { Account, AccountName } from "../config/accounts.ts";
import { signInButton } from "./sign-in-page.ts";
import { step } from "./step.ts";
import { termsTitle } from "./terms-page.ts";
import { FRED_START_TIMEOUT } from "./waits.ts";

/** Sign-in states a new browser context can show on its first load. */
export type SignInState = "signed in" | "sign-in form" | "terms";

/**
 * "Your activity" appears in "Home sections" only when activity figures are
 * available.
 */
export type HomeSection = "Quick access" | "Your activity" | "Trending";

/** The greeting at the top of the home page. */
export type HomeGreeting = "Hello";

/** The sections that show the period selector. */
export type PeriodSection = Exclude<HomeSection, "Quick access">;

/** The periods of "Your activity" and "Trending", by their labels. */
export type HomePeriod = "7d" | "30d" | "90d";

/** How each figure of "Your activity" names the period it covers. */
const ACTIVITY_CAPTIONS: Readonly<Record<HomePeriod, string>> = {
  "7d": "over the last 7 days",
  "30d": "over the last 30 days",
  "90d": "over the last 90 days",
};

/** The home page's link to the signed-in user's personal space. */
const PERSONAL_SPACE = "Personal space";

/**
 * The link points to the user's own personal space once the bootstrap
 * response supplies their teams.
 */
const PERSONAL_SPACE_ADDRESS = /^\/team\/personal-[^/]+\//;

/**
 * The home page shows one section at a time. "Quick access" shows search. The
 * other sections show figures for the selected period.
 */
export class HomePage {
  static readonly displayName = "Home page";
  private readonly page: Page;
  private readonly sections: Locator;
  private readonly greeting: Locator;
  // "Your activity" and "Trending" only.
  private readonly period: Locator;
  private readonly personalSpace: Locator;
  private readonly signedIn: Locator;
  private readonly signInForm: Locator;
  private readonly terms: Locator;
  /**
   * What each section shows: the search on "Quick access", whichever home
   * layout the platform uses, and a region on the others.
   */
  private readonly sectionContents: Readonly<Record<HomeSection, Locator>>;
  private readonly navigation: MainNavigation;
  private readonly accountMenu: AccountMenu;

  constructor(page: Page) {
    this.page = page;
    this.sections = page.getByRole("radiogroup", {
      name: "Home sections",
      exact: true,
    });
    this.greeting = page.getByRole("heading", { level: 1 });
    this.period = page.getByRole("radiogroup", { name: "Period", exact: true });
    this.personalSpace = page.getByRole("link", {
      name: PERSONAL_SPACE,
      exact: true,
    });
    this.signedIn = accountMenuButton(page);
    this.signInForm = signInButton(page);
    this.terms = termsTitle(page);
    const main = page.getByRole("main");
    this.sectionContents = {
      "Quick access": main.getByRole("combobox", {
        name: "Search agents, teams, prompts…",
        exact: true,
      }),
      "Your activity": main.getByRole("region", {
        name: "Your activity",
        exact: true,
      }),
      Trending: main.getByRole("region", {
        name: "Marketplace · Top 8 most-used prompts",
        exact: true,
      }),
    };
    this.navigation = new MainNavigation(page);
    this.accountMenu = new AccountMenu(page);
  }

  /** A space link: "Personal space" or a team's name. */
  private space(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  private sectionChoice(section: HomeSection): Locator {
    return this.sections.getByRole("radio", { name: section, exact: true });
  }

  private periodChoice(period: HomePeriod): Locator {
    return this.period.getByRole("radio", { name: period, exact: true });
  }

  @step
  async open(): Promise<void> {
    await this.page.goto("/");
  }

  /**
   * On first load, allow the startup timeout for the account menu, sign-in form
   * or terms to appear. The failure message identifies the account and worker.
   */
  @step
  async openAndReadSignInState(
    account: AccountName,
    worker: number,
  ): Promise<SignInState> {
    await this.page.goto("/");
    await expect(
      this.signedIn.or(this.signInForm).or(this.terms).first(),
      `Fred showed ${account} of worker ${worker} neither the signed-in account menu, the sign-in form nor the terms`,
    ).toBeVisible({ timeout: FRED_START_TIMEOUT });
    if (await this.terms.isVisible()) return "terms";
    if (await this.signInForm.isVisible()) return "sign-in form";
    return "signed in";
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.sections).toBeVisible();
    await expect(this.greeting).toBeVisible();
    await this.navigation.expectShown();
  }

  /** Expects the greeting, such as "Hello", at the top of the page. */
  @step
  async expectGreeting(text: HomeGreeting): Promise<void> {
    await expect(this.greeting).toContainText(text);
  }

  /** Open the requested home section and verify its radio button is checked. */
  @step
  async openSection(section: HomeSection): Promise<void> {
    await this.page.goto("/");
    const choice = this.sectionChoice(section);
    await choice.click();
    await expect(choice).toBeChecked();
  }

  /**
   * The period defaults to "30d" on load. Choose a different period in "Your
   * activity" or "Trending" so the checked radio button demonstrates a change.
   */
  @step
  async choosePeriod(period: HomePeriod): Promise<void> {
    const choice = this.periodChoice(period);
    await expect(choice).toBeVisible();
    await expect(
      choice,
      `Fred shows the period "${period}" already, so choosing it changes nothing`,
    ).not.toBeChecked();
    await choice.click();
    await expect(choice).toBeChecked();
  }

  /** Expects a section to be chosen and to show its content. */
  @step
  async expectSection(section: HomeSection): Promise<void> {
    await expect(this.sectionChoice(section)).toBeChecked();
    await expect(this.sectionContents[section]).toBeVisible();
  }

  /**
   * Expects a section for a period: the section shown and the period chosen.
   * The figures of "Your activity" also name the period they cover. The
   * prompts of "Trending" name the period only on the cards of published
   * prompts, so for it the period is checked on the period selector only.
   */
  @step
  async expectPeriod(
    section: PeriodSection,
    period: HomePeriod,
  ): Promise<void> {
    await this.expectSection(section);
    await expect(this.periodChoice(period)).toBeChecked();
    if (section === "Your activity")
      await expect(this.sectionContents[section]).toContainText(
        ACTIVITY_CAPTIONS[period],
      );
  }

  /** Open the named space and wait for navigation to a team page. */
  @step
  async openSpace(name: string): Promise<void> {
    await this.space(name).click();
    await expect(this.page).toHaveURL(/\/team\/[^/]+\//);
  }

  /**
   * Wait for the "Personal space" link to point to the user's own space. The
   * same bootstrap response supplies their team list, so an absence check is
   * meaningful once that link resolves.
   */
  @step
  async openWithSpaces(): Promise<void> {
    await this.page.goto("/");
    await this.expectShown();
    await expect(this.personalSpace).toHaveAttribute(
      "href",
      PERSONAL_SPACE_ADDRESS,
    );
  }

  @step
  async expectSpace(name: string): Promise<void> {
    await expect(this.space(name)).toBeVisible();
  }

  /** Loads the home page and expects no space of this name once its space list has loaded. */
  @step
  async openAndExpectNoSpace(name: string): Promise<void> {
    await this.openWithSpaces();
    await expect(this.space(name)).toHaveCount(0);
  }

  @step
  async expectSignedInAs(account: Account): Promise<void> {
    await this.expectShown();
    await this.accountMenu.expectSignedInAs(account);
  }
}
