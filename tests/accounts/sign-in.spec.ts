// Signing in: a user with an account reaches the home page. Source:
// Help Center, "First steps".
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Sign-in", { tag: ["@smoke", "@extended"] }, () => {
  test.describe("A signed-in user lands on the home page", () => {
    test("A member signs in and sees the home page", async ({ visitor }) => {
      await test.step("visitor signs in as member", () =>
        visitor.signIn("member"));
      await test.step("visitor sees the home page signed in as member", () =>
        visitor.pages.home.expectSignedInAs(visitor.account));
      await test.step('visitor sees the greeting "Hello"', () =>
        visitor.pages.home.expectGreeting("Hello"));
    });
  });
});
