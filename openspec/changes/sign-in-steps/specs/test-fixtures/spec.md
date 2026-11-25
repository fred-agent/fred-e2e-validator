## MODIFIED Requirements

### Requirement: Page objects

Page objects and components SHALL be the only place for locators. A test
SHALL reach them as typed properties of a user's `pages`, each created on
first use, whose public async methods carry
`@step`, the step decorator of `pages/step.ts`, after the example in
Playwright's `test.step` documentation, and run as steps whose subtitle
names the page and the account. A label a method takes SHALL be a union
type, so a wrong label fails the type check; a name of the test data, such
as the agent template, and a text of `sign-in.json` are text. An action SHALL
return the result a later check needs. A page object SHALL wait for the page
with web-first assertions and auto-waiting, SHALL wait until the part of the
page it reads has loaded before it checks that something is absent, and
SHALL decide what to check from the page alone. Only the API adapter SHALL
read response bodies. It SHALL record a temporary team's ID from the
successful creation response. At teardown it SHALL verify that the signed-in
user's bootstrap response lists that ID before deleting the team.

#### Scenario: A wrong label

- **WHEN** a test passes "Quick acces" as a home section
- **THEN** `make type-check` fails

#### Scenario: A button that is absent

- **WHEN** a test checks with `reloadAndExpectButtonAbsent` that a member without the Editor role does not see "Create Agent"
- **THEN** the agents page first shows "Settings" and the "Team agents" heading or the empty-list text, and then the check finds no "Create Agent"

#### Scenario: Two users in the run log

- **WHEN** `admin` and `member` each call a method of the resources page in one test
- **THEN** the run log shows "Resources page · admin" and "Resources page · member"
