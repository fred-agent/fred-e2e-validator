// A platform admin grants access to capabilities, agent templates, models
// and skills across all teams, per team or for personal spaces. The admin
// also sets platform-wide model and presentation template behavior. Source: Help Center,
// "Platform administration", which states the platform's presentation
// template, and "Capabilities", which states a model's reasoning; the filter
// by kind, a feature enabled for all teams or opened to personal spaces, a
// model's display name, the global override of the model defaults, model
// discovery and a model its source no longer offers come from the
// features page.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Fred features", () => {
  test.describe("A platform admin sees Fred's features by kind", () => {
    test.fixme("A platform admin sees a filter of the features by kind", () => {
      // Planned: these UI tests cannot independently read the stored records for comparison.
      // admin opens the console section "Features"
      // admin sees the filter by kind, open on "Capabilities", and one row for each capability
    });
  });

  test.describe("Every team sees a feature enabled for all teams", () => {
    test.fixme(
      "The agent form of a team without a setting of its own shows the feature",
      { tag: "@ppt" },
      () => {
        // Planned: changes a setting for every team.
        // admin creates a team in which admin can create agents
        // admin turns "Enabled for all" on for the capability "Generate a presentation" in the console section "Features"
        // admin opens the capabilities of a new agent of the team and sees "Generate a presentation"
      },
    );
  });

  test.describe("A platform admin opens a feature to personal spaces", () => {
    test.fixme("The agent form of a personal space shows a feature opened to personal spaces", () => {
      // Planned: changes a setting for every team.
      // admin opens the capability "Generate a presentation" to personal spaces in the console section "Features"
      // member opens the capabilities of a new agent of the personal space and sees "Generate a presentation"
    });
  });

  test.describe("A platform admin turns a model's reasoning on or off", () => {
    test.fixme("A model whose reasoning is off shows a team no reasoning default", () => {
      // Planned: changes a setting for every team.
      // admin creates a team
      // admin turns the reasoning of the platform's default model off in the console section "Features"
      // admin opens the settings section "Models" of the team and does not see "Reasoning on by default" for the platform's default model
    });
  });

  test.describe("A model's display name is the name users see", () => {
    test.fixme("A renamed model is listed under its display name in a team's models", () => {
      // Planned: changes a setting for every team.
      // admin creates a team
      // admin gives the platform's default model a new display name in the console section "Features"
      // admin opens the settings section "Models" of the team and sees the model under its new display name
    });
  });

  test.describe("The model defaults keep the global override a platform admin chooses", () => {
    test.fixme("A chosen global override is shown in the model defaults", () => {
      // Planned: changes a setting for every team.
      // admin sets the global override of the model defaults to the platform's default model in the console section "Features"
      // admin sees the platform's default model as the global override in the model defaults
    });
  });

  test.describe("Model discovery lists the models its sources offer", () => {
    test.fixme("A refreshed discovery lists the models of its source", () => {
      // Planned: changes a setting for every team.
      // admin refreshes the model discovery in the console section "Features"
      // admin sees the discovered models of each source
    });
  });

  test.describe("A platform admin dismisses a model its source no longer offers", () => {
    test.fixme("A dismissed model is no longer listed", () => {
      // Planned: changes a setting for every team.
      // admin opens the model discovery in the console section "Features" and sees a model its source no longer offers
      // admin removes that model from the list
      // admin does not see that model among the missing models
    });
  });

  test.describe("Agents without a template of their own use the platform's presentation template", () => {
    test.fixme("An uploaded platform template is the template of a new agent", () => {
      // Planned: changes a setting for every team.
      // admin uploads a presentation file as the platform's presentation template in the console section "Features"
      // admin creates a team in which admin can create agents
      // admin opens the presentation settings of a new agent of the team and sees the platform's template
    });
  });
});
