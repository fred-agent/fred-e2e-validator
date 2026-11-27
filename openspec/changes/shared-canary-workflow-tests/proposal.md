## Why

The suite checks that duplicated agents appear, that Back reaches Home from
the profile, and that a chat can open its prompt library. It also checks CSV
processing during upload and the length limit on team descriptions. Six
workflows cover what happens to the user's data across these actions.

## What Changes

- Check that editing a personal agent's duplicate leaves the source intact.
- Open the profile from personal Prompts and return there with Back.
- Find a test-created personal prompt in a test-created personal agent's chat.
- Process a previously stored CSV from its row and preview its content.
- Save a temporary team's description while a rename is still a draft.
- Duplicate a personal prompt with a command and a body longer than the card preview.

## Capabilities

### Modified Capabilities

- `test-files` covers the six workflows and their shared-canary selection.
- `test-fixtures` covers personal agent creation for chat and cleanup of prompt duplicates and the stored CSV.

## Impact

The implementation touches the account, agent, document, team and prompt
tests, their fixtures and their page objects. The cases use dedicated
accounts, personal spaces and one ordinary temporary team. Capability access
overrides belong to the separate `team-feature-access-tests` change.

## Non-Goals

Model responses, generated documents, marketplace publication and platform
configuration are outside these workflows.
