# run-configuration Specification

## Purpose

How a run is configured: Playwright's configuration, `env-config.json`,
`sign-in.json`, the accounts in `.env`, and the selection of one run on the
command line.

## Requirements

### Requirement: A standard configuration

`playwright.config.ts` SHALL set `testDir` to `tests`, `forbidOnly` on CI,
`retries` 0, `locale` `en-US`, global setup and one project built from the
`browser` of `env-config.json`, with its device descriptor. Importing it
SHALL need no `.env`, so `npx playwright test --list` loads the tests
without `.env` and without a Fred. UI mode runs global setup before it
lists the tests, so it needs `.env`, with the accounts, but no running Fred.

#### Scenario: Listing without secrets

- **WHEN** `npx playwright test --list --reporter=list` runs with no `.env`
- **THEN** it lists the tests and starts no browser

### Requirement: env-config.json

`env-config.json` SHALL hold `fredBaseUrl`, Fred's address, `workers`,
`browser` (`msedge` by default, or `chromium`, `firefox` or `webkit`), `testTimeout`,
`expectTimeout`, `factoryFixtureTimeout` and `excludeTags`. Every key SHALL
be required and an unknown key rejected, naming the file and the key.
`fredBaseUrl` SHALL be an http or https origin; a user name, a password, a
path other than `/`, a query or a fragment SHALL be rejected, naming the
file and the key. `factoryFixtureTimeout` SHALL be at least 30 seconds, three
times the margin its removals leave. The committed file SHALL hold `http://localhost:8080` as
`fredBaseUrl`; each working copy sets the address of its own Fred and never
commits it. No variable
SHALL override the file. One function SHALL read Fred's address for the
configuration and the service. The tests carrying a tag of `excludeTags`
SHALL be left out by the project's `grepInvert`.

#### Scenario: An unknown key

- **WHEN** `env-config.json` holds `retries`
- **THEN** loading the configuration fails and names `env-config.json` and `retries`

#### Scenario: An address with a path

- **WHEN** the `fredBaseUrl` of `env-config.json` is `http://localhost:8080/app`
- **THEN** loading the configuration fails and names `env-config.json` and `fredBaseUrl`

#### Scenario: A tag this environment cannot run

- **WHEN** `excludeTags` holds `@model`
- **THEN** `npx playwright test --list --reporter=list` lists no test that carries `@model`

### Requirement: .env

`.env` SHALL hold only the account variables; any other key SHALL be
rejected with a fixed configuration error. `.env.example` SHALL
name the keys without values. Account provisioning SHALL report success or
failure without disclosing Secret names, account fields or deployment identifiers,
and SHALL read `.env` as the tests do.

#### Scenario: A run setting in .env

- **WHEN** `.env` holds `TEST_WORKERS=2`
- **THEN** loading the configuration fails with a generic configuration error

#### Scenario: Fred's address in .env

- **WHEN** `.env` holds `FRED_BASE_URL`
- **THEN** loading the configuration fails with a generic configuration error

### Requirement: Selection on the command line

A run SHALL be selected with Playwright's own arguments: test file filters,
`--grep` for tags and `--workers` for one run's workers. A file filter is a
regular expression matched against the absolute path of each test file, so
`documents/upload` also matches a `documents/upload-limits.spec.ts`.

#### Scenario: One file

- **WHEN** `npx playwright test documents/upload` runs
- **THEN** only the tests of `tests/documents/upload.spec.ts` run
