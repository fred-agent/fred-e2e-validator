# quality-gates Specification

## Purpose

The checks a change passes before it is committed, the boundaries lint
enforces, and the rules for secrets, dependencies and unit tests.

## Requirements

### Requirement: The checks before a commit

`make code-quality` SHALL run the type check, the formatting check, the
lint, the secret scan, a check that `package.json` pins `@playwright/test`
to an exact version, a check that no `*.test.ts` exists under
`e2e-framework/` and a check that the staged `env-config.json` holds
`http://localhost:8080` as `fredBaseUrl`, and SHALL fail when any of them
fails. `make test-unit` SHALL run the unit tests of the service, and
`make spec-check` SHALL validate every OpenSpec change and spec strictly.

#### Scenario: A badly formatted file

- **WHEN** a TypeScript file is not formatted as Prettier formats it
- **THEN** `make code-quality` fails and names the file

#### Scenario: A working copy's address staged

- **WHEN** the staged `env-config.json` holds a `fredBaseUrl` other than `http://localhost:8080`
- **THEN** `make code-quality` fails and names `env-config.json` and `fredBaseUrl`

### Requirement: Boundaries are lint errors

ESLint SHALL reject a locator outside page objects and components, a script
run in a page, a fixed wait, a public async method of a page object, a
component or Fred's API adapter without `@step`, an import from `app/` into
`e2e-framework/`, the test-file patterns (an import other than the fixtures,
a locator, `expect`, a destructured `page`, `.only`, `test.skip`, `test.fail`, serial
mode, a `fixme` in another form, `›` or `>` in a title), and, anywhere,
`node:crypto`, `crypto` or `jose`.

#### Scenario: A fixed wait

- **WHEN** support code calls `page.waitForTimeout`
- **THEN** `make lint` fails and names the file and the line

### Requirement: Secrets and dependencies

`make detect-secret` SHALL fail on a finding that is not in
`.secrets.baseline`; account passwords SHALL be configured only in `.env` or a
Kubernetes Secret. `@playwright/test` SHALL be pinned to an exact version.

#### Scenario: A range on Playwright

- **WHEN** `package.json` declares `@playwright/test` as `^1.65.0`
- **THEN** `make deps-check` fails and names the package

### Requirement: Unit tests only for the service

`e2e-framework/` SHALL have no unit tests: it SHALL be checked by running
the tests against the local Fred. Unit tests SHALL exist only for the
service of the run page, in `app/service/`.

#### Scenario: A unit test in the support code

- **WHEN** a file `e2e-framework/fixtures/teams.test.ts` exists
- **THEN** `make code-quality` fails and names the file
