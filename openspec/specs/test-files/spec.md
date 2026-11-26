# test-files Specification

## Purpose

How test files are written: their structure, steps, independence, limits,
planned tests and timeouts.

## Requirements

### Requirement: Test files

Every test file SHALL be `tests/<area>/<name>.spec.ts`, begin with a comment
that says which part of Fred it covers and its source, and hold one
top-level `test.describe`. Tests are grouped in a `test.describe` per rule
of the product. Every file SHALL carry its section tag. Additional tag meanings
and shared-canary eligibility are defined in `WRITING-TESTS.md`.

#### Scenario: Listing the tests

- **WHEN** `npx playwright test --list --reporter=list` runs
- **THEN** it lists every test under its file and its top-level group, and starts no browser

### Requirement: Steps and created objects

A test's steps SHALL be `test.step` calls inside the test, each titled with
plain prose that says what its body does, naming an account by its
fixture name. Setup that every test of a group needs SHALL be
`test.beforeEach`. A step that creates something SHALL return it, and later
steps SHALL take it as an argument. A title SHALL name a created object by
its kind. A test SHALL hold no locator, no `expect` and no `page`,
`context`, `browser` or `request`, as page objects keep their locators
private and lint rejects a locator call and `test.expect`, and SHALL import
only `e2e-framework/fixtures/test.ts`.

#### Scenario: A locator in a test

- **WHEN** a test file calls `getByRole`
- **THEN** `make lint` fails and names the file and the line

#### Scenario: A page in a test

- **WHEN** a test destructures `page` from its fixtures
- **THEN** `make lint` fails and names the file and the line

### Requirement: Independent tests

A test run alone SHALL pass without any other test having run. A test that
changes an account's preference SHALL restore it in a fixture's teardown. No
file SHALL run in serial mode, and a failed test SHALL NOT be run again.

#### Scenario: One test alone

- **WHEN** a single test of a file is run alone
- **THEN** it passes, and the account's preferences are as before

### Requirement: What a test does not do

No test SHALL type into or send anything in a conversation. In the technical
console, a test MAY create its own team through `teams` and set what Admin ›
Features enables for that team; beyond that, it SHALL save, export, import,
repair, reset or run nothing, and SHALL cancel a form it opens. No test
SHALL change a setting for every team or every user, or publish to the
marketplace.

#### Scenario: A form in the console

- **WHEN** a test opens the form of a new banner
- **THEN** it cancels the form, and Fred has no new banner

### Requirement: Planned tests

A rule without an automated test SHALL hold `test.fixme(title, body)` or
`test.fixme(title, details, body)`, with its steps as comments in the body;
a test planned by decision SHALL give the reason in its first comment line.
ESLint SHALL reject `test.fixme` in any other form, and `.only`,
`test.skip`, `test.fail`, `test.describe.skip`, `test.describe.fixme` and
`test.describe.serial` in a test file.

#### Scenario: A switched-off test

- **WHEN** a test calls `test.fixme()` inside its body
- **THEN** `make lint` fails and names the file and the line

### Requirement: Timeouts

A test SHALL use the default timeout of `env-config.json` unless it waits on
a longer budget of a page object, and then SHALL set that budget and a
margin with `test.setTimeout`.

#### Scenario: A test that processes a document

- **WHEN** a test waits for Fred to process a document
- **THEN** it sets its own timeout with `test.setTimeout` and the other tests of its file keep the default
