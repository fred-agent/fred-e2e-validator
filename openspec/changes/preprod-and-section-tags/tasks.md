## 1. Classification

- [x] 1.1 Annotate sections and features and apply the reviewed canary selection to individual cases and parameter rows. Use [Playwright tags](https://playwright.dev/docs/test-annotations#tag-tests).
- [x] 1.2 Keep the default tag exclusions empty. Align the operator guide, author guide and applicable specifications.

## 2. Verification

- [x] 2.1 Compare the full inventory and planned cases with the baseline. Verify the exact selected case identities in the CLI and run page using [test discovery](https://playwright.dev/docs/test-cli). Both select the same 133 of 168 automated cases. All 42 planned cases are outside the selection.
- [x] 2.2 Verify repository file formatting, type checks, lint, secret scanning and strict OpenSpec validation.

## 3. Single-account shared-canary selection

- [x] 3.1 Tag the audited cases and parameter rows that require distinct users. Document the single-administrator profile and the scope of the tag.
- [x] 3.2 Verify the selection by full test title using [test discovery](https://playwright.dev/docs/test-cli). Of 139 shared-canary cases, 22 carry `@multi-user` and 117 match the single-account selection. Discovery with the default profile lists all 218 cases.
