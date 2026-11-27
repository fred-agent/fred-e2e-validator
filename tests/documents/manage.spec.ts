// Managing documents: a member organises the documents of a space they can
// edit in folders, and finds, previews, downloads, renames and removes them,
// or leaves them out of search. Source: Help Center, "Resources"; the
// search of a folder, the preview, the actions on a document and the mark of
// a document excluded from search come from the resources page.
import {
  PROCESSING_TIMEOUT,
  test,
  type Folder,
} from "../../e2e-framework/fixtures/test.ts";

test.describe("Managing documents", { tag: "@document" }, () => {
  test.describe("A member organises documents in folders", () => {
    test(
      "A new folder is listed in the space",
      { tag: "@preprod" },
      async ({ member, folders, testData }) => {
        const folder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step("member opens the resources of the test space, reloads them and sees the folder", async () => {
          await member.flows.openResourcesAsMember(testData.space);
          await member.pages.resources.reloadAndExpectFolderListed(folder.name);
        });
      },
    );

    test(
      "A deleted folder is no longer listed",
      { tag: "@preprod" },
      async ({ member, folders, testData }) => {
        const keptFolder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage kept"));
        const folder =
          await test.step("member creates a second folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step("member opens the resources of the test space and deletes the second folder", () =>
          folders.delete(member, folder));
        await test.step("member reloads the resources, sees the first folder and does not see the second", () =>
          member.pages.resources.reloadAndExpectFolderNotListed(
            folder.name,
            keptFolder.name,
          ));
      },
    );
  });

  test.describe(
    "Fred processes a spreadsheet without a model",
    { tag: "@csv" },
    () => {
      test(
        'A CSV file is listed as "Done"',
        { tag: "@preprod" },
        async ({ member, folders, testData }) => {
          test.setTimeout(PROCESSING_TIMEOUT + 120_000);
          const folder =
            await test.step("member creates a folder in the test space", () =>
              folders.create(member, testData.space, "manage"));
          await test.step('member uploads "e2e-table.csv" into the folder with processing and waits until Fred ends its processing', async () => {
            await member.flows.openFolder(folder);
            await member.pages.resources.uploadForProcessing("e2e-table.csv");
          });
          await test.step('member sees "e2e-table.csv" with the status "Done"', () =>
            member.pages.resources.expectStatus("e2e-table.csv", "Done"));
        },
      );
    },
  );

  test.describe(
    "A processed document can be previewed",
    { tag: "@csv" },
    () => {
      test(
        "The preview of a processed CSV file shows its content",
        { tag: "@preprod" },
        async ({ member, folders, testData }) => {
          test.setTimeout(PROCESSING_TIMEOUT + 120_000);
          const folder =
            await test.step("member creates a folder in the test space", () =>
              folders.create(member, testData.space, "manage"));
          await test.step('member uploads "e2e-table.csv" into the folder with processing and sees it with the status "Done"', async () => {
            await member.flows.openFolder(folder);
            await member.pages.resources.uploadAndProcess("e2e-table.csv");
          });
          await test.step('member opens the preview of "e2e-table.csv"', () =>
            member.pages.resources.preview("e2e-table.csv"));
          await test.step('member sees "Alderford" in the preview of "e2e-table.csv"', () =>
            member.pages.resources.expectPreviewText(
              "e2e-table.csv",
              "Alderford",
            ));
        },
      );
    },
  );

  test.describe(
    "A member processes a stored document from its row",
    { tag: "@csv" },
    () => {
      test(
        'A pending CSV file processed from its row reaches "Done" and shows its content',
        { tag: "@preprod" },
        async ({ member, folders, testData }) => {
          test.setTimeout(PROCESSING_TIMEOUT + 120_000);
          const folder =
            await test.step("member creates a folder in the test space", () =>
              folders.create(member, testData.space, "manage"));
          await test.step('member uploads "e2e-table.csv" into the folder without processing', async () => {
            await member.flows.openFolder(folder);
            await member.pages.resources.upload("e2e-table.csv", "Upload only");
          });
          await test.step('member sees "e2e-table.csv" with the status "Pending"', () =>
            member.pages.resources.expectStatus("e2e-table.csv", "Pending"));
          await test.step('member chooses "Relaunch ingestion" for "e2e-table.csv" and sees "Ingestion relaunched"', () =>
            member.pages.resources.relaunchIngestion("e2e-table.csv"));
          await test.step('member waits until Fred ends the processing of "e2e-table.csv"', () =>
            member.pages.resources.expectProcessingEnded("e2e-table.csv"));
          await test.step('member sees "e2e-table.csv" with the status "Done"', () =>
            member.pages.resources.expectStatus("e2e-table.csv", "Done"));
          await test.step('member opens the preview of "e2e-table.csv"', () =>
            member.pages.resources.preview("e2e-table.csv"));
          await test.step('member sees "Alderford" in the preview of "e2e-table.csv"', () =>
            member.pages.resources.expectPreviewText(
              "e2e-table.csv",
              "Alderford",
            ));
        },
      );
    },
  );

  test.describe("A member finds a document by searching the folder", () => {
    let folder: Folder;

    test.beforeEach(async ({ member, folders, testData }) => {
      folder =
        await test.step("member creates a folder in the test space", () =>
          folders.create(member, testData.space, "manage"));
      await test.step('member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder without processing', async () => {
        await member.flows.openFolder(folder);
        await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        await member.pages.resources.upload("e2e-table.csv", "Upload only");
      });
    });

    test(
      "A search lists only the matching document",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member opens the folder and searches it for table, part of the name "e2e-table.csv"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.search("table");
        });
        await test.step('member sees only "e2e-table.csv" in the folder', () =>
          member.pages.resources.expectOnlySearchResult("e2e-table.csv"));
      },
    );

    test(
      "A cleared search lists every document of the folder again",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member opens the folder and searches it for table, part of the name "e2e-table.csv"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.search("table");
        });
        await test.step('member sees only "e2e-table.csv" in the folder', () =>
          member.pages.resources.expectOnlySearchResult("e2e-table.csv"));
        await test.step("member clears the search", () =>
          member.pages.resources.clearSearch());
        await test.step('member sees exactly "e2e-sample.txt" and "e2e-table.csv" in the folder', () =>
          member.pages.resources.expectEveryDocumentListed([
            "e2e-sample.txt",
            "e2e-table.csv",
          ]));
      },
    );
  });

  test.describe("A document downloads under its own name", () => {
    test(
      "The download has the document's name",
      { tag: "@preprod" },
      async ({ member, folders, testData }) => {
        const folder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        const download =
          await test.step('member downloads "e2e-sample.txt" from the folder', () =>
            member.pages.resources.download("e2e-sample.txt"));
        await test.step('member sees that the download arrived named "e2e-sample.txt"', () =>
          member.pages.resources.expectDownloadNamed(
            download,
            "e2e-sample.txt",
          ));
      },
    );
  });

  test.describe("Renaming a document keeps its extension", () => {
    test(
      "A renamed document is listed under its new name",
      { tag: "@preprod" },
      async ({ member, folders, testData }) => {
        const folder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        await test.step('member renames "e2e-sample.txt" to "e2e-renamed.txt", writing only the name before the extension', () =>
          member.pages.resources.renameDocument(
            "e2e-sample.txt",
            "e2e-renamed",
          ));
        await test.step('member opens the folder again and sees "e2e-renamed.txt"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectDocumentListed("e2e-renamed.txt");
        });
        await test.step('member does not see "e2e-sample.txt" in the folder', () =>
          member.pages.resources.expectDocumentNotListed("e2e-sample.txt"));
      },
    );
  });

  test.describe("A member removes a document from a folder", () => {
    test(
      "A removed document is no longer listed",
      { tag: "@preprod" },
      async ({ member, folders, testData }) => {
        const folder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        await test.step('member removes "e2e-sample.txt" from the folder', () =>
          member.pages.resources.removeDocument("e2e-sample.txt"));
        await test.step('member opens the folder again and does not see "e2e-sample.txt"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectDocumentNotListed(
            "e2e-sample.txt",
          );
        });
      },
    );
  });

  test.describe("A member leaves a document out of search and includes it again", () => {
    test(
      'A document excluded from search is marked "Excluded from search"',
      { tag: ["@model", "@preprod"] },
      async ({ member, folders, testData }) => {
        test.setTimeout(PROCESSING_TIMEOUT + 120_000);
        const folder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step('member uploads "e2e-sample.txt" into the folder with processing and sees it with the status "Done"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.uploadAndProcess("e2e-sample.txt");
        });
        await test.step('member chooses "Exclude from search" for "e2e-sample.txt"', () =>
          member.pages.resources.excludeFromSearch("e2e-sample.txt"));
        await test.step('member opens the folder again and sees "e2e-sample.txt" marked "Excluded from search"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectExcludedFromSearch(
            "e2e-sample.txt",
          );
        });
      },
    );

    test(
      "A document included in search again loses the mark",
      { tag: ["@model", "@preprod"] },
      async ({ member, folders, testData }) => {
        test.setTimeout(PROCESSING_TIMEOUT + 120_000);
        const folder =
          await test.step("member creates a folder in the test space", () =>
            folders.create(member, testData.space, "manage"));
        await test.step('member uploads "e2e-sample.txt" into the folder with processing and sees it with the status "Done"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.uploadAndProcess("e2e-sample.txt");
        });
        await test.step('member chooses "Exclude from search" for "e2e-sample.txt"', () =>
          member.pages.resources.excludeFromSearch("e2e-sample.txt"));
        await test.step('member chooses "Include in search" for "e2e-sample.txt"', () =>
          member.pages.resources.includeInSearch("e2e-sample.txt"));
        await test.step('member opens the folder again and sees "e2e-sample.txt" not marked "Excluded from search"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectIncludedInSearch("e2e-sample.txt");
        });
      },
    );
  });
});
