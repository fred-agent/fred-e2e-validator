## ADDED Requirements

### Requirement: Sign-in steps

`sign-in.json` SHALL hold a list of at least one step of the environment's
sign-in pages, one page or several, in the order they are carried out. A step
SHALL be a `click`, with the whole accessible name of a button or a link, or a
`fill`, with the whole label or placeholder of a field, and a `with`, which is
`username` or `password`. The last step SHALL be a click.
Global setup SHALL stop a run before a browser starts when the file is
missing, is not JSON or holds any other list, naming the file and, for a step
that is wrong, its number from 1, and no value of the file. The committed file
SHALL hold the steps of Keycloak's own form. `npx playwright test --list`
SHALL need no `sign-in.json`.

A sign-in SHALL carry out every step, and SHALL fail when a step has no
visible element or several. The first step's element SHALL show that the first
sign-in page has loaded; a sign-in SHALL fail when the last step's element
stays visible after the last step.

#### Scenario: Sign-in on one page

- **WHEN** `sign-in.json` lists the fields and the button of one page
- **THEN** a sign-in carries them out on that page

#### Scenario: Sign-in with one click

- **WHEN** `sign-in.json` lists one click only
- **THEN** a sign-in clicks it, and the account signed in is the one the environment chooses

#### Scenario: Sign-in over several pages

- **WHEN** `sign-in.json` lists a link of a first page, a field and a button of a second page, and a field and a button of a third page
- **THEN** a sign-in carries them out in that order

#### Scenario: A credential in a step

- **WHEN** the `with` of a step is neither `username` nor `password`
- **THEN** global setup stops the run and names `sign-in.json` and the step's number, without the value

#### Scenario: A misspelled action

- **WHEN** the second step of `sign-in.json` holds `clik`
- **THEN** global setup stops the run and names `sign-in.json` and step 2

#### Scenario: A list that ends in a field

- **WHEN** the last step of `sign-in.json` is a `fill`
- **THEN** global setup stops the run and says that the last step of `sign-in.json` must be a click

#### Scenario: A page that does not show

- **WHEN** the button of the third step is missing
- **THEN** the sign-in fails at that step, and no later step is carried out

#### Scenario: A button and a link of one name

- **WHEN** a page shows a button and a link named "Sign in" and a step after the first clicks "Sign in"
- **THEN** the sign-in fails at that step and clicks neither

## MODIFIED Requirements

### Requirement: A standard configuration

`playwright.config.ts` SHALL set `testDir` to `tests`, `forbidOnly` on CI,
`retries` 0, `locale` `en-US`, global setup and one project built from the
`browser` of `env-config.json`, with its device descriptor. Importing it
SHALL need no `.env`, so `npx playwright test --list` loads the tests
without `.env` and without a Fred. UI mode runs global setup before it
lists the tests, so it needs `.env`, with the accounts, and a valid
`sign-in.json`, but no running Fred.

#### Scenario: Listing without secrets

- **WHEN** `npx playwright test --list --reporter=list` runs with no `.env`
- **THEN** it lists the tests and starts no browser
