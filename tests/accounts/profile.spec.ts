// Profile: a signed-in user's profile shows their account and holds their
// interface preferences: theme, mode, language and picture. Source:
// Help Center, "First steps" and "Platform administration"; the email the
// profile shows and the way back come from the profile page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Profile", () => {
  test.describe("A signed-in user reaches their profile from the account menu", () => {
    test("A member sees their own email in their profile", async ({
      member,
    }) => {
      await test.step("member opens their profile from the account menu", () =>
        member.flows.openProfile());
      await test.step("member sees their own email in their profile", () =>
        member.pages.profile.expectAccount(member.account));
    });
  });

  test.describe("Leaving the profile returns to the page it was opened from", () => {
    test("A member who leaves their profile sees the home page", async ({
      member,
    }) => {
      await test.step("member opens their profile from the account menu of the home page", () =>
        member.flows.openProfile());
      await test.step('member leaves their profile with "Back"', () =>
        member.pages.profile.leave());
      await test.step("member sees the home page", () =>
        member.pages.home.expectShown());
    });
  });

  test.describe("The profile shows the interface settings", () => {
    test("A member sees the theme, mode and language settings", async ({
      member,
    }) => {
      await test.step("member opens their profile from the account menu", () =>
        member.flows.openProfile());
      await test.step('member sees the "UI theme" select', () =>
        member.pages.profile.expectSetting("theme"));
      await test.step('member sees the mode choices "Light", "Dark" and "System"', () =>
        member.pages.profile.expectSetting("mode"));
      await test.step('member sees the language choices "French" and "English"', () =>
        member.pages.profile.expectSetting("language"));
    });
  });

  test.describe("The interface follows the language a user chooses", () => {
    test.fixme("A member who chooses French sees Fred in French", () => {
      // member chooses the language "French" in their profile
      // member opens the home page
      // member sees the greeting "Bonjour"
    });
  });

  test.describe("A user's theme and mode are kept", () => {
    test.fixme("A chosen theme and mode are kept after the page is opened again", () => {
      // member chooses the theme "Cobalt" in their profile
      // member chooses the mode "Dark" in their profile
      // member opens their profile again from the account menu
      // member sees the theme "Cobalt" and the mode "Dark" chosen
    });
  });

  test.describe("A user manages their profile picture", () => {
    test.fixme("An imported picture replaces the initials", () => {
      // member opens their profile from the account menu
      // member imports the profile picture "e2e-picture.png"
      // member sees their picture in the account menu
    });

    test.fixme("A deleted picture gives way to the initials", () => {
      // member imports the profile picture "e2e-picture.png" in their profile
      // member deletes their profile picture
      // member sees their initials in the account menu
    });
  });
});
