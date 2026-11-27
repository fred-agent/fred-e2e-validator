import type { Locator, Page } from "@playwright/test";

/**
 * A table in the main region, such as a team's members or a folder's
 * documents. The enclosing page object or component filters its rows.
 */
export class DataTable {
  static readonly displayName = "Data table";
  /** Every row of the table. */
  readonly rows: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    // The rows have no ARIA row role or test ID. Their CSS module class
    // contains "datatable-row".
    this.rows = page.getByRole("main").locator('[class*="datatable-row"]');
  }

  /** The row that shows this text exactly, such as a member's username. */
  row(text: string): Locator {
    return this.rows.filter({
      has: this.page.getByText(text, { exact: true }),
    });
  }
}
