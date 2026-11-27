## 1. Classification

- [x] 1.1 Tag the cases and parameter rows that open Admin › Analytics, a team's "Analytics" and the home section "Your activity". Use [Playwright tags](https://playwright.dev/docs/test-annotations#tag-tests). Document the tag in the author guide and the exclusion in the operator guide.

## 2. Verification

- [x] 2.1 Verify the selection by full test title using [test discovery](https://playwright.dev/docs/test-cli). 11 cases carry `@kpi-store`; the single-account shared-canary selection drops from 117 to 106 cases when it also excludes `@kpi-store`. Discovery with the default profile lists all 218 cases.
- [x] 2.2 Verify repository file formatting, type checks, lint, secret scanning and strict OpenSpec validation.
