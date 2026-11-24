// Home page sections: the home page gives a signed-in user quick access to
// agents, teams and prompts, their own activity and the community's trending
// prompts. Source: the home page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Home page sections", () => {
  test.describe("A signed-in user finds Quick access, their activity and trending content on the home page", () => {
    for (const section of [
      "Quick access",
      "Your activity",
      "Trending",
    ] as const) {
      test(`A member sees the home section "${section}"`, async ({
        member,
      }) => {
        await test.step(`member loads the home page and chooses the section "${section}"`, () =>
          member.pages.home.openSection(section));
        await test.step(`member sees the section "${section}"`, () =>
          member.pages.home.expectSection(section));
      });
    }
  });

  test.describe("A user chooses the period of the activity views", () => {
    for (const [view, period] of [
      ["Your activity", "7d"],
      ["Your activity", "90d"],
      ["Trending", "7d"],
    ] as const) {
      test(`A member sees "${view}" for the period "${period}"`, async ({
        member,
      }) => {
        await test.step(`member loads the home page and chooses the section "${view}"`, () =>
          member.pages.home.openSection(view));
        await test.step(`member chooses the period "${period}"`, () =>
          member.pages.home.choosePeriod(period));
        await test.step(`member sees the section "${view}" with the period "${period}" chosen`, () =>
          member.pages.home.expectPeriod(view, period));
      });
    }

    test.fixme('A member sees "Trending" for the period "30d" after another period', () => {
      // member loads the home page and chooses the section "Trending"
      // member chooses the period "7d"
      // member chooses the period "30d"
      // member sees the section "Trending" with the period "30d" chosen
    });
  });
});
