// Marketplace settings: a platform admin decides whether the teams' editors
// may publish agents to the marketplace, and how many agents a team may
// publish, for every team and team by team. Source: Help Center,
// "Platform administration", which says that the publishing choice applies
// to every team, including teams created later, and that a team's own choice
// and its own maximum of agents replace the platform's, and "Agents", which
// says that a team that has reached its maximum cannot publish another agent
// and that only public teams publish.
import { test } from "../../e2e-framework/fixtures/test.ts";

test.describe("Marketplace settings", () => {
  test.describe("A platform admin sees how agents are published", () => {
    test.fixme("A platform admin sees the publishing choice and the default maximum of agents per team", () => {
      // Planned: these UI tests cannot independently read the stored records for comparison.
      // admin opens the console section "Marketplaces"
      // admin sees the platform's choice under "Publishing" and the value of "Default max agents"
    });
  });

  test.describe("The publishing choice applies to new agents", () => {
    test.fixme('An agent of a new team shows no publishing while the platform\'s choice is "Disabled"', () => {
      // Planned: changes the publishing setting for every team.
      // admin chooses "Disabled" under "Publishing" in the console section "Marketplaces"
      // admin creates a public team in which admin also holds the Editor role, and an agent of that team
      // admin opens the agents of the team and does not see "Publish to the marketplace" for the agent
    });
  });

  test.describe("A platform admin changes the default maximum of agents per team", () => {
    test.fixme("A team that has reached the default maximum cannot publish another agent", () => {
      // Planned: changes the publishing setting for every team.
      // admin chooses "Enabled" under "Publishing" and sets "Default max agents" to 1 in the console section "Marketplaces"
      // admin creates a public team in which admin also holds the Editor role, and two agents of that team
      // admin publishes the first agent to the marketplace
      // admin opens the agents of the team and cannot publish the second agent
      // admin is told "Your team has reached its quota of published agents. Remove one from the marketplace to publish this one."
    });
  });

  test.describe("A team's own publishing choice replaces the platform's", () => {
    test.fixme('A team set to "Off" shows no publishing although the platform publishes', () => {
      // Planned: changes the publishing setting for every team.
      // admin chooses "Enabled" under "Publishing" in the console section "Marketplaces"
      // admin creates a public team in which admin also holds the Editor role, and an agent of that team
      // admin chooses "Off" for the team in the console section "Marketplaces"
      // admin opens the agents of the team and does not see "Publish to the marketplace" for the agent
    });
  });

  test.describe("A team's own maximum of agents replaces the default", () => {
    test.fixme("A team with a maximum of its own publishes up to that maximum", () => {
      // Planned: changes the publishing setting for every team.
      // admin chooses "Enabled" under "Publishing" and sets "Default max agents" to 1 in the console section "Marketplaces"
      // admin creates a public team in which admin also holds the Editor role, and two agents of that team
      // admin sets the maximum of agents of the team to 2 in the console section "Marketplaces"
      // admin publishes both agents to the marketplace
      // secondUser opens the marketplace, chooses "Agents" and sees the second agent
    });
  });
});
