# test-fixtures Specification

## Purpose

What a test receives: users, factory fixtures that create and remove what it
needs, page objects and test data.

## Requirements

### Requirement: Signed-in users

The fixtures `admin`, `member`, `secondUser` and `outsider` SHALL each be a
user opened on first use: a browser context of its own that starts signed
in as that account of the worker's account set, with its account, typed
page objects and flows. Each worker SHALL sign an account in through Fred's
pages once, from the test-scoped fixture that first needs it, and SHALL
keep its storage state in the worker's memory. A session Fred refuses
SHALL fail the test at the user's first load of Fred, naming the sign-in
form or Fred's terms that shows, the account and the worker. The fixture
`visitor` SHALL start with no state and SHALL be the only user that signs
in and signs out. Each worker SHALL use the account set of its parallel
index plus one, whose variables are `ACCOUNT_<NAME>_USERNAME`, `_PASSWORD`
and `_EMAIL` with the fixture's name in upper snake case, and global setup
SHALL stop the run before a browser starts when an account set the run's
workers need is incomplete, with a fixed configuration error.

#### Scenario: Two accounts in one test

- **WHEN** a test uses `admin` and then `secondUser`
- **THEN** each acts in its own context, signed in without the sign-in form, and neither is signed out for the other

#### Scenario: Two workers

- **WHEN** `npx playwright test --workers 2` runs without `ACCOUNT_SECOND_USER_USERNAME_2`
- **THEN** the run stops in global setup and reports that a required account is incomplete

### Requirement: Factory fixtures and removal

The factory fixtures `teams`, `folders` and `agents`, in
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
raising the combined error, divided by the removals left; three factory
fixtures take at most three factory fixture timeouts. `folders` and
`agents` SHALL depend on `teams`, and `agents` on `folders`, so a folder is
removed before its team. A test SHALL NOT change a team it did not create.

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

### Requirement: Temporary teams

`teams.create` SHALL, in one function, record the team and create it
through Fred's pages as the platform administrator, with the members,
roles, agent template and what Admin › Features enables that its options
name, and SHALL return it as plain data. Members and roles SHALL be given
as account names, of a typed union of the fixture names, so setup opens no
browser context for an account the test does not drive. Fred's API SHALL
serve only the team's deletion. The team SHALL be removed through Fred's
API team delete with the page's own bearer token. A folder's removal SHALL
run before its team's, as it needs the team to reach the folder.

#### Scenario: A team with a member and a role

- **WHEN** a test calls `teams.create("documents", { members: ["secondUser"], roles: { admin: ["Editor"] } })`
- **THEN** the team's members page lists secondUser as a member and admin with the Editor role

### Requirement: Page objects

Page objects and components SHALL be the only place for locators. A test
SHALL reach them as typed properties of a user's `pages`, each created on
first use, whose public async methods carry
`@step`, the step decorator of `pages/step.ts`, after the example in
Playwright's `test.step` documentation, and run as steps whose subtitle
names the page and the account. A label a method takes SHALL be a union
type, so a wrong label fails the type check; a name of the test data, such
as the agent template, is text. An action SHALL return the result a later
check needs. A page object SHALL wait for the page with
web-first assertions and auto-waiting, SHALL wait until the part of the
page it reads has loaded before it checks that something is absent, and
SHALL decide what to check from the page alone; only Fred's API adapter
reads Fred's bootstrap response, to delete a temporary team.

#### Scenario: A wrong label

- **WHEN** a test passes "Quick acces" as a home section
- **THEN** `make type-check` fails

#### Scenario: A button that is absent

- **WHEN** a test checks with `reloadAndExpectButtonAbsent` that a member without the Editor role does not see "Create Agent"
- **THEN** the agents page first shows "Settings" and the "Team agents" heading or the empty-list text, and then the check finds no "Create Agent"

#### Scenario: Two users in the run log

- **WHEN** `admin` and `member` each call a method of the resources page in one test
- **THEN** the run log shows "Resources page · admin" and "Resources page · member"

### Requirement: Test data

`testData` SHALL be the test data of `test-data/test-data.json`, parsed with
a strict schema that rejects an unknown key.

#### Scenario: A setting in test data

- **WHEN** `test-data/test-data.json` holds `fredBaseUrl`
- **THEN** the worker fixture fails and names the key and the file

### Requirement: Diagnostics at a removal deadline

A fixture SHALL close an expired removal's context immediately and use a generic page description. It SHALL collect live diagnostics from a test user's context only after network isolation succeeds.

#### Scenario: A pending removal exceeds its deadline

- **WHEN** the removal is waiting to send its next request at the deadline
- **THEN** the fixture starts closing its context before reading or attaching diagnostics

#### Scenario: Network isolation cannot be confirmed

- **WHEN** either isolation operation fails or the isolation deadline expires
- **THEN** the fixture closes that context and records a generic description
