import { expect, type Locator, type Page } from "@playwright/test";
import { step } from "../pages/step.ts";
import { NO_FOLDER_LISTED } from "../reporting/run-log.ts";
import { DataTable } from "./data-table.ts";
import { MoreActionsMenu } from "./more-actions-menu.ts";
import { endingWith, quoted } from "./text-patterns.ts";

/** The labels on a document row's status chip. */
const DOCUMENT_STATUSES = [
  "Pending",
  "Processing...",
  "Error",
  "Done",
] as const;

/** A document's status, by the label of its chip. */
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** The options of a row's "More actions" that the page objects choose. */
export type RowAction =
  | "Delete"
  | "Download"
  | "Rename"
  | "Exclude from search"
  | "Include in search"
  | "Relaunch ingestion";

/**
 * The folder and document table of a resources page, a data table whose rows
 * are folders and documents, each found by the name it shows.
 */
export class ResourceTable {
  static readonly displayName = "Resource table";
  private readonly page: Page;
  private readonly table: DataTable;
  private readonly menu: MoreActionsMenu<RowAction>;

  constructor(page: Page) {
    this.page = page;
    this.table = new DataTable(page);
    this.menu = new MoreActionsMenu<RowAction>(page);
  }

  /** The row of a folder or document by its exact name. */
  private row(name: string): Locator {
    return this.table.row(name);
  }

  /**
   * Waits until the table shows its listing: a row, or the text the page
   * shows when the listing is empty.
   */
  @step
  async waitUntilLoaded(emptyText: Locator): Promise<void> {
    await expect(this.table.rows.first().or(emptyText).first()).toBeVisible();
  }

  /** Waits until the table, at the top level of a space, shows a row. */
  @step
  async waitUntilFolderListed(): Promise<void> {
    await expect(this.table.rows.first(), NO_FOLDER_LISTED).toBeVisible();
  }

  /** Whether the table, once loaded, lists a folder or document. */
  @step
  async lists(name: string): Promise<boolean> {
    return this.row(name).isVisible();
  }

  /** Opens a folder with a double-click on its name; one click selects its row. */
  @step
  async openFolder(name: string): Promise<void> {
    await this.row(name).getByRole("button", { name, exact: true }).dblclick();
  }

  /** Opens a row's "More actions" list and chooses an option. */
  @step
  async choose(name: string, option: RowAction): Promise<void> {
    await this.menu.choose(this.row(name), option);
  }

  /** Expects a row's "More actions" to offer exactly these options, and closes it. */
  @step
  async expectOptions(
    name: string,
    options: readonly RowAction[],
  ): Promise<void> {
    await this.menu.expectOptions(this.row(name), options);
  }

  /** Expects a document's row to show a size in bytes, such as "57 byte". */
  @step
  async expectSize(
    name: string,
    bytes: number,
    timeout?: number,
  ): Promise<void> {
    await expect(
      this.row(name).getByText(`${bytes} byte`, { exact: true }),
    ).toBeVisible(timeout === undefined ? {} : { timeout });
  }

  /** Expects the mark of a document that agents do not search. */
  @step
  async expectExcludedFromSearch(name: string): Promise<void> {
    await expect(this.excludedMark(name)).toBeVisible();
  }

  /** Expects a listed document without that mark. */
  @step
  async expectIncludedInSearch(name: string): Promise<void> {
    await expect(this.row(name)).toBeVisible();
    await expect(this.excludedMark(name)).toHaveCount(0);
  }

  /** Opens a document's preview with the "Preview" button of its row. */
  @step
  async preview(name: string): Promise<void> {
    await this.row(name)
      .getByRole("button", { name: "Preview", exact: true })
      .click();
  }

  @step
  async expectListed(name: string, timeout?: number): Promise<void> {
    await expect(this.row(name)).toBeVisible(
      timeout === undefined ? {} : { timeout },
    );
  }

  @step
  async expectNotListed(name: string): Promise<void> {
    await expect(this.row(name)).toHaveCount(0);
  }

  /**
   * Checks the document's status chip, such as "Pending" for a file stored
   * without processing. An assertion failure includes the displayed status.
   */
  @step
  async expectStatus(name: string, status: DocumentStatus): Promise<void> {
    try {
      await expect(this.status(name, status)).toBeVisible();
    } catch (error) {
      throw new Error(
        `Fred shows the document "${name}" ${await this.describeStatus(name)}, not with the status "${status}".`,
        { cause: error },
      );
    }
  }

  /**
   * Waits for "Done" or "Error" and reports the current status on timeout.
   * The caller checks which outcome was expected.
   */
  @step
  async expectProcessingEnded(name: string, timeout: number): Promise<void> {
    const ended = this.status(name, "Done").or(this.status(name, "Error"));
    try {
      await expect(ended.first()).toBeVisible({ timeout });
    } catch (error) {
      throw new Error(
        `Fred has not ended the processing of the document "${name}" within ${timeout / 1000} s: it shows it ${await this.describeStatus(name)}.`,
        { cause: error },
      );
    }
  }

  /** The names among these that the table shows a row for now. */
  private async shown(names: readonly string[]): Promise<string[]> {
    const shown: string[] = [];
    for (const name of names)
      if ((await this.row(name).count()) > 0) shown.push(name);
    return shown;
  }

  /**
   * Expects the table to show exactly these rows, and fails naming how many
   * rows it shows and which of these names they hold.
   */
  @step
  async expectExactly(names: readonly string[]): Promise<void> {
    try {
      await expect(this.table.rows).toHaveCount(names.length);
      for (const name of names) await expect(this.row(name)).toBeVisible();
    } catch (error) {
      const rows = await this.table.rows.count();
      throw new Error(
        `The folder shows ${rows} ${rows === 1 ? "row" : "rows"}, not exactly ${quoted(names)}; of these it shows ${quoted(await this.shown(names))}.`,
        { cause: error },
      );
    }
  }

  /** The mark of a document that agents do not search. */
  private excludedMark(name: string): Locator {
    return this.row(name).getByLabel("Excluded from search", { exact: true });
  }

  /**
   * A document's status chip. The chip's icon is a font ligature whose text
   * comes right before the label, so the label is matched at the end of its
   * text.
   */
  private status(name: string, status: DocumentStatus): Locator {
    return this.row(name).getByText(endingWith(status));
  }

  /** Describes the document's current status for an assertion message. */
  private async describeStatus(name: string): Promise<string> {
    if ((await this.row(name).count()) === 0) return "nowhere in the folder";
    for (const status of DOCUMENT_STATUSES)
      if (await this.status(name, status).isVisible())
        return `with the status "${status}"`;
    return "without a status";
  }
}
