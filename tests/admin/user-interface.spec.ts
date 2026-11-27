// User interface settings: a platform admin chooses the home page every user
// is offered, with its featured agents and its question field, and the
// interface themes users may pick, with the default one. Source: Help
// Center, "Platform administration", which states the themes turned off and
// the default theme; the choice of the home page, its featured agents and
// its question field come from the technical console.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("User interface settings", { tag: "@admin" }, () => {
  test.describe("A platform admin sees which home page users see", () => {
    test(
      "A platform admin sees the choice of the home page",
      { tag: "@preprod" },
      async ({ admin }) => {
        await test.step('admin opens the console section "User interface"', () =>
          admin.flows.openConsoleSection("User interface"));
        await test.step('admin sees "Simple home" and "Advanced home", one of them chosen', () =>
          admin.pages.userInterface.expectHomeChoice());
      },
    );
  });

  test.describe("A platform admin chooses the home page users see", () => {
    test.fixme("A user sees the home page the platform admin chose", () => {
      // Planned: changes a choice for every team or every user, which no fixture puts back.
      // admin chooses "Advanced home" in the console section "User interface" and saves it
      // secondUser loads the home page and sees the advanced home page
    });
  });

  test.describe("Interface themes can be turned off", () => {
    test.fixme("A user does not see a theme turned off", () => {
      // Planned: changes a choice for every team or every user, which no fixture puts back.
      // admin turns a theme off in the console section "User interface"
      // secondUser opens their profile and does not see the theme in "UI theme"
    });
  });

  test.describe("Users get the default theme until they choose one", () => {
    test.fixme("A user who has not chosen a theme gets the new default theme", () => {
      // Planned: needs an account that has never chosen a theme.
      // admin makes another theme the default in the console section "User interface"
      // visitor signs in with an account that has never chosen a theme
      // visitor opens their profile and sees the new default theme in "UI theme"
    });
  });

  test.describe("The advanced home features the agents the platform admin chooses", () => {
    test.fixme(
      "A featured agent is shown on the advanced home page",
      { tag: "@team" },
      () => {
        // Planned: changes a choice for every team or every user, which no fixture puts back.
        // admin creates a team in which admin can create agents, and an agent of that team
        // admin chooses "Advanced home" in the console section "User interface", features the agent and saves it
        // secondUser loads the home page and sees the featured agent
      },
    );
  });

  test.describe("The advanced home shows its question field once the platform admin chooses its agent", () => {
    test.fixme(
      "The advanced home shows its question field once an agent is chosen",
      { tag: "@team" },
      () => {
        // Planned: changes a choice for every team or every user, which no fixture puts back.
        // admin creates a team in which admin can create agents, and an agent of that team
        // admin chooses "Advanced home" in the console section "User interface", chooses the agent for its question field and saves it
        // secondUser loads the home page and sees the question field
      },
    );
  });
});
