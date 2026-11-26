// Profile: a signed-in user's profile shows their account and holds their
// interface preferences: theme, mode, language and picture. Source:
// Help Center, "First steps" and "Platform administration"; the email the
// profile shows and the way back come from the profile page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Profile", { tag: "@account" }, () => {
  test.describe("A signed-in user reaches their profile from the account menu", () => {
    test(
      "A member sees their own email in their profile",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step("member opens their profile from the account menu", () =>
          member.flows.openProfile());
        await test.step("member sees their own email in their profile", () =>
          member.pages.profile.expectAccount(member.account));
      },
    );
  });

  test.describe("Leaving the profile returns to the page it was opened from", () => {
    test(
      "A member who leaves their profile sees the home page",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step("member opens their profile from the account menu of the home page", () =>
          member.flows.openProfile());
        await test.step('member leaves their profile with "Back"', () =>
          member.pages.profile.leave());
        await test.step("member sees the home page", () =>
          member.pages.home.expectShown());
      },
    );

    test(
      "A member who leaves their profile opened from the prompts sees the same prompts again",
      { tag: "@preprod" },
      async ({ member, testData }) => {
        const address =
          await test.step("member opens the prompts of the test space and remembers their address", async () => {
            await member.flows.openPrompts(testData.space);
            return member.pages.prompts.rememberAddress();
          });
        await test.step("member opens their profile from the account menu of the prompts", async () => {
          await member.pages.accountMenu.openProfile();
          await member.pages.profile.expectShown();
        });
        await test.step('member leaves their profile with "Back"', () =>
          member.pages.profile.leave());
        await test.step('member is back at the address of the prompts and sees "Create prompt"', async () => {
          await member.pages.prompts.expectBackAt(address);
          await member.pages.prompts.expectButtonVisible("Create prompt");
        });
      },
    );
  });

  test.describe("The profile shows the interface settings", () => {
    test(
      "A member sees the theme, mode and language settings",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step("member opens their profile from the account menu", () =>
          member.flows.openProfile());
        await test.step('member sees the "UI theme" select', () =>
          member.pages.profile.expectSetting("theme"));
        await test.step('member sees the mode choices "Light", "Dark" and "System"', () =>
          member.pages.profile.expectSetting("mode"));
        await test.step('member sees the language choices "French" and "English"', () =>
          member.pages.profile.expectSetting("language"));
      },
    );
  });

  test.describe("The interface follows the language a user chooses", () => {
    test(
      "A member who chooses French sees Fred in French",
      { tag: "@preprod" },
      async ({ member, preferences }) => {
        await test.step('member chooses the language "French" in their profile and leaves it', () =>
          preferences.chooseLanguage(member, "French"));
        await test.step('member loads the home page and sees the greeting "Bonjour"', async () => {
          await member.pages.home.open();
          await member.pages.home.expectGreeting("Bonjour");
        });
      },
    );
  });

  test.describe("A user's theme and mode are kept", () => {
    test(
      "A chosen theme and mode are kept after the page is opened again",
      { tag: "@preprod" },
      async ({ member, preferences }) => {
        const theme =
          await test.step("member chooses another theme in their profile and leaves it", () =>
            preferences.chooseAnotherTheme(member));
        const mode =
          await test.step("member chooses another mode in their profile and leaves it", () =>
            preferences.chooseAnotherMode(member));
        await test.step("member opens their profile again from the account menu", () =>
          member.flows.openProfile());
        await test.step("member sees the theme and the mode they chose", async () => {
          await member.pages.profile.expectTheme(theme);
          await member.pages.profile.expectMode(mode);
        });
      },
    );
  });

  test.describe("A user manages their profile picture", () => {
    test(
      "An imported picture replaces the initials",
      { tag: "@preprod" },
      async ({ member, preferences }) => {
        await test.step('member imports the profile picture "e2e-picture.png" in their profile and leaves it', () =>
          preferences.importPicture(member, "e2e-picture.png"));
        await test.step("member loads the home page and sees their picture in the account menu", async () => {
          await member.pages.home.openWithSpaces();
          await member.pages.accountMenu.expectPicture();
        });
      },
    );

    test(
      "A deleted picture gives way to the initials",
      { tag: "@preprod" },
      async ({ member, preferences }) => {
        await test.step('member imports the profile picture "e2e-picture.png" in their profile and leaves it', () =>
          preferences.importPicture(member, "e2e-picture.png"));
        await test.step("member opens their profile from the account menu and deletes their picture", async () => {
          await member.flows.openProfile();
          await member.pages.profile.deletePicture();
        });
        await test.step("member loads the home page and sees their initials in the account menu", async () => {
          await member.pages.home.openWithSpaces();
          await member.pages.accountMenu.expectInitials();
        });
      },
    );
  });
});
