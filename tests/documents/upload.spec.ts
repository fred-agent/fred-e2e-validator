// Uploading documents: members add files to the folders of a space they
// can edit. Source: Help Center, "Resources".
import {
  PROCESSING_TIMEOUT,
  test,
  type Folder,
} from "../../e2e-framework/fixtures/test.ts";

test.describe("Uploading documents", { tag: "@document" }, () => {
  let folder: Folder;

  test.beforeEach(async ({ member, folders, testData }) => {
    folder = await test.step("member creates a folder in the test space", () =>
      folders.create(member, testData.space, "upload"));
  });

  test.describe("A member adds files to a folder of a space they can edit", () => {
    test(
      "A file stored without processing is listed as pending",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        await test.step('member sees "e2e-sample.txt" with the status "Pending"', () =>
          member.pages.resources.expectStatus("e2e-sample.txt", "Pending"));
      },
    );
  });

  test.describe("A file uploaded with processing is processed", () => {
    test(
      'A text file is listed as "Done"',
      { tag: ["@model", "@preprod"] },
      async ({ member }) => {
        test.setTimeout(PROCESSING_TIMEOUT + 120_000);
        await test.step('member uploads "e2e-sample.txt" into the folder with processing and waits until Fred ends its processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.uploadForProcessing("e2e-sample.txt");
        });
        await test.step('member sees "e2e-sample.txt" with the status "Done"', () =>
          member.pages.resources.expectStatus("e2e-sample.txt", "Done"));
      },
    );
  });

  test.describe("A file name that exists asks what to do", () => {
    test(
      "Replace keeps the new file",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        await test.step('member uploads a changed "e2e-sample.txt" into the folder and chooses "Replace" for "e2e-sample.txt"', () =>
          member.pages.resources.uploadChanged(["e2e-sample.txt"], "Replace"));
        await test.step('member opens the folder again and sees only the new "e2e-sample.txt"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectOnlyVersion(
            ["e2e-sample.txt"],
            "changed",
          );
        });
      },
    );

    test("Skip keeps the old file", { tag: "@preprod" }, async ({ member }) => {
      await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
        await member.flows.openFolder(folder);
        await member.pages.resources.upload("e2e-sample.txt", "Upload only");
      });
      await test.step('member uploads a changed "e2e-sample.txt" into the folder and chooses "Skip" for "e2e-sample.txt"', () =>
        member.pages.resources.uploadChanged(["e2e-sample.txt"], "Skip"));
      await test.step('member opens the folder again and sees only the old "e2e-sample.txt"', async () => {
        await member.flows.openFolder(folder);
        await member.pages.resources.expectOnlyVersion(
          ["e2e-sample.txt"],
          "original",
        );
      });
    });

    test(
      "Replace all keeps every new file",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
          await member.pages.resources.upload("e2e-table.csv", "Upload only");
        });
        await test.step('member uploads changed "e2e-sample.txt" and "e2e-table.csv" into the folder and chooses "Replace all" for the files of the upload', () =>
          member.pages.resources.uploadChanged(
            ["e2e-sample.txt", "e2e-table.csv"],
            "Replace all",
          ));
        await test.step('member opens the folder again and sees only the new "e2e-sample.txt" and "e2e-table.csv"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectOnlyVersion(
            ["e2e-sample.txt", "e2e-table.csv"],
            "changed",
          );
        });
      },
    );

    test(
      "Skip all keeps every old file",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
          await member.pages.resources.upload("e2e-table.csv", "Upload only");
        });
        await test.step('member uploads changed "e2e-sample.txt" and "e2e-table.csv" into the folder and chooses "Skip all" for the files of the upload', () =>
          member.pages.resources.uploadChanged(
            ["e2e-sample.txt", "e2e-table.csv"],
            "Skip all",
          ));
        await test.step('member opens the folder again and sees only the old "e2e-sample.txt" and "e2e-table.csv"', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.expectOnlyVersion(
            ["e2e-sample.txt", "e2e-table.csv"],
            "original",
          );
        });
      },
    );
  });

  test.describe("Files are uploaded into a folder", () => {
    test(
      "A file dropped outside a folder is refused",
      { tag: "@preprod" },
      async ({ member, testData }) => {
        await test.step("member opens the resources of the test space", () =>
          member.flows.openResources(testData.space));
        await test.step('member drops "e2e-sample.txt" on the top level of the space', () =>
          member.pages.resources.dropAtTopLevel("e2e-sample.txt"));
        await test.step('member sees the message "Drop a folder" and does not see "e2e-sample.txt"', () =>
          member.pages.resources.expectDropRefused("e2e-sample.txt"));
      },
    );
  });

  test.describe("A new file uploaded without processing waits to be processed", () => {
    test(
      'A new file uploaded without processing is marked "Pending"',
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        await test.step('member sees "e2e-sample.txt" with the status "Pending" in the folder', () =>
          member.pages.resources.expectStatus("e2e-sample.txt", "Pending"));
      },
    );
  });
});
