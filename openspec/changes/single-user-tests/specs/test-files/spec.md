## ADDED Requirements

### Requirement: Tests of one user

A test of a member's personal space SHALL create resources in that space.
A test that creates a team SHALL carry `@team`. Teardown SHALL remove what
the test creates and restore each preference it changes.

#### Scenario: A member changes their profile

- **WHEN** a personal profile test changes a dedicated member's language
- **THEN** teardown restores that member's previous language

#### Scenario: An environment without temporary teams

- **WHEN** `excludeTags` holds `@team`
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
of the product. Every file SHALL carry its section tag. Additional tag meanings
and shared-canary eligibility are defined in `WRITING-TESTS.md`.

#### Scenario: Listing the tests

- **WHEN** `npx playwright test --list --reporter=list` runs
- **THEN** it lists every test under its file and its top-level group, and starts no browser
