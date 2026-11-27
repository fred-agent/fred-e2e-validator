## 1. Classification

- [x] 1.1 Tag the case that opens a team's "Apps" page. Use [Playwright tags](https://playwright.dev/docs/test-annotations#tag-tests). Document the tag in the author guide and the exclusion in the operator guide.
- [x] 1.2 Expect "Pending" for a file uploaded without processing and remove the check of the mark "Uploaded", which Fred no longer shows.

## 2. Verification

- [x] 2.1 Verify the selection by full test title using [test discovery](https://playwright.dev/docs/test-cli). 1 case carries `@apps`; the default profile lists all 220 cases.
- [x] 2.2 Verify repository file formatting, type checks, lint, secret scanning and strict OpenSpec validation.
