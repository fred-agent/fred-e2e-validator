## MODIFIED Requirements

### Requirement: Reports

A normal run SHALL record authored steps and page-object calls in its
HTML report. Account arguments MAY show the synthetic username. Each step of
`sign-in.json` SHALL be a step that shows its action and its text. Failed,
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

- **WHEN** the sign-in pages refuse an account on the page of the last sign-in step
- **THEN** the report and the run log say to check the account's user name and password and the steps of `sign-in.json`, and omit the password

#### Scenario: A sign-in step that fails

- **WHEN** the button "Next" of a step after the first is missing
- **THEN** the report and the run log show the failed step `click("Next")` and the cause that a button was not found

#### Scenario: Two elements of one text

- **WHEN** a locator of an action matches two elements
- **THEN** the report and the run log say that several elements match where one was expected

#### Scenario: The first sign-in page does not show

- **WHEN** the element of the first sign-in step does not show
- **THEN** the report and the run log say to check the first step of `sign-in.json`

#### Scenario: A sign-in file that is wrong

- **WHEN** global setup stops a run because of `sign-in.json`
- **THEN** the report and the run log show the first problem that global setup names

#### Scenario: Fred does not show after a sign-in

- **WHEN** every sign-in step was carried out and Fred then shows neither its terms nor its signed-in page
- **THEN** the report and the run log say so and that the steps of `sign-in.json` must reach the end of the sign-in pages, without a hint to check the password
