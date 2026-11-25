## ADDED Requirements

### Requirement: Tests of one user

A test without `@extended` SHALL use only `admin` and `member`, which may be
one account. A test that creates a team SHALL carry `@team`. A test that
carries neither SHALL create only in the member's personal space, and SHALL
change no setting but the member's own. What a test creates SHALL be removed,
and a setting it changes restored, after it.

#### Scenario: An environment with one account

- **WHEN** `excludeTags` holds `@extended` and the variables of every account name one account
- **THEN** a run holds only tests of one user, and the account's personal space and profile are as before it

#### Scenario: An environment without temporary teams

- **WHEN** `excludeTags` holds `@extended` and `@team`
- **THEN** a run creates no team

## MODIFIED Requirements

### Requirement: What a test does not do

No test SHALL type into or send anything in a conversation, or delete,
overwrite or remove a user, a team or data it did not create, such as a text
or a file someone else wrote, an announcement, or an agent another team
published. A test MAY change a choice for every team or every user when it
reads the choice first and a fixture's teardown puts it back, and MAY publish
to the marketplace only an agent of a team it created. No test SHALL reset,
import or repair platform data, dismiss a task or a model, announce or
withdraw an update, or import users into the whitelist.

#### Scenario: A form in the console

- **WHEN** a test fills the form of a new team with the name of its own team
- **THEN** Fred refuses it, the test cancels the form, and Fred holds one team of that name

#### Scenario: A rule only a forbidden test could check

- **WHEN** a rule's test would reset the platform's agents
- **THEN** the rule keeps a planned test whose first comment line gives the reason

### Requirement: Test files

Every test file SHALL be `tests/<area>/<name>.spec.ts`, begin with a comment
that says which part of Fred it covers and its source, and hold one
top-level `test.describe`. Tests are grouped in a `test.describe` per rule
of the product, and the only tags are `@smoke`, `@model`, `@ppt`, `@team`
and `@extended`: conventions of `WRITING-TESTS.md`.

#### Scenario: Listing the tests

- **WHEN** `npx playwright test --list --reporter=list` runs
- **THEN** it lists every test under its file and its top-level group, and starts no browser
