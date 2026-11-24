import {
  expect,
  type Download,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  AddDocumentsDialog,
  ConfirmDialog,
  NewFolderDialog,
  type UploadMode,
} from "../components/dialogs.ts";
import { DocumentList } from "../components/document-list.ts";
import {
  ResourceTable,
  type DocumentStatus,
  type RowAction,
} from "../components/resource-table.ts";
import { SpaceNavigation } from "../components/space-navigation.ts";
import type { UploadFile } from "../config/uploads.ts";
import { expectButtonVisible, waitThenExpectButtonAbsent } from "./buttons.ts";
import { step } from "./step.ts";

/** The buttons of the resources page a test checks by name. */
export type ResourcesButton = "New folder" | "Add files" | "Refresh this view";

/** Time allowed for an uploaded file to appear in the folder listing. */
const UPLOAD_TIMEOUT = 30_000;

/**
 * A small upload can take about 40 seconds to process locally and several
 * minutes under load. Tests that wait for processing need this budget plus time
 * for their other steps.
 */
export const PROCESSING_TIMEOUT = 600_000;

/**
 * The team record supplies the permissions for "New folder", "Add files" and
 * actions that change a document. It also supplies the quota for the "Storage"
 * meter, visible to all members of a team with a quota.
 */
export class ResourcesPage {
  static readonly displayName = "Resources page";
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly newFolder: Locator;
  private readonly addFiles: Locator;
  private readonly refresh: Locator;
  private readonly storage: Locator;
  private readonly back: Locator;
  private readonly breadcrumb: Locator;
  private readonly emptyRoot: Locator;
  private readonly showImportsButton: Locator;
  private readonly hideImportsButton: Locator;
  private readonly importsPanel: Locator;
  private readonly buttons: Readonly<Record<ResourcesButton, Locator>>;
  private readonly table: ResourceTable;
  private readonly documents: DocumentList;
  private readonly newFolderDialog: NewFolderDialog;
  private readonly addDocumentsDialog: AddDocumentsDialog;
  private readonly confirmDialog: ConfirmDialog;
  private readonly spaceNavigation: SpaceNavigation;

  constructor(page: Page) {
    this.page = page;
    const main = page.getByRole("main");
    this.heading = page.getByRole("heading", {
      level: 1,
      name: /^(Team resources|Your personal resources)$/,
    });
    this.newFolder = main.getByRole("button", {
      name: "New folder",
      exact: true,
    });
    this.addFiles = main.getByRole("button", {
      name: "Add files",
      exact: true,
    });
    // Drawn for every user, in the toolbar that holds the editor's controls.
    this.refresh = main.getByRole("button", {
      name: "Refresh this view",
      exact: true,
    });
    // The meter appears only after the team quota loads.
    this.storage = main.getByText("Storage", { exact: true });
    // Shown only inside a folder.
    this.back = page.getByRole("button", {
      name: "Back to previous folder",
      exact: true,
    });
    this.breadcrumb = page.getByRole("navigation", {
      name: "Breadcrumb",
      exact: true,
    });
    this.emptyRoot = page.getByText(
      "Create a library (folder) to start adding documents.",
      { exact: true },
    );
    // The imports panel is a button while it is folded, and a region once open.
    this.showImportsButton = main.getByRole("button", {
      name: "Show imports",
      exact: true,
    });
    this.hideImportsButton = main.getByRole("button", {
      name: "Hide imports",
      exact: true,
    });
    this.importsPanel = main.getByRole("region", {
      name: "Imports",
      exact: true,
    });
    this.buttons = {
      "New folder": this.newFolder,
      "Add files": this.addFiles,
      "Refresh this view": this.refresh,
    };
    this.table = new ResourceTable(page);
    this.documents = new DocumentList(page);
    this.newFolderDialog = new NewFolderDialog(page);
    this.addDocumentsDialog = new AddDocumentsDialog(page);
    this.confirmDialog = new ConfirmDialog(page);
    this.spaceNavigation = new SpaceNavigation(page);
  }

  /**
   * Opens the resources of the space shown from the space navigation and
   * waits for the folder list: a row, or the empty space's text.
   */
  @step
  async open(): Promise<void> {
    await this.spaceNavigation.goTo("Resources");
    await expect(this.heading).toBeVisible();
    await this.expectFolderListShown();
  }

  /** Expects the resources as an editor sees them, with "New folder". */
  @step
  async expectShown(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.newFolder).toBeVisible();
  }

  /**
   * After reloading at the top level, wait for "Refresh this view" and then
   * either "New folder" or "Storage" before checking permissions. For a member
   * without the Editor role, the meter is the only sign that the team record
   * has loaded, and it is available only on teams with a quota.
   */
  private async reloadAndWaitForButtons(): Promise<void> {
    await this.page.reload();
    await expect(this.heading).toBeVisible();
    await expect(this.refresh).toBeVisible();
    await expect(
      this.newFolder.or(this.storage).first(),
      'The resources page shows neither "New folder", which an editor sees, nor the "Storage" meter, which a member without the Editor role sees only where the team has a storage quota, so it gives no sign that it has applied the team\'s record',
    ).toBeVisible();
  }

  @step
  async expectButtonVisible(name: ResourcesButton): Promise<void> {
    await expectButtonVisible(this.buttons[name]);
  }

  /**
   * Expects a button to be absent once the page, loaded again, shows that it
   * has applied the team's record.
   */
  @step
  async reloadAndExpectButtonAbsent(name: ResourcesButton): Promise<void> {
    await waitThenExpectButtonAbsent(this.buttons[name], async () =>
      this.reloadAndWaitForButtons(),
    );
  }

  /**
   * A document's "More actions" menu depends on team permissions. Wait for the
   * team record after reloading, open the folder, then check the exact set of
   * actions.
   */
  @step
  async reloadAndExpectDocumentActions(
    folder: string,
    document: string,
    actions: readonly RowAction[],
  ): Promise<void> {
    await this.reloadAndWaitForButtons();
    await this.openFolder(folder);
    await this.table.expectOptions(document, actions);
  }

  /**
   * Creates a folder at the top level of the space once the table shows a row
   * or the empty space's text; the dialog closes and the table lists the
   * folder.
   */
  @step
  async createFolder(name: string): Promise<void> {
    await this.expectFolderListShown();
    await this.newFolder.click();
    await this.newFolderDialog.submit(name);
    await this.table.expectListed(name);
  }

  /** Open the imports panel to track files being processed. */
  @step
  async showImports(): Promise<void> {
    await this.showImportsButton.click();
    await expect(this.hideImportsButton).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  }

  @step
  async expectImports(): Promise<void> {
    await expect(this.importsPanel).toBeVisible();
  }

  /**
   * Opens a folder of the open space; the breadcrumb names it and the table
   * shows its loaded listing: a row, or the empty folder's text.
   */
  @step
  async openFolder(name: string): Promise<void> {
    await this.table.openFolder(name);
    await expect(this.breadcrumb).toContainText(name);
    await this.documents.expectLoaded();
  }

  /** Adds a file to the open folder in a mode and waits until the folder lists it. */
  @step
  async upload(file: UploadFile, mode: UploadMode): Promise<void> {
    await this.addFiles.click();
    await this.addDocumentsDialog.submit(file, mode, UPLOAD_TIMEOUT);
    await this.table.expectListed(file, UPLOAD_TIMEOUT);
  }

  /**
   * Wait for the uploaded file to reach "Done" or "Error" within the processing
   * timeout. The caller checks which outcome it expects.
   */
  @step
  async uploadForProcessing(file: UploadFile): Promise<void> {
    await this.upload(file, "Upload & process");
    await this.table.expectProcessingEnded(file, PROCESSING_TIMEOUT);
  }

  /** Adds a file to the open folder with processing, which must end in "Done". */
  @step
  async uploadAndProcess(file: UploadFile): Promise<void> {
    await this.uploadForProcessing(file);
    await this.table.expectStatus(file, "Done");
  }

  /** Expects a document of the open folder with a status, such as "Pending". */
  @step
  async expectStatus(name: string, status: DocumentStatus): Promise<void> {
    await expect(this.back).toBeVisible();
    await this.table.expectStatus(name, status);
  }

  @step
  async expectDocumentListed(name: string): Promise<void> {
    await this.table.expectListed(name);
  }

  /**
   * Expects the open folder not to list a document, once the table shows the
   * folder's loaded listing: a row, or the empty folder's text.
   */
  @step
  async expectDocumentNotListed(name: string): Promise<void> {
    await this.documents.expectLoaded();
    await this.table.expectNotListed(name);
  }

  /** Opens a document's preview, a side panel named after the document. */
  @step
  async preview(name: string): Promise<void> {
    await this.documents.preview(name);
  }

  /** Expects a document's open preview to show a text of the document. */
  @step
  async expectPreviewText(name: string, text: string): Promise<void> {
    await this.documents.expectPreviewText(name, text);
  }

  /** Searches the open folder once it shows its loaded listing. */
  @step
  async search(text: string): Promise<void> {
    await this.documents.search(text);
  }

  /** Clears the search of the open folder. */
  @step
  async clearSearch(): Promise<void> {
    await this.documents.clearSearch();
  }

  /** Expects the open folder to list exactly one row: this file the test uploaded. */
  @step
  async expectOnlySearchResult(file: UploadFile): Promise<void> {
    await this.table.expectExactly([file]);
  }

  /** Expects the open folder to list exactly the files the test uploaded to it. */
  @step
  async expectEveryDocumentListed(files: readonly UploadFile[]): Promise<void> {
    await this.table.expectExactly(files);
  }

  /**
   * Downloads a document of the open folder from its "More actions" and
   * returns Playwright's download.
   */
  @step
  async download(name: string): Promise<Download> {
    return this.documents.download(name);
  }

  /** Expects a download to have arrived whole, under this name. */
  @step
  async expectDownloadNamed(download: Download, name: string): Promise<void> {
    await this.documents.expectDownloadNamed(download, name);
  }

  /**
   * Renames a document of the open folder: the name before its extension
   * becomes `next`, and the folder lists the new name.
   */
  @step
  async renameDocument(name: string, next: string): Promise<void> {
    await this.documents.rename(name, next);
  }

  /** Removes a document from the open folder, which then no longer lists it. */
  @step
  async removeDocument(name: string): Promise<void> {
    await this.documents.remove(name);
  }

  /**
   * Deletes a top-level folder of the open space, with the documents in it;
   * the confirmation closes and the table no longer lists the folder.
   */
  @step
  async deleteFolder(name: string): Promise<void> {
    await this.table.choose(name, "Delete");
    await this.confirmDialog.confirm("Delete folder");
    await this.table.expectNotListed(name);
  }

  /** Loads the space's resources again, at their top level, and expects a top-level folder. */
  @step
  async reloadAndExpectFolderListed(name: string): Promise<void> {
    await this.reloadAtTopLevel();
    await this.table.expectListed(name);
  }

  /**
   * Wait for a known folder to appear after reloading before checking that
   * another folder is absent. The empty-list message can also indicate a load
   * failure.
   */
  @step
  async reloadAndExpectFolderNotListed(
    name: string,
    listed: string,
  ): Promise<void> {
    await this.reloadAtTopLevel();
    await this.table.expectListed(listed);
    await this.table.expectNotListed(name);
  }

  /**
   * Cleanup requires a visible folder row before it can decide whether to
   * delete the target. The empty-list message also appears when the list fails
   * to load.
   */
  @step
  async deleteFolderIfListed(name: string): Promise<void> {
    await this.table.waitUntilFolderListed();
    if (await this.table.lists(name)) await this.deleteFolder(name);
    else await this.table.expectNotListed(name);
  }

  /** Loads the space's resources again, which opens them at their top level. */
  private async reloadAtTopLevel(): Promise<void> {
    await this.page.reload();
    await expect(this.heading).toBeVisible();
  }

  /**
   * Wait for a row or the empty-list message. A load failure can also produce
   * the empty-list message.
   */
  private async expectFolderListShown(): Promise<void> {
    await this.table.waitUntilLoaded(this.emptyRoot);
  }
}
