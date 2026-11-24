# run-from-fred Specification

## Purpose

The run page in Fred and its service: access, the tests it offers, its runs,
and the image, the chart and Fred's registration that deploy it.

## Requirements

### Requirement: Access check

The service SHALL serve the built run page at `/apps/e2e-tests` without a
token. Before every route under `/teams/<team>/` it SHALL ask Fred's
control plane, with the caller's own authorization header, on every
request, for the applications of the team, and SHALL serve the call only
when `e2e-tests` is listed. A call without a token, or for the team
`personal`, SHALL be refused without asking. Fred's control plane SHALL be
the one check of the caller's token.

#### Scenario: A team without the grant

- **WHEN** a member of a team that was not granted the application calls a team route
- **THEN** the service answers 403

### Requirement: The tests in the run page

The service SHALL read the test inventory, test files and their tests, once
at start with `playwright test --list --reporter=json`, and SHALL stop when
the tests do not load (the list command exits with an error or its report
holds `errors`) or when the test inventory refuses a title. The test
inventory SHALL refuse a test whose title path holds `›` or `>`, an empty
title, or a title with a line break or with spaces at its start or end, and
a test whose title path is the start of another test's title path in the
same file. The run page SHALL show each file's tests, offer every test,
chosen tags or picked test files, and a number of workers, and SHALL state
how many tests the choice runs, not counting planned tests.

#### Scenario: The count equals the run

- **WHEN** a user picks the tag `@smoke` and starts the run
- **THEN** the run executes exactly the number of tests the run page stated, and the run log's header states that number

### Requirement: Runs

A run SHALL be a child process running `playwright test` with a test list
file of the tests the run page counted, one line each in the format of
Playwright's test list, `--workers`, `--forbid-only` and `--output`, and the
HTML report's folder and title set through Playwright's variables. There
SHALL be at most one run at a time; a second start SHALL be answered 409. A
team's routes SHALL serve only that team's runs. A cancel SHALL stop the
run and its browsers after the tests' teardown. Each team's `KEEP_RUNS`
newest finished runs, 10 by default, SHALL be kept with their logs and
reports, and the team's oldest beyond that number SHALL be deleted when a run
ends and when the service starts. A log, a progress file or a record that
cannot be written SHALL end neither the run nor the service and SHALL change
no test's result; while the service runs, the end of a run SHALL be recorded
once its record can be written. A download that the client leaves SHALL close
its file.

#### Scenario: Another team's run

- **WHEN** a member of team A asks for the log of a run of team B
- **THEN** the service answers 404

#### Scenario: A record that cannot be written for a while

- **WHEN** the volume refuses a write when a run ends and accepts it a minute later
- **THEN** the service stays up, and the run shows its end without a restart

#### Scenario: An eleventh run

- **WHEN** a run of a team ends and ten finished runs of that team are already kept
- **THEN** the oldest of them is deleted with its report, and the runs of other teams are kept

### Requirement: The run page

The run page SHALL connect with `@fred-oss/iframe-sdk`, take its palette
from `@fred-oss/design-tokens` and its theme from the frame, use
`@fred-oss/ui` for its controls, and never hold the user's token.

#### Scenario: Fred switches to the dark theme

- **WHEN** the user switches Fred to the dark theme while the run page is open
- **THEN** the run page shows Fred's dark palette without being reloaded

### Requirement: Image, chart and registration

One image SHALL hold the service, the support code, the tests and the built
run page, and its build SHALL fail when the tests do not load. The chart
`fred-e2e-tests` SHALL require `envConfig` in its values, Fred's address
included, and mount the `env-config.json` it renders from it, take the
accounts from a named Secret, never run two pods on the runs volume, give
the pod no Kubernetes token, and be reachable only in the cluster. Fred's registration file SHALL register
`e2e-tests` with the display name "End-to-end tests".

#### Scenario: A test file that does not load

- **WHEN** the image is built with a test file that has a syntax error
- **THEN** the build fails and names the file

#### Scenario: Accounts in the cluster

- **WHEN** the chart is installed
- **THEN** no credential is in the chart, its values or its ConfigMaps

### Requirement: Exclusive volume handoff

The deployment operator SHALL wait for the release's Deployment and its pods to terminate before upgrading to a StatefulSet on the same claim.

#### Scenario: Upgrade with an existing Deployment

- **WHEN** the release uses a Deployment
- **THEN** its pods exit before the StatefulSet starts, and its run history remains on the claim
