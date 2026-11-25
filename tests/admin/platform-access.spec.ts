// Platform access: a platform admin decides who may use the platform: a rule
// on the account, and whitelisted users and teams. Source: the technical
// console, "Platform access"; Help Center, "Teams and permissions", says
// that a person needs access to the platform.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform access", () => {
  test.describe("A platform admin reviews platform access by users, teams and rules", () => {
    for (const kind of ["Users", "Teams", "Rules"] as const) {
      test(`A platform admin sees the platform access of "${kind}"`, async ({
        admin,
      }) => {
        await test.step('admin opens the console section "Platform access"', () =>
          admin.flows.openConsoleSection("Platform access"));
        await test.step(`admin chooses the view "${kind}"`, () =>
          admin.pages.platformAccess.chooseView(kind));
        await test.step(`admin sees the view "${kind}" selected and its panel shown`, () =>
          admin.pages.platformAccess.expectView(kind));
      });
    }
  });

  test.describe("A platform admin limits who may use the platform", () => {
    test.fixme(
      "A user outside the access rules cannot sign in",
      { tag: "@extended" },
      () => {
        // Planned: saving an access rule overwrites the rule an administrator wrote.
        // admin saves an access rule that outsider's account does not match in the console section "Platform access"
        // visitor signs in as outsider
        // visitor is told that the platform refuses access
      },
    );
  });

  test.describe("A whitelisted user may use the platform whatever the rule says", () => {
    test.fixme(
      "A whitelisted user outside the access rule signs in",
      { tag: "@extended" },
      () => {
        // Planned: saving an access rule overwrites the rule an administrator wrote.
        // admin saves an access rule that outsider's account does not match in the console section "Platform access"
        // admin adds outsider to the whitelisted users
        // visitor signs in as outsider
        // visitor sees the home page signed in as outsider
      },
    );
  });

  test.describe("Every member of a whitelisted team may use the platform whatever the rule says", () => {
    test.fixme(
      "A member of a whitelisted team outside the access rule signs in",
      { tag: ["@team", "@extended"] },
      () => {
        // Planned: saving an access rule overwrites the rule an administrator wrote.
        // admin creates a team with outsider as a member
        // admin saves an access rule that outsider's account does not match in the console section "Platform access"
        // admin adds the team to the whitelisted teams
        // visitor signs in as outsider
        // visitor sees the home page signed in as outsider
      },
    );
  });

  test.describe("Importing the existing users whitelists those the rule does not accept", () => {
    test.fixme(
      "An existing user outside the rule is whitelisted by the import",
      { tag: "@extended" },
      () => {
        // Planned: an import into the whitelist cannot be put back.
        // admin saves an access rule that outsider's account does not match in the console section "Platform access"
        // admin imports the existing users with "Import existing users"
        // admin sees outsider among the whitelisted users
      },
    );
  });
});
