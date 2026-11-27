import { expect, type Locator, type Page } from "@playwright/test";
import type { InvitationLink } from "./admin-teams-page.ts";
import { step } from "./step.ts";

/**
 * The page an invitation link opens: "Join the team" for a valid link, or a
 * title that says the link is no longer valid.
 */
export class JoinPage {
  static readonly displayName = "Join page";
  private readonly page: Page;
  private readonly join: Locator;
  private readonly invalid: Locator;

  constructor(page: Page) {
    this.page = page;
    this.join = page.getByRole("button", {
      name: "Join the team",
      exact: true,
    });
    this.invalid = page.getByRole("heading", {
      name: "This invitation link is no longer valid",
      exact: true,
    });
  }

  /** Follows an invitation link and joins the team; the team's space then opens. */
  @step
  async followAndJoin(link: InvitationLink): Promise<void> {
    await this.page.goto(link.address);
    await this.join.click();
    await expect(this.page).toHaveURL(/\/team\/[^/]+\//);
  }

  /** Follows an invitation link that the page says is no longer valid. */
  @step
  async followAndExpectInvalid(link: InvitationLink): Promise<void> {
    await this.page.goto(link.address);
    await expect(this.invalid).toBeVisible();
    await expect(this.join).toHaveCount(0);
  }
}
