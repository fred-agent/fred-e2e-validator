// Platform roles: a platform admin decides who holds the platform's roles,
// such as Team manager or Platform observer, which carry responsibilities
// outside teams. Source: Help Center, "Teams and permissions", whose
// platform roles are each granted separately, and "Platform administration".
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Platform roles", () => {
  test.describe("A platform admin sees the granting of platform roles", () => {
    test('A platform admin sees the user search and "Grant role"', async ({
      admin,
    }) => {
      await test.step('admin opens the console section "Platform roles"', () =>
        admin.flows.openConsoleSection("Platform roles"));
      await test.step('admin sees the search "Search and add users"', () =>
        admin.pages.platformRoles.expectUserSearch());
      await test.step('admin sees "Grant role"', () =>
        admin.pages.platformRoles.expectButtonVisible("Grant role"));
    });
  });

  test.describe("A platform admin grants and withdraws platform roles", () => {
    test.fixme("A user granted a platform role holds it", () => {
      // Planned: grants a platform role in the technical console.
      // admin opens the console section "Platform roles"
      // admin grants the platform role "Platform observer" to secondUser
      // admin sees that secondUser holds the platform role "Platform observer"
      // admin withdraws the platform role "Platform observer" from secondUser
      // admin sees that secondUser no longer holds the platform role "Platform observer"
    });
  });
});
