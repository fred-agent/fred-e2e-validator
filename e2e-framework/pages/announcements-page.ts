import { expect, type Locator, type Page } from "@playwright/test";
import { NewAnnouncementDialog } from "../components/admin-dialogs.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

// The technical console's announcements, which shape what users see. Its
// methods only look, and open and cancel a form; nothing here saves a
// change.

/**
 * The announcements page opens on "Banners". Separate tabs show patch notes
 * and the history of their activations.
 */
export class AnnouncementsPage {
  static readonly displayName = "Announcements page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly views: Locator;
  private readonly newBanner: Locator;
  private readonly newAnnouncement: NewAnnouncementDialog;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = pageHeading(page, "Announcements");
    this.views = main.getByRole("tablist", {
      name: "Announcements page view",
      exact: true,
    });
    this.newBanner = main.getByRole("button", {
      name: "New banner",
      exact: true,
    });
    this.newAnnouncement = new NewAnnouncementDialog(page);
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.views).toBeVisible();
  }

  /**
   * Checks that an empty banner form has "Save" disabled, then cancels it. A
   * new banner requires a title and a short description.
   */
  @step
  async openExpectEmptyBannerAndCancel(): Promise<void> {
    await this.newBanner.click();
    await this.newAnnouncement.expectEmptyNewBanner();
    await this.newAnnouncement.close();
  }
}
