## Why

Admin › Features sets, for one team, its access to each capability, agent
template, model and app: "Enable", "Disable" or "Default". The tests cover a
team's access to two capabilities only. The suite needs to check how a team
inherits the platform default after an override is cleared and what another
team inherits while that override is active.

## What Changes

- A test file covers a team's access to agent templates, models and apps:
  "Enable" for a feature off for all teams, "Disable" for one on for all
  teams, and "Default" after each.
- An agent of a template disabled for its team is suspended, and the console
  lists it among the template's suspended agents. A template whose required
  capability the team has disabled is enabled through "Enable required
  features too?" and "Enable all", for that team only.
- Three isolated capability cases cover "Default" after disabling a capability
  enabled for all teams, "Default" after enabling one disabled for all teams,
  and inheritance by a second team while the first team's override is active.
  The third case automates the existing planned test.
- Tests that write feature access, including through a fixture, run outside
  `@preprod`. Setting a team's access can create a permission relationship
  between the organization and the feature that survives deleting the team.
- Each test first checks the setting for all teams it relies on, and fails
  naming the feature when the environment differs.
- The test data names the agent templates, models and apps those tests use.
- Selecting "Models" in Admin › Features refreshes model discovery, which
  saves the platform's list of models where a discovery source is configured.
  The tests that select it carry `@model-discovery`, which the committed
  `env-config.json` excludes; an environment whose models catalog configures
  no discovery source removes it from `excludeTags` to run them, and a chart
  release with a discovery source adds it to its own `excludeTags` before it
  takes an image with these tests.
- A team's access to a knowledge base stays planned: the environment has no
  knowledge base.

## Capabilities

### Modified Capabilities

- `test-files`: the tests of a team's access to features, and the tag
  `@model-discovery`.
- `test-fixtures`: the test data names the agent templates, models and apps
  those tests use.

## Non-Goals

- "Enabled for all", the row "All personal spaces", a model's reasoning,
  display name and discovery: each changes a choice for every team or every
  user.
- Skills: Admin › Features sets them for everyone only.
- A second account: the platform administrator administers the test's team.

## Impact

- New: `tests/admin/feature-access.spec.ts`.
- Changed: `pages/features-page.ts`, `components/team-access-panel.ts`,
  `components/agent-form.ts`, the page objects of a new agent's template
  step, the team's "Models" settings and the team's "Apps",
  `fixtures/teams.ts`, `config/test-data.ts`, `test-data/test-data.json`,
  `env-config.json`,
  `tests/capabilities/team-access.spec.ts`, `WRITING-TESTS.md`,
  `ARCHITECTURE.md` and `README.md`.
- Builds on the change `single-user-tests`, archived before this one: its
  tag `@team`, its requirement "What a test does not do" and its version of
  "Test files", which this change restates with `@model-discovery`.
- The service, the image and the chart are unchanged.
