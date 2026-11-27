## ADDED Requirements

### Requirement: Personal agent and profile workflows

The suite SHALL exercise independent personal agent copies, profile Back
navigation from personal Prompts, and the personal prompt library in chat
using a dedicated member and test-created content.

#### Scenario: A duplicated agent keeps its own description

- **WHEN** the member duplicates an agent with a known description in the same personal space
- **THEN** the reopened duplicate has that description
- **AND** after the member edits the duplicate and reopens both agents, the duplicate has the new description and the source retains the original

#### Scenario: Back returns to the originating Prompts page

- **WHEN** the member opens the profile from personal Prompts and uses Back
- **THEN** the browser returns to the same personal Prompts URL and shows its Create prompt action without another navigation

#### Scenario: A personal chat lists the member's new prompt

- **WHEN** the member opens Prompt library in a new chat with the personal agent the test created
- **THEN** the panel lists the exact name of the personal prompt the test created
- **AND** after the member closes the panel, the composer is empty and no message has been sent

### Requirement: Deferred CSV processing and independent team settings

The suite SHALL verify processing from a stored file's row in a personal
folder and autosaving a description in a temporary team's settings.

#### Scenario: A pending CSV is processed after upload

- **WHEN** the member uploads a fresh CSV into a new personal folder with Upload only, observes Pending and starts processing from its row using its stored profile
- **THEN** that file reaches Done and its preview contains a known cell from the uploaded file

#### Scenario: Saving the description preserves a draft team name

- **WHEN** the team administrator types a different name and saves a valid description by leaving the description field
- **THEN** the open form retains the draft name after the saved description is reflected in the form
- **AND** reopening settings shows the original team name and the new description

### Requirement: Full personal prompt duplication

The suite SHALL check that duplicating a personal prompt copies its full
body and leaves the source's command assigned only to the source.

#### Scenario: The source body extends beyond the preview

- **WHEN** the member duplicates a personal prompt with a unique command and a known body longer than the card preview
- **THEN** after reopening, the duplicate has the complete body including its ending and an empty command
- **AND** the source still has its original command

### Requirement: Shared-canary selection for the six workflows

The suite SHALL tag each of these six automated cases individually with
`@preprod` after checking its hooks, fixtures, page visits, actions and
teardown. Writes SHALL be limited to the dedicated accounts' own data and
resources the test creates. The team settings case MAY use the dedicated
administrator to create, administer and delete its own temporary team. No
case SHALL change an existing team's resources, shared feature access,
platform settings or another user's data.

#### Scenario: The six reviewed cases join the existing selection

- **WHEN** the whole-tag browser-free inventory is compared before and after implementing this change
- **THEN** its only additions from this change are these six automated cases, with all previously selected cases retained
- **AND** the three isolated capability cases remain outside the selection
