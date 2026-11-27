import { expect, type Locator, type Page } from "@playwright/test";
import { NewAnnouncementDialog } from "../components/admin-dialogs.ts";
import { DataTable } from "../components/data-table.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

// The technical console's announcements, which shape what users see.

/** The views of the announcements page, by the labels of their tabs. */
export type AnnouncementView = "Banners" | "Patch notes" | "History";

/** What each view shows when it holds no entry. */
const EMPTY: Readonly<Record<AnnouncementView, string>> = {
  Banners: "No banner yet.",
  "Patch notes": "No patch note yet.",
  History: "No activation yet.",
};

/**
 * The announcements page opens on "Banners". Separate tabs show patch notes
 * and the history of their activations. The banners and the patch notes are
 * list items; the history is a data table.
 */
export class AnnouncementsPage {
  static readonly displayName = "Announcements page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly views: Locator;
  private readonly newBanner: Locator;
  private readonly newAnnouncement: NewAnnouncementDialog;
  private readonly history: DataTable;

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
    this.history = new DataTable(page);
  }

  private view(name: AnnouncementView): Locator {
    return this.views.getByRole("tab", { name, exact: true });
  }

  /** Chooses a view; its tab is then selected. */
  @step
  async chooseView(name: AnnouncementView): Promise<void> {
    await this.view(name).click();
    await expect(this.view(name)).toHaveAttribute("aria-selected", "true");
  }

  /** Expects the open view to show its entries, or the text that it has none. */
  @step
  async expectEntries(name: AnnouncementView): Promise<void> {
    const main = this.page.getByRole("main");
    const entries =
      name === "History"
        ? this.history.rows
        : main.getByRole("listitem").filter({ hasNot: this.views });
    // The empty text starts the paragraph that invites a first entry.
    const empty = main.getByText(new RegExp(`^${EMPTY[name]}`));
    await expect(this.view(name)).toHaveAttribute("aria-selected", "true");
    await expect(entries.first().or(empty).first()).toBeVisible();
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
