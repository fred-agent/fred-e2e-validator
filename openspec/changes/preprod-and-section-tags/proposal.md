## Why

Operators need to select cases that can run alongside existing users and teams on
a shared canary. Authors also need tags that identify the product area or file
format a test covers.

## What Changes

- Add an explicit `@preprod` selection for reviewed automated cases.
- Tag cases by section or feature and retain the quick sign-in check under
  `@smoke`. Remove the account-count classification and its default exclusion.
- Document how to select the shared-canary cases and which dedicated accounts
  the selection needs.

## Capabilities

### Modified Capabilities

- `test-files`: test classification and eligibility for shared environments.

## Impact

Test declarations, the default tag exclusions, and operator and author guidance.
