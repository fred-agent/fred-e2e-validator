## ADDED Requirements

### Requirement: Restored settings

The factory fixture `preferences` SHALL change a setting of a user's profile
(the theme, the mode, the language or the picture) and restore the value it
read before the change in its own teardown, as a removal runs. It SHALL
record the restoration before it changes the setting, and SHALL fail, without
a change, for an account that has a profile picture when a test imports one.
`agents.sort` SHALL restore the order of the agents ahead of their removal.

#### Scenario: A language that is restored

- **WHEN** a test chooses French for an account whose language is English
- **THEN** Fred is in English for the account after the test, passed or failed

#### Scenario: An account with a picture

- **WHEN** a test imports a picture for an account that has one
- **THEN** the test fails, and the account's picture is unchanged

## MODIFIED Requirements

### Requirement: Factory fixtures and removal

The factory fixtures `teams`, `folders`, `agents` and `prompts`, in
`e2e-framework/fixtures/`, SHALL be test-scoped fixtures that name what
they create `e2e <word> <stamp>`, return it, and remove it in their own
teardown, passed, failed or timed out, each removal in a browser context of
its own and as a step. Before its first removal a factory SHALL close the
contexts of the test's users, after which only a removal opens a user. A
factory SHALL try every removal, newest first, even when one fails or hangs,
each a step with its own limit and its context closed after it. The context
of a removal past its limit, and one that comes after the limit, SHALL be
closed at once, a sign-in in progress left to end. A factory SHALL then fail
once, naming every failed removal. A team or a folder Fred confirmed, and the
test did not delete through its factory, SHALL fail its removal when Fred does
not list it; a folder Fred did not confirm SHALL be taken as absent only
beside another folder the space lists. Its setup and teardown SHALL be limited
by `factoryFixtureTimeout` of `env-config.json`, through the fixture's `timeout` option, and each
removal by the fixture's time left, measured from `factoryFixtureTimeout`,
the time the fixture's setup took and the start of its teardown, less a
margin for describing a failed removal's page, closing its context and
raising the combined error, divided by the removals left; a test
SHALL use at most three factory fixtures, those another one depends on
included, which take at most three factory fixture timeouts. `folders`,
`agents` and `prompts` SHALL depend on `teams`, and `agents` on `folders`, so
a folder is removed before its team. An agent SHALL be created in a personal
space or a team, and what a test duplicates or copies through `agents` SHALL
be removed as what it creates. A test SHALL NOT change a team it did not
create.

#### Scenario: A removal after a failed test

- **WHEN** a test creates a folder and then fails
- **THEN** the folder is removed after the test, and the report shows the removal as a step

#### Scenario: Folder before team

- **WHEN** a test created a folder in its temporary team
- **THEN** the folder is removed through the page, then the team through the API

#### Scenario: A failing removal is named

- **WHEN** one of two folders of a test cannot be removed
- **THEN** the other folder and the team are still removed, and the test fails naming the folder that was not

#### Scenario: The time limit

- **WHEN** one removal hangs
- **THEN** its step fails at its limit, the factory's later removals still run, and the test fails naming the removal that hung

#### Scenario: A test that times out while it creates a team

- **WHEN** a test times out before it has clicked the button that creates its team
- **THEN** its pages are closed before the removal, and Fred holds no team of the test afterwards

#### Scenario: Two tests create a team at the same time

- **WHEN** two tests create a team with the same word on two workers
- **THEN** Fred holds two teams with different names, and each is removed after its test

#### Scenario: An agent of the personal space

- **WHEN** a test creates an agent in the personal space
- **THEN** the agent is deleted from the personal space after the test

### Requirement: Temporary teams

`teams.create` SHALL create the team through Fred's pages as the platform
administrator and return it as plain data. It SHALL add the administrators
and members, grant the roles, enable the agent template and set the
capabilities specified in its options. Member and role assignments SHALL
use fixture names from the `AccountName` union, so setup opens a browser
context only for accounts the test drives.

The fixture SHALL record the team ID from the successful creation response.
Teardown SHALL delete only the team with that ID, even after a rename or a
later setup failure. It SHALL call Fred's API with the page's bearer token.
Teardown SHALL remove each folder before its team so the folder is still
accessible.

#### Scenario: A team with a member and a role

- **WHEN** a test calls `teams.create("documents", { members: ["secondUser"], roles: { admin: ["Editor"] } })`
- **THEN** the team's members page lists secondUser as a member and admin with the Editor role

#### Scenario: A renamed team

- **WHEN** a test renames its team in the console
- **THEN** teardown removes the team using the recorded ID, even if another team has taken its original name

#### Scenario: A rejected team creation

- **WHEN** creation is refused because another team already has the requested name
- **THEN** teardown leaves that team in place
