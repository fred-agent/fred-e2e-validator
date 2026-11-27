import { expect, type Locator, type Page } from "@playwright/test";
import { expectButtonVisible } from "./buttons.ts";
import { pageHeading } from "./elements.ts";
import { step } from "./step.ts";

/** The buttons of the platform data page a test checks by name. */
export type PlatformDataButton = "Export";

/**
 * The platform's data: its figures, the import of a migration file, its
 * export and its reset. "Launch migration" is enabled once a file is chosen.
 * Nothing here exports, imports or resets anything.
 */
export class PlatformDataPage {
  static readonly displayName = "Platform data page";
  private readonly page: Page;
  private readonly heading: Locator;
  // It downloads the platform's data: nothing here clicks it.
  private readonly exportButton: Locator;
  // The drop zone of a migration import; a click would open the file chooser.
  private readonly dropZone: Locator;
  private readonly migrationLabel: Locator;
  private readonly launchMigration: Locator;
  private readonly buttons: Readonly<Record<PlatformDataButton, Locator>>;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = pageHeading(page, "Platform data");
    this.exportButton = main.getByRole("button", {
      name: "Export",
      exact: true,
    });
    this.dropZone = main.getByRole("button", {
      name: "Drag a .zip export, or click to select",
      exact: true,
    });
    this.migrationLabel = main.getByRole("textbox", {
      name: "Label (optional)",
      exact: true,
    });
    this.launchMigration = main.getByRole("button", {
      name: "Launch migration",
      exact: true,
    });
    this.buttons = { Export: this.exportButton };
  }

  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  @step
  async expectButtonVisible(name: PlatformDataButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /** Expects the import of a migration file: its drop zone, its label and "Launch migration". */
  @step
  async expectMigrationImport(): Promise<void> {
    await expect(this.dropZone).toBeVisible();
    await expect(this.migrationLabel).toBeEditable();
    await expect(this.launchMigration).toBeVisible();
  }
}
