// Switching users: a browser that one user signed out of shows the next user
// their own account. Source: Help Center, "First steps".
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Switching users", () => {
  test.describe("After one user signs out, the next user who signs in sees their own account", () => {
    test("A second user signs in after the first signed out", async ({
      visitor,
    }) => {
      await test.step("visitor signs in as member", () =>
        visitor.signIn("member"));
      await test.step('visitor signs out with "Disconnect"', () =>
        visitor.signOut());
      await test.step("visitor signs in as secondUser", () =>
        visitor.signIn("secondUser"));
      await test.step("visitor sees secondUser's email in the account menu", () =>
        visitor.pages.accountMenu.expectSignedInAs(visitor.account));
    });
  });
});
