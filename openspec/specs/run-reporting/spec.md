# run-reporting Specification

## Purpose

What a run reports: Playwright's reports, and the run log and progress of a
run from Fred.

## Requirements

### Requirement: Reports

A normal run SHALL record authored steps and page-object calls in its
HTML report. Account arguments MAY show the synthetic username. Failed,
timed-out and interrupted tests SHALL include a JSON timeline of step names,
start offsets, durations and outcomes. Retained
output SHALL exclude browser API arguments, raw exceptions, worker output,
screenshots, traces, video, and automatic page snapshots.

#### Scenario: A failed test

- **WHEN** a test fails after entering an account's credentials
- **THEN** the HTML report contains the failed step and timeline, and the report and run log retain the synthetic username and omit the password

#### Scenario: A passing sign-in

- **WHEN** a test signs in successfully
- **THEN** the report shows the authored sign-in step and synthetic username and omits the password

#### Scenario: A refused sign-in

- **WHEN** Fred's sign-in form refuses an account
- **THEN** the report and the run log say to check the account's user name and password, and omit the password

#### Scenario: Fred does not show after a sign-in

- **WHEN** the form accepts an account and Fred then shows neither its terms nor its signed-in page
- **THEN** the report and the run log say so, without a hint to check the password

### Requirement: Run log and progress

When `RUN_PROGRESS_FILE` is set, the reporters SHALL be the run log and
`html`, and the run log SHALL write the tests loaded, passed, failed and
skipped to that file. The run log SHALL write one line for each test start
and end, step, flow and page-object call, with the time, the worker and the
test's title path from the top-level group. A page-object call made inside
another SHALL show as a nested step. A failed test SHALL have a CAUSE line,
naming the innermost failing class, and a PAGE line. A removal that fails in
a factory's teardown SHALL have its page shown in a PAGE line and the
report, whether the test itself passed or failed. When a test fails, the
PAGE line and the report SHALL list Fred's responses with a status of 400
or more and the failed requests seen in every browser context the test's
fixtures open, the removals' included, by HTTP method, operation category,
and status or transport failure, and SHALL change no result.

#### Scenario: A missing button

- **WHEN** a page-object call fails because a button is not found
- **THEN** the log shows `FAIL`, a CAUSE line describing the missing element and a PAGE line indicating which landmarks were visible

#### Scenario: A run in progress

- **WHEN** two of three tests have ended, one passed and one failed
- **THEN** the progress file shows three tests loaded, one passed and one failed

#### Scenario: Fred returns a 500 response

- **WHEN** Fred returns a 500 response to a request of the test and the test then fails on a missing element
- **THEN** the report and the run log list the HTTP method, operation category and status 500
