## Why

Fred lists a team space's "Apps" page only when applications are enabled and
the team has at least one application. The temporary team of the tests has
none, so the case that opens the page fails on most deployments.

Fred no longer marks a document's row with where it came from: a file
uploaded without processing shows the status "Pending", and a processed file
shows no status once it is ready. The case that expected the mark "Uploaded"
fails although Fred behaves as intended.

## What changes

- Tag the case that opens a team's "Apps" page with `@apps`.
- Expect "Pending" for a new file uploaded without processing, and remove the
  check of the mark "Uploaded".
- Document the tag for authors and the exclusion for operators.

## Capabilities

- `test-files` defines the `@apps` tag and the selection it allows.
