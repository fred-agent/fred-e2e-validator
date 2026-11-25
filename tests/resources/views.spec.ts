// Resource views: a member reviews the files of a space: their statistics by
// type, imports in progress and a fresh view of the documents.
// Source: Help Center, "Resources"; the statistics and "Refresh this
// view" come from the resources page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Resource views", () => {
  test.describe("A member reviews the files of a space", () => {
    test("The statistics of the space show files by type", async ({
      member,
      folders,
      testData,
    }) => {
      const folder =
        await test.step("member creates a folder in the test space", () =>
          folders.create(member, testData.space, "statistics"));
      await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
        await member.flows.openFolder(folder);
        await member.pages.resources.upload("e2e-sample.txt", "Upload only");
      });
      await test.step('member opens the resources of the test space and "Statistics", and sees the files by type and the type "Text" among their sizes', async () => {
        await member.flows.openResources(testData.space);
        await member.pages.resources.showStatisticsAndExpectFileType("Text");
      });
    });

    test("A member sees the imports of the space", async ({
      member,
      testData,
    }) => {
      await test.step("member opens the resources of the test space as a member", () =>
        member.flows.openResourcesAsMember(testData.space));
      await test.step('member opens the imports with "Show imports"', () =>
        member.pages.resources.showImports());
      await test.step('member sees the panel "Imports"', () =>
        member.pages.resources.expectImports());
    });

    test('A member sees "Refresh this view" on the resources page', async ({
      member,
      testData,
    }) => {
      await test.step("member opens the resources of the test space as a member", () =>
        member.flows.openResourcesAsMember(testData.space));
      await test.step('member sees "Refresh this view"', () =>
        member.pages.resources.expectButtonVisible("Refresh this view"));
    });
  });
});
