## Why

A Fred test environment may sign its accounts in through its own pages: a
company sign-in with other buttons, other fields or several pages. The image
is the same in every environment, so the steps of the sign-in pages belong in
a file that a release of the chart can supply.

## What Changes

- `sign-in.json` holds the steps of the environment's sign-in pages, in
  order, on one page or several. A step clicks a button or a link by its text,
  or fills a field with the account's user name or password. The committed file
  describes Keycloak's own form.
- Global setup checks the file, and the reports show what is wrong with it.
- A component holds the two actions, each one a step of the report, such as
  `click("Next")`.
- A failed test whose locator matches several elements says so.
- The chart takes an optional list `signIn` and mounts it over the image's
  `sign-in.json`.
- `README.md`, `ARCHITECTURE.md` and `WRITING-TESTS.md` describe the file.

## Capabilities

### Modified Capabilities

- `run-configuration`: the file `sign-in.json` and what it rejects.
- `run-reporting`: what a run reports of a sign-in step, of the file and of a
  locator that matches several elements.
- `run-from-fred`: the chart's `signIn`; another list needs no image.
- `test-fixtures`: a text of `sign-in.json` is not a label of a union type.

## Non-Goals

- A step that runs only when its page shows: the list is fixed, and a page
  that is missing fails the sign-in.
- One-time codes, security keys and CAPTCHAs: the synthetic accounts of an
  environment sign in with a user name and a password.
- Sign-in pages in an iframe or a popup window, and a button, a link or a
  field found by anything other than its accessible name, its label or its
  placeholder.
- An account chosen by the environment: a list without a fill signs in
  whichever account the environment itself chooses.
- The switching-users test requires "Disconnect" to return to the first
  sign-in page.
- Other values of an account in a step, such as its email address.

## Impact

- New: `sign-in.json`, `e2e-framework/config/sign-in-steps.ts`,
  `e2e-framework/components/sign-in-actions.ts`.
- Removed: `e2e-framework/pages/sign-in-steps.ts`,
  `e2e-framework/pages/sign-in-actions.ts`.
- Changed: `e2e-framework/pages/sign-in-page.ts`, `home-page.ts` and
  `terms-page.ts`, `e2e-framework/fixtures/global-setup.ts`,
  `e2e-framework/config/settings-error.ts` and `environment.ts`,
  `e2e-framework/reporting/run-log.ts` and `failure-summary.ts`, the image,
  the chart, `README.md`, `ARCHITECTURE.md`, `WRITING-TESTS.md` and the
  Purpose of `openspec/specs/run-configuration/spec.md`.
- `env-config.json`, the service and `deploy/k3d/values-local.yaml` are
  unchanged. A release that sets no `signIn` renders as before, except the
  image tag. The chart and the image are released together, as 0.3.0: an
  image built without `sign-in.json` does not read a release's list.
