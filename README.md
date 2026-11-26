# Fred end-to-end tests

Playwright end-to-end tests for Fred test environments with synthetic test
accounts. A test file holds a `test.describe` per rule of the product and a
test per case; page objects and components hold every locator.

| Document                               | Holds                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)   | The design: fixtures, users and their storage states, factory fixtures, configuration, reports, the run from Fred |
| [`WRITING-TESTS.md`](WRITING-TESTS.md) | The procedure for adding a test                                                                                   |
| [`openspec/specs/`](openspec/specs/)   | The specifications, by capability                                                                                 |

## Layout

```text
tests/<area>/<name>.spec.ts     the test files, by area
test-data/test-data.json        the values the tests use
test-data/uploads/              the files the tests upload
env-config.json                 Fred's address and how the tests run
sign-in.json                    the steps of the sign-in pages
.env                            the accounts, never committed
.env.example                    the keys of .env, without values
playwright.config.ts            Playwright's configuration
e2e-framework/                  fixtures, page objects, components, flows, reporting
app/, deploy/                   the run page, its service, image and chart
openspec/                       specifications and changes
```

## Set up

Needs Node 24 or later, a Fred test environment and its synthetic accounts.
Install the locked dependencies and the browser selected in `env-config.json`.
The default is Microsoft Edge Stable. A local run on macOS uses the native
browser.

```bash
make install
```

```bash
make browsers
```

Fred's address is the `fredBaseUrl` of
[`env-config.json`](#env-configjson), set in the working copy and never
committed. The check before a commit refuses another address in the staged
file.

`.env` holds the accounts; its values are never committed. `.env.example`
names the account variables of sets 1 and 2, without values. Any other key
stops setup with a generic configuration error. Variables already set in the
environment keep their values.

| Variable                                              | For                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ACCOUNT_ADMIN_USERNAME`, `_PASSWORD`, `_EMAIL`       | `admin`, the platform administrator                                          |
| `ACCOUNT_MEMBER_USERNAME`, `_PASSWORD`, `_EMAIL`      | `member`, the user who works in the test space of `test-data/test-data.json` |
| `ACCOUNT_SECOND_USER_USERNAME`, `_PASSWORD`, `_EMAIL` | `secondUser`, a second user with no platform role                            |
| `ACCOUNT_OUTSIDER_USERNAME`, `_PASSWORD`, `_EMAIL`    | `outsider`, a user never added to any team                                   |
| The same names ending in `_2`, `_3` and so on         | Account sets 2, 3 and so on                                                  |

Account set 1 serves the first worker, set 2 the second, and so on: a run of
two workers needs sets 1 and 2. Global setup stops before a browser starts
if either set is incomplete. Give each worker its own set of dedicated
accounts. Running every `@preprod` case requires distinct accounts for
`admin`, `member`, `secondUser` and `outsider`. With one platform administrator,
use the [single-account shared-canary selection](#shared-canary). An account's
language is English and it has no profile picture; a test that changes
either puts it back. A setting the account never chose, such as its theme,
is chosen afterwards with the value it had, as Fred's pages cannot undo a
choice.

## env-config.json

`env-config.json` holds Fred's address and how an environment runs the
tests. The committed file:

```json
{
  "fredBaseUrl": "http://localhost:8080",
  "workers": 1,
  "browser": "msedge",
  "testTimeout": 120000,
  "expectTimeout": 15000,
  "factoryFixtureTimeout": 120000,
  "excludeTags": []
}
```

| Key                     | Sets                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| `fredBaseUrl`           | The address of the Fred test environment, an http or https origin         |
| `workers`               | The number of workers, and so of account sets                             |
| `browser`               | `msedge` (default), `chromium`, `firefox` or `webkit`                     |
| `testTimeout`           | The test timeout, in milliseconds                                         |
| `expectTimeout`         | The timeout of a web-first assertion and of an action, in milliseconds    |
| `factoryFixtureTimeout` | The timeout of each factory fixture's setup and teardown, in milliseconds |
| `excludeTags`           | The tags whose tests this environment leaves out, such as `@model`        |

Every key is required. An unknown key, a `fredBaseUrl` that is not an http
or https address, and a `fredBaseUrl` with a user name, a password, a path
other than `/`, a query or a fragment fail the loading of the
configuration, naming the file and the key, and so does a
`factoryFixtureTimeout` under 30 seconds, as the removals need time beside
their margin of 10 seconds.
No variable overrides these values; one run's options are Playwright's
command line.

To switch browsers locally, set `browser` and run `make browsers` if that
browser is missing. The same test command and tag filters apply.

## sign-in.json

`sign-in.json` holds the steps of the environment's sign-in pages, in order.
The committed file describes Keycloak's own form:

```json
[
  { "fill": "Username or email", "with": "username" },
  { "fill": "Password", "with": "password" },
  { "click": "Sign In" }
]
```

| Step                              | Does                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `{ "click": text }`               | Clicks the button or the link with this name                                                       |
| `{ "fill": text, "with": value }` | Fills the field with this label or placeholder; `value` is `username` or `password`, the account's |

A text is the whole text, with its capitals. The name of a button or a link
is its [accessible name](https://playwright.dev/docs/locators#locate-by-role),
which is the text the page shows unless the page gives it another one. The
last step is a click, which submits the last page. A list names no page: the
steps of one page or several stand one after the other, as an action waits
for its element. An environment with several pages:

```json
[
  { "click": "Company SSO" },
  { "fill": "someone@example.com", "with": "username" },
  { "click": "Next" },
  { "fill": "Password", "with": "password" },
  { "click": "Sign in" }
]
```

A working copy whose Fred signs in through other pages sets its own list and
does not commit it. The locator picker of
[Playwright's code generator](https://playwright.dev/docs/codegen#generating-locators)
shows the names and texts of each page. Recording is stopped first, so that
the generator writes nothing that is entered on the way to the next page:

```bash
npx playwright codegen --lang=en-US <address>
```

A fill takes the label as the page shows it, with a mark such as an asterisk,
where the picker shows the field's name without it.

Global setup stops a run before a browser starts when the file is missing, is
not JSON, or is not a list as above, and names `sign-in.json` and the number
of a step that is wrong. The limits of a list:

- Every step is carried out. A page that shows only sometimes, a one-time
  code, a CAPTCHA, an iframe and a popup window are not supported.
- A click fails when two visible buttons or links have its name, and a fill
  when two visible fields have its text. A field can be named by its other
  text, its label or its placeholder.
- A field hidden by its opacity or its position counts as visible, and a step
  can fill it on an earlier page.
- The first and the last text show on the sign-in pages only, not in Fred, and
  a first sign-in page that shows on every load is not supported.
- Two pages in a row with one text have a step between them.
- A list without a fill signs in the account the environment chooses.
- The switching-users test requires "Disconnect" to return the browser to
  the first sign-in page, or `sign-out.json` to lead back to it.

### sign-out.json

An environment whose sign-out asks something after "Disconnect", such as
which account to sign out of, describes it in `sign-out.json`: the steps from
"Disconnect" to the first sign-in page. Without the file, "Disconnect" leads
straight to it. Microsoft Entra ID, in French:

```json
[{ "choose": "username" }, { "click": "Utiliser un autre compte" }]
```

| Step                  | Does                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `{ "click": text }`   | Clicks the button or the link with this name, as in `sign-in.json`                                       |
| `{ "choose": value }` | Clicks the text that is the account's `username` or `email` alone, whatever its capitals, such as a tile |

Global setup checks the file as it checks `sign-in.json`. The file is not
committed and not in the image: a working copy or a run mounts its own.

## Run the tests

```bash
npx playwright test
```

```bash
npx playwright test documents/upload
```

```bash
npx playwright test --grep @smoke --workers 2
```

```bash
make test TESTS="documents/upload --workers 2"
```

```bash
npx playwright test --list --reporter=list
```

A file argument is a regular expression matched against the absolute path
of each test file, so `documents/upload` matches
`tests/documents/upload.spec.ts` and every other path that holds it, such
as a `tests/documents/upload-limits.spec.ts`. `--grep` selects tags and
`--workers` sets one run's workers. The list loads the tests without a Fred
and without `.env`.

### Shared canary

To run the reviewed cases on an environment shared with other teams, select
the whole `@preprod` tag. The first command previews the selection without a
browser. The second runs it.

```bash
npx playwright test --list --reporter=list --grep '(^|\s)@preprod(\s|$)'
npx playwright test --grep '(^|\s)@preprod(\s|$)'
```

On the run page, choose **By tag** and select **`@preprod` alone**. Adding
another tag also selects every automated case that carries that tag.
The default `excludeTags` is empty. A run with no selection includes cases
outside the shared-canary set.

With **one dedicated platform administrator**, use the same account in all
four unsuffixed role slots in `.env`. In your local `env-config.json`, set
`"workers": 1` and add `"@multi-user"` to `excludeTags`. The other settings
stay as configured. Preview or run the selection:

```bash
npx playwright test --grep @preprod --list --reporter=list
npx playwright test --grep @preprod
```

The exclusion drops shared-canary cases that need distinct people, including
cases whose setup adds a second user to a team. Keep `--grep @preprod`:
the account requirement has been classified for the shared-canary selection.

Set `space` in `test-data/test-data.json` to the dedicated accounts' personal
space and give each active worker exclusive use of its account set. These
cases may create teams visible to platform administrators, change membership
in those teams, and create agents, folders and prompts. Cases whose setup
grants a shared feature permission, or that publish, like or import a
marketplace agent, stay outside this selection.

Normal sign-in can accept terms for the dedicated accounts. Loading home
or listing teams can repair stale public-team visibility. Audit and usage
records persist, and a deleted team's starter prompts can still count toward
the platform total. Interrupted cleanup can leave test-owned resources or
invitation links behind.

### Reports

The default run produces the filtered HTML report. Open it with `make report`.
An override such as `--reporter=html` replaces the filter and stops the run
before tests start. Discovery can use `--list --reporter=list` or
`--list --reporter=json`.

Each failed test includes a JSON timeline of its steps, their start offsets,
durations and outcomes.
The report and run log may show synthetic usernames. Account passwords are excluded.
Normal runs keep browser traces, screenshots and video recording off.

A run from the command line also writes the files for Zephyr (Jira) to
`zephyr-report/`, or to the folder `ZEPHYR_REPORT_DIR` names:

- `zephyr-tests.csv`: one row per step of the test file, the test's
  columns repeated on each row (`Name`, `Description`, `Folder`, `Labels`,
  `Test Status`, `Executed On`, `Duration (s)`, `Environment`, `Comment`),
  then `Step` and `Step Result`. UTF-8 with a byte order mark, comma
  separated. Import it grouping rows by a change of `Name`.
- `junit.xml`: Playwright's JUnit report, for importing the results.

Both hide the account fields as the HTML report does.
Keep generated reports, including `docker-out/`, out of Git and issue
attachments. Raw diagnostic captures such as browser traces can contain
credentials, session cookies and page contents.
[Handling Playwright artifacts](https://playwright.dev/docs/ci-intro#properly-handling-secrets)

Playwright's documentation covers
[running tests](https://playwright.dev/docs/running-tests),
[UI mode](https://playwright.dev/docs/test-ui-mode),
[debugging](https://playwright.dev/docs/debug),
[the trace viewer](https://playwright.dev/docs/trace-viewer) and
[the VS Code extension](https://playwright.dev/docs/getting-started-vscode).

| Target     | Does                                                             |
| ---------- | ---------------------------------------------------------------- |
| `install`  | Installs the locked dependencies without running install scripts |
| `browsers` | Installs the browser `env-config.json` names                     |
| `test`     | Runs `npx playwright test` with `TESTS`                          |
| `report`   | Opens the HTML report with `npx playwright show-report`          |
| `help`     | Lists every target                                               |

## Run with Podman

[`deploy/podman/README.md`](deploy/podman/README.md) runs the published
image once from the host of a Fred under `podman compose`: the test
accounts, the files to mount, the command and the reports.

## Run from Fred

The same tests also run inside a Fred test environment, from the
application "End-to-end tests" (`e2e-tests`) in a team's Apps, whose page is
the run page. The run page runs every test, the tests of chosen tags, or
picked test files; starts a run of 1 to `MAX_RUN_WORKERS` (2) workers;
follows its log and progress; cancels it; and opens or downloads its
report. One run at a time across all teams. Fred's control plane checks
the caller's token on every call for a team's data.

The deployment factory is the repository that deploys Fred and its
applications to a local k3d cluster. `make ui` builds the run page with
Vite and `make image` builds the image with Docker, to check them locally;
the deployment factory's `make k3d-app` builds both itself, and the
Dockerfile builds the run page into the image.

The image includes Edge Stable, Chromium, Firefox and WebKit. A direct
container run reads `/app/env-config.json`, which can be mounted at run time.
Helm mounts the release's `envConfig` there. The local k3d profile selects
`chromium`. The image targets Linux AMD64, where the Edge package is
available. Docker on Apple Silicon needs AMD64 emulation to build or run
the image. Use Linux AMD64 nodes for native cluster runs.

```bash
make ui
```

```bash
make image
```

On the deployment factory's local k3d instance, named by `FRED=<instance>`,
`make k3d-accounts` writes the accounts Secret `fred-e2e-tests-accounts`
from `.env` and the account variables already set in the environment, as the
tests read them. After it, `make k3d-app`, run in the deployment factory's
checkout with `FRED_BASE_URL` exported in its shell, the `fredBaseUrl` of
this working copy's `env-config.json`, deploys the release `fred-e2e-tests`
from this checkout:

```bash
make k3d-accounts FRED=<instance>
```

```bash
make k3d-app FRED=<instance> DIR=<this checkout>
```

When upgrading from a Deployment, the k3d sync removes that controller with
foreground cascading deletion and waits for its pods to exit. The StatefulSet
then mounts the existing runs volume. For a direct Helm upgrade, run
`kubectl delete deployment <release> --namespace <namespace> --cascade=foreground --wait --timeout=15m`
in the target cluster first. Allow any active run to finish before the handoff.

Fred serves applications with `enableApplications: true` and registers this
one under `registrations.applications.e2e-tests`, both in
`deploy/k3d/fred-registration.yaml.gotmpl`, which the deployment factory's
`make k3d-app FRED=<instance> APP=fred DIR=<Fred checkout> VALUES=<that file>`
takes. Registration makes the application available; a platform
administrator enables it per team in Admin › Features, kind Apps, "Manage by
team"; where Fred has it on by default, every team has it unless disabled
for that team.

The service keeps each team's newest finished runs, 10 by default, with their
logs and reports, and deletes the team's oldest beyond that number when a run
ends and when the service starts; the run page lists the team's own.
`keepRuns` of the chart's values, from 1 to 1000, sets the number; on the
local k3d instance, in `deploy/k3d/values-local.yaml`.

The image holds the `sign-in.json` of the checkout it is built from; an image
for several environments is built from the committed file. A release for an
environment with other sign-in pages gives its whole list in `signIn` of the
chart's values, each text in quotes, as YAML reads a text such as `No` without
them as a boolean:

```yaml
signIn:
  - { click: "Company SSO" }
  - { fill: "Username", with: "username" }
  - { fill: "Password", with: "password" }
  - { click: "Sign in" }
```

A release without `signIn`, or with `signIn` null, uses the image's file. An
upgrade that removes `signIn` or takes another chart version does not use
Helm's `--reuse-values`, which keeps the release's list and the earlier
chart's image tag ([helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)).

A new image rolls the pod out. A change of the chart's values that reaches
only a ConfigMap, such as `envConfig.workers`, `keepRuns` or another list in
`signIn`, takes effect after
`kubectl rollout restart statefulset/fred-e2e-tests`. A Fred at a
`*.localhost` address needs the relay, which the chart sets up from the
Fred address and `localRelay.ingress`.

| Target         | Does                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `ui`           | Builds the run page into `app/ui/dist` (Vite)                                                                |
| `image`        | Builds the image of the service, the tests and the run page                                                  |
| `k3d-accounts` | Writes the accounts Secret of `FRED=<instance>` with the accounts the tests read; reports success or failure |

## Check before committing

Needs `uvx` for the secret scan and the OpenSpec CLI for the spec check. The
checks before a commit are these three targets, each passing:

```bash
make code-quality
```

```bash
make test-unit
```

```bash
make spec-check
```

One more target stands apart from the checks before a commit:

```bash
make audit
```

| Target                                                              | Does                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code-quality`                                                      | Type check, Prettier, ESLint with the boundary rules, the secret scan, a check that `package.json` pins `@playwright/test` to an exact version, a check that no `*.test.ts` is under `e2e-framework/`, and a check that the staged `env-config.json` holds `http://localhost:8080` as `fredBaseUrl` |
| `type-check`, `format-check`, `lint`, `detect-secret`, `deps-check` | One part of `code-quality` each                                                                                                                                                                                                                                                                     |
| `format-fix`                                                        | Formats the files in place with Prettier                                                                                                                                                                                                                                                            |
| `test-unit`                                                         | The unit tests of the service of the run page, in `app/service/`                                                                                                                                                                                                                                    |
| `spec-check`                                                        | Every OpenSpec change and spec, strictly                                                                                                                                                                                                                                                            |
| `audit`                                                             | Known vulnerabilities in the runtime dependencies; asks the npm registry                                                                                                                                                                                                                            |
