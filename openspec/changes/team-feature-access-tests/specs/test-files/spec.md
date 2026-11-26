## ADDED Requirements

### Requirement: Tests of a team's access to features

A test of a team's access to a feature SHALL target a team it created
through "Manage by team" in Admin › Features, choosing "Enable",
"Disable" or "Default", and SHALL NOT change "Enabled for all" or the row
"All personal spaces". When a check relies on a feature's "Enabled for all",
after "Default" or to show that "Enable" or "Disable" changed the team's
access, the test SHALL check that setting before it changes the feature's
access, and fail naming the feature when it is not the one the check relies
on. It SHALL check the access where the team meets the
feature: the agent form for a capability, the template step of a new agent
for an agent template, the team's "Models" settings and an agent's
"Recommended model" for a model, and the team's "Apps" page for an app. It
SHALL check that a feature is absent only beside a feature the same list
shows. A test that selects "Models" in Admin › Features SHALL carry
`@model-discovery` and SHALL stay outside the `@model` and `@preprod`
selections. Opening this view refreshes model discovery, which saves the
platform's list of models where a discovery source is configured. The
committed `env-config.json` SHALL exclude the tag; an environment whose
models catalog configures no discovery source MAY remove it from
`excludeTags`.

#### Scenario: An environment with model discovery

- **WHEN** `excludeTags` holds `@model-discovery`, as the committed `env-config.json` does
- **THEN** no test of the run selects "Models" in Admin › Features

#### Scenario: A template on for all teams, disabled for one

- **WHEN** a test whose team has a second template enabled disables for that team an agent template that is on for all teams
- **THEN** it checks that the team's template step offers the second template and not the disabled one, that the team's agent of the disabled template is suspended and listed among its suspended agents, and that "Enabled for all" of the template is still on

#### Scenario: Apps enabled and disabled for one team

- **WHEN** a test enables for its team an app off for all teams and disables an app on for all teams
- **THEN** it checks that the team's "Apps" page lists the first app and not the second, and that another team it created lists the second and not the first

#### Scenario: Back to the default

- **WHEN** a test sets its team back to "Default" for a model on for all teams, after disabling it
- **THEN** it checks that the team's "Models" settings list the model again

#### Scenario: A required capability

- **WHEN** a test disables for its team a capability that an agent template requires, and then enables that template for the team
- **THEN** it answers "Enable all" in "Enable required features too?" for that team, and checks that the team's template step offers the template, that the capability's "Access for <team>" is "Enable", and that its "Enabled for all" is unchanged

#### Scenario: An environment with another setting for all teams

- **WHEN** the app a test expects off for all teams is on for all teams
- **THEN** the test fails before it changes the app's access, and names the app and its setting for all teams

### Requirement: Isolated team capability overrides

Each capability inheritance case SHALL read the expected "Enabled for all"
value before creating teams or writing access, including in setup.
It SHALL record the feature's "All personal spaces" choice at the same
point and check both shared controls after each team override or reset.
The `teams` fixture SHALL remove every team the case creates. A test that
writes feature access, directly or through setup, SHALL stay outside
`@preprod`. An organization-to-feature permission can survive team cleanup.

#### Scenario: A team clears its override for a capability enabled for all teams

- **WHEN** the test disables "Generate a web page (HTML/CSS)" on its team
- **THEN** the reloaded agent form shows another available capability and omits the web capability
- **AND** after the test chooses "Default" for its team, the reloaded form offers the web capability again

#### Scenario: A team clears its override for a capability disabled for all teams

- **WHEN** the test enables "Fill a PowerPoint file" on its team
- **THEN** the reloaded agent form offers "Fill in a PowerPoint document"
- **AND** after the test chooses "Default" for its team, the reloaded form shows another available capability and omits the PowerPoint capability

#### Scenario: A second team inherits the default while the first has an override

- **WHEN** the test enables the globally disabled "Fill a PowerPoint file" on the first of two teams it created
- **AND** both teams use the same usable agent template and editor role
- **THEN** the first team's reloaded agent form offers "Fill in a PowerPoint document"
- **AND** while the first team's override is active, the second team's reloaded form shows another available capability and omits the PowerPoint capability

## MODIFIED Requirements

### Requirement: Test files

Every test file SHALL be `tests/<area>/<name>.spec.ts`, begin with a comment
that says which part of Fred it covers and its source, and hold one
top-level `test.describe`. Tests are grouped in a `test.describe` per rule
of the product. Every file SHALL carry its section tag. Additional tag meanings
and shared-canary eligibility are defined in `WRITING-TESTS.md`, including
the `@model-discovery` tag for the console's Models view.

#### Scenario: Listing the tests

- **WHEN** `npx playwright test --list --reporter=list` runs
- **THEN** it lists every test under its file and its top-level group, and starts no browser
