// Uploading documents: members add files to the folders of a space they
// can edit. Source: Help Center, "Resources".
import {
  PROCESSING_TIMEOUT,
  test,
  type Folder,
} from "../../e2e-framework/fixtures/test.ts";

test.describe("Uploading documents", () => {
  let folder: Folder;

  test.beforeEach(async ({ member, folders, testData }) => {
    folder = await test.step("member creates a folder in the test space", () =>
      folders.create(member, testData.space, "upload"));
  });

  test.describe("A member adds files to a folder of a space they can edit", () => {
    test("A file stored without processing is listed as pending", async ({
      member,
    }) => {
      await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
        await member.flows.openFolder(folder);
        await member.pages.resources.upload("e2e-sample.txt", "Upload only");
      });
      await test.step('member sees "e2e-sample.txt" with the status "Pending"', () =>
        member.pages.resources.expectStatus("e2e-sample.txt", "Pending"));
    });
  });

  test.describe("A file uploaded with processing is processed", () => {
    test(
      'A text file is listed as "Done"',
      { tag: "@model" },
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
    test.fixme("Replace keeps the new file", () => {
      // member uploads "e2e-sample.txt" into the folder without processing
      // member uploads "e2e-sample.txt" into the folder again
      // member chooses "Replace" for "e2e-sample.txt"
      // member sees only the new "e2e-sample.txt" in the folder
    });

    test.fixme("Skip keeps the old file", () => {
      // member uploads "e2e-sample.txt" into the folder without processing
      // member uploads "e2e-sample.txt" into the folder again
      // member chooses "Skip" for "e2e-sample.txt"
      // member sees only the old "e2e-sample.txt" in the folder
    });

    test.fixme("Replace all keeps every new file", () => {
      // member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder without processing
      // member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder again
      // member chooses "Replace all" for the files of the upload
      // member sees only the new "e2e-sample.txt" and "e2e-table.csv" in the folder
    });

    test.fixme("Skip all keeps every old file", () => {
      // member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder without processing
      // member uploads "e2e-sample.txt" and "e2e-table.csv" into the folder again
      // member chooses "Skip all" for the files of the upload
      // member sees only the old "e2e-sample.txt" and "e2e-table.csv" in the folder
    });
  });

  test.describe("Files are uploaded into a folder", () => {
    test.fixme("A file dropped outside a folder is refused", () => {
      // member opens the resources of the test space
      // member drops "e2e-sample.txt" on the top level of the space
      // member sees the message "Drop a folder"
    });
  });

  test.describe("A new file is marked as uploaded", () => {
    test.fixme('A new file is marked "Uploaded"', () => {
      // member uploads "e2e-sample.txt" into the folder without processing
      // member sees "e2e-sample.txt" marked "Uploaded" in the folder
    });
  });
});
