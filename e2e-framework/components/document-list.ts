import { extname } from "node:path";
import {
  expect,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";
import { step } from "../pages/step.ts";
import { ConfirmDialog, RenameDialog } from "./dialogs.ts";
import { ResourceTable } from "./resource-table.ts";

/** Time allowed for a document download to start. */
const DOWNLOAD_TIMEOUT = 30_000;

/**
 * The documents of the folder open on a resources page: the folder's loaded
 * listing, its search, a document's preview, and the download, rename and
 * removal of a document from its "More actions".
 */
export class DocumentList {
  static readonly displayName = "Document list";
  private readonly page: Page;
  private readonly emptyFolder: Locator;
  private readonly searchField: Locator;
  private readonly clearSearchButton: Locator;
  private readonly table: ResourceTable;
  private readonly renameDialog: RenameDialog;
  private readonly confirmDialog: ConfirmDialog;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    // Shown once a folder without documents has loaded.
    this.emptyFolder = page.getByText("This folder is empty.", { exact: true });
    // Filters the rows the open folder lists; the clear button shows only
    // while the search holds text.
    this.searchField = main.getByLabel("Search in this folder", {
      exact: true,
    });
    this.clearSearchButton = main.getByRole("button", {
      name: "Clear search",
      exact: true,
    });
    this.table = new ResourceTable(page);
    this.renameDialog = new RenameDialog(page);
    this.confirmDialog = new ConfirmDialog(page);
  }

  /** A row or the empty-folder message signals that the open folder's listing has loaded. */
  @step
  async expectLoaded(): Promise<void> {
    await this.table.waitUntilLoaded(this.emptyFolder);
  }

  /**
   * Searches the open folder once the table shows its loaded listing, so the
   * search has the folder's documents to filter.
   */
  @step
  async search(text: string): Promise<void> {
    await this.expectLoaded();
    await this.searchField.fill(text);
    await expect(this.searchField).toHaveValue(text);
  }

  /** Clears the search of the open folder with "Clear search", shown while the search holds text. */
  @step
  async clearSearch(): Promise<void> {
    await this.clearSearchButton.click();
    await expect(this.searchField).toHaveValue("");
  }

  /** Opens a document's preview, a side panel named after the document. */
  @step
  async preview(name: string): Promise<void> {
    await this.table.preview(name);
    await expect(this.previewPanel(name)).toBeVisible();
  }

  /** Expects a document's open preview to show a text of the document. */
  @step
  async expectPreviewText(name: string, text: string): Promise<void> {
    await expect(this.previewPanel(name).getByText(text)).toBeVisible();
  }

  /**
   * Downloads a document through its "More actions" menu and returns the
   * download. The download must start within `DOWNLOAD_TIMEOUT`.
   */
  @step
  async download(name: string): Promise<Download> {
    const downloading = this.page
      .waitForEvent("download", { timeout: DOWNLOAD_TIMEOUT })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Fred saved no file for the document "${name}": ${reason}`,
          { cause: error },
        );
      });
    const [download] = await Promise.all([
      downloading,
      this.table.choose(name, "Download"),
    ]);
    return download;
  }

  /** Expects a download to have arrived whole, under this name. */
  @step
  async expectDownloadNamed(download: Download, name: string): Promise<void> {
    const saved = download.suggestedFilename();
    const failure = await download.failure();
    if (failure !== null)
      throw new Error(`The download of "${saved}" failed: ${failure}.`);
    if (saved !== name)
      throw new Error(`Fred saved the document as "${saved}", not "${name}".`);
  }

  /**
   * Renames the file to `next` while preserving its extension. Once saved,
   * the dialog closes and the folder lists the new name.
   */
  @step
  async rename(name: string, next: string): Promise<void> {
    const extension = extname(name);
    const current = extension === "" ? name : name.slice(0, -extension.length);
    await this.table.choose(name, "Rename");
    await this.renameDialog.submit(current, next);
    await this.table.expectListed(`${next}${extension}`);
  }

  /**
   * Removes a document from the open folder; the confirmation closes and the
   * folder no longer lists the document.
   */
  @step
  async remove(name: string): Promise<void> {
    await this.table.choose(name, "Delete");
    await this.confirmDialog.confirm("Remove document");
    await this.table.expectNotListed(name);
  }

  /** A document's preview, a side panel named after the document. */
  private previewPanel(name: string): Locator {
    return this.page.getByRole("complementary", { name, exact: true });
  }
}
