# Architecture

The design of the project: the parts between a test and Fred, the users and
their storage states, the factory fixtures and the removal of what a test
creates, the run configuration, timeouts, reports and the run from Fred.
The repository's layout and commands are in [`README.md`](README.md);
adding a test follows [`WRITING-TESTS.md`](WRITING-TESTS.md).
[Playwright's documentation](https://playwright.dev/docs/intro) covers
Playwright itself and describes its latest release; `package.json` pins the
version the project runs.

## Configuration and support code

`playwright.config.ts` sets `testDir: "tests"`, `fullyParallel`,
`forbidOnly: !!process.env.CI`, `retries: 0`, `workers`, `timeout`,
`expect.timeout` and `actionTimeout`, both equal to `expectTimeout`,
`baseURL`, `locale: "en-US"`,
`globalSetup: "./e2e-framework/fixtures/global-setup.ts"` and one project,
built from the `browser` of `env-config.json` with its device descriptor
and `excludeTags` as its `grepInvert`
([test configuration](https://playwright.dev/docs/test-configuration),
[projects](https://playwright.dev/docs/test-projects)).

- `msedge` selects the `Desktop Edge` device descriptor and the stable
  Edge channel. The shipped profile selects Edge. A profile can also
  select bundled Chromium, Firefox or WebKit.
- `locale: "en-US"` is written in `use`: the page objects match English
  labels, and Fred takes its language from the browser when an account has
  no saved preference
  ([locale](https://playwright.dev/docs/emulation#locale--timezone)).
- Importing the configuration needs no `.env`, so the list loads without it
  (README's [Run the tests](README.md#run-the-tests)). UI mode runs global
  setup before it lists the tests, so it needs `.env`, with the accounts, and
  a valid `sign-in.json`, but no running Fred
  ([UI mode](https://playwright.dev/docs/test-ui-mode)).

`e2e-framework/` holds the code the tests import, with a sub-folder per
role; `app/` and `deploy/` hold the run page, its service, image and chart.

| Folder        | Holds                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `fixtures/`   | `test.ts`, the test and its fixtures; the users and their storage states; the factory fixtures; global setup and the relay                      |
| `pages/`      | The page objects, their factory, the step decorator and its titles                                                                              |
| `components/` | The parts of Fred's pages: dialogs, tables, menus, navigation, forms; the actions of the sign-in pages; `describePage(page)` of `page-state.ts` |
| `flows/`      | The routes through several pages                                                                                                                |
| `config/`     | The readers of `env-config.json`, `sign-in.json`, `.env`, the accounts, the test data and the upload files                                      |
| `fred-api/`   | Fred's API adapter                                                                                                                              |
| `reporting/`  | The run log reporter, its line format and the failure summary                                                                                   |

## From a test to Fred

A test receives users, factory fixtures and the test data as fixtures
([fixtures](https://playwright.dev/docs/test-fixtures)), and calls page
objects and flows through them. Each part has one job: a user fixture signs
in, a factory creates and removes, a flow takes a route, a page object acts
and checks.

```text
test ─┬─► user fixture ──┬─► flows ─► page objects, components ─► Fred's pages
      │                  └─────────► page objects, components ─► Fred's pages
      └─► factory fixture ─► user ─┬─► flows ─► page objects, components ─► Fred's pages
                                   ├─────────► page objects, components ─► Fred's pages
                                   └─► Fred's API adapter ───────────────► Fred's API (team delete)
```

`member.pages.resources.upload(…)` takes the direct path from a user to a
page object; `member.flows.openFolder(folder)` takes a route through several
pages. A factory fixture acts through a user: the one the test passes, or,
for a team, the platform administrator's user, whose adapter for Fred's API
deletes the team.

| Part               | Where                                                                          | Its job                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Test file          | `tests/<area>/<name>.spec.ts`                                                  | The rules (`test.describe`) and cases (`test`) of one part of Fred, with `test.step` calls                                             |
| User fixture       | `fixtures/users.ts`                                                            | A browser context per account, signed in, with `account`, `pages` and `flows`                                                          |
| Factory fixture    | `fixtures/teams.ts`, `folders.ts`, `agents.ts`, `prompts.ts`, `preferences.ts` | Creates a team, a folder, an agent or a prompt under a unique name and removes it after the test, or changes a setting and restores it |
| Flow               | `flows/`                                                                       | A route through several pages                                                                                                          |
| Page object        | `pages/`, registered in `pages/pages.ts`                                       | The locators, actions and checks of one page of Fred                                                                                   |
| Component          | `components/`                                                                  | The locators, actions and checks of a part of Fred's pages, or of the sign-in pages                                                    |
| Fred's API adapter | `fred-api/`                                                                    | Reads a temporary team's id from its creation response and deletes the team by that id                                                 |

One browser context per account keeps each account's state apart, so a test
with two accounts never signs one out to sign the other in
([multiple roles](https://playwright.dev/docs/auth#testing-multiple-roles-together)).

```text
e2e-framework/fixtures/
├── test.ts            the test with the users, the test data and the factory fixtures
├── users.ts           User and Visitor: each a browser context with its page objects, flows and Fred's API
├── storage-states.ts  the worker's storage state of each account, signed in once
├── teams.ts           teams.create(…): works through flows and page objects, removes the team in its teardown
├── folders.ts         folders.create(…): works through flows and page objects, removes the folder in its teardown
├── agents.ts          agents.create(…): works through flows and page objects, removes the agent in its teardown
├── prompts.ts         prompts.create(…): works through flows and page objects, removes the prompt in its teardown
├── preferences.ts     changes a profile setting through the profile page, restores it in its teardown
├── global-setup.ts
└── relay.ts
```

### Page objects and components

- A user's `pages` exposes each page object as a typed property, such as
  `member.pages.resources`, created on first use for that user's page and
  account. `pages/pages.ts` is the factory of page objects
  ([page object models](https://playwright.dev/docs/pom)), and of the
  components its registry object names, such as
  `member.pages.accountMenu`.
- [WRITING-TESTS](WRITING-TESTS.md#a-page-object) gives the rules for
  writing a page object or a component.
- Every public async method of a page object, a component and Fred's API
  adapter carries `@step`, the step decorator of `pages/step.ts`, after the
  example in Playwright's `test.step` documentation
  ([test.step](https://playwright.dev/docs/api/class-test#test-step)). It
  runs the call as a boxed `test.step` titled with its method and arguments.
  An account argument shows the fixture role and synthetic username, and an
  object such as an invitation link shows as `…`. The subtitle shows the
  class and fixture role, for example `Resources page · member`.
  Every decorated class has a `page` member. When `TestUsers` or
  `StorageStates` opens a page, it maps the page to its account.
  `step.ts` uses that map to identify the account for the call.
- A call to a public method or to a component shows as a nested step, and
  the run log's CAUSE line names the innermost failing class.
- Playwright compiles the TypeScript it loads, decorators included. Node
  runs the service and its unit tests directly; neither imports a page
  object or a component.

### Waiting on the page

- A page object waits for the page itself, with web-first assertions and
  auto-waiting ([assertions](https://playwright.dev/docs/test-assertions),
  [actionability](https://playwright.dev/docs/actionability)).
  `expect(…).toPass` is for a block of several reads that must hold
  together, with an explicit timeout
  ([toPass](https://playwright.dev/docs/test-assertions#expecttopass)).
- A page object decides what to check from the page alone. The API adapter
  reads the team creation response to identify the team for teardown and
  the bootstrap response to check which teams the signed-in user can access.
- Each action (rename, remove, deactivate, activate, delete, save) ends on a
  sign that follows Fred's confirmation, such as the dialog closed or the
  card updated, before any method reloads the page, so a reload never
  cancels a request still running.
- Before a check that something is absent, a page object waits until the
  part of the page it reads has loaded:

| Page                                                 | What it waits for before it checks that something is absent                                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home page                                            | The "Personal space" link's address turns from `/team/personal/` to `/team/personal-<id>/`, which follows Fred's bootstrap and the teams                                    |
| Agents page                                          | "Settings" of a team, or the create action of an editor, shown once the space is loaded, and the list's heading or the empty-list text, shown once the agent list is loaded |
| Resources page of a member without the Editor role   | The "Storage" meter, shown once the team is loaded; on a team with no storage quota the check fails with a message that says so                                             |
| The resources' folder list                           | Another folder that the space holds, as the empty space's text shows also when the list fails                                                                               |
| A folder's documents                                 | A row or "This folder is empty."                                                                                                                                            |
| The agent form's capabilities                        | The heading "Turn on capabilities for your agent" and the first capability switch, which Fred draws together, before a capability is checked absent                         |
| Team members page of a member without the Admin role | A role of the member, shown disabled once the team is loaded                                                                                                                |
| Main navigation                                      | "Home"                                                                                                                                                                      |
| Prompts page                                         | The list's heading or the empty-list text, which a failed list does not show; a card's menu shows once the space is loaded                                                  |
| The profile and the account menu's picture           | The home page's "Personal space" link, as for the home page: the picture comes with Fred's bootstrap                                                                        |

The console's team list has no such sign: Fred shows "No teams yet." while
the list loads and when it fails, so a check finds a team absent from it only
beside a name the list shows, as a renamed team's new name.

### Flows

A flow (`flows/`) is a route through several pages, shared by tests and
factory fixtures; [WRITING-TESTS](WRITING-TESTS.md#a-flow) gives its rules.

## Users, account sets and storage states

| Fixture                                     | Its browser context starts                            | Has                                                                         |
| ------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `admin`, `member`, `secondUser`, `outsider` | Signed in as that account of the worker's account set | `account`, `pages`, `flows`                                                 |
| `visitor`                                   | With no state                                         | `pages`, `flows`, `signIn(name)`, `signOut()`, and `account` once signed in |

- The fixture's name is the account's name in code, in step titles and in
  the run log; [WRITING-TESTS](WRITING-TESTS.md#the-fixtures-a-test-receives)
  gives its typed union.
- **Account sets.** Each worker uses the account set of its parallel index
  plus one
  ([one account per parallel worker](https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker)).
  An account's variables carry the fixture's name in upper snake case
  (`ACCOUNT_SECOND_USER_USERNAME`); README's [Set up](README.md#set-up) lists
  them and says which accounts they name. Global setup checks that
  `config.workers` complete account sets exist before a browser starts
  ([global setup](https://playwright.dev/docs/test-global-setup-teardown)).
  Each test carries the annotation `account set`, which the HTML report
  shows on the test.
- **Storage states.** `fixtures/storage-states.ts` is a worker-scoped store
  of one storage state per account; storage states live in the worker's
  memory
  ([authentication](https://playwright.dev/docs/auth),
  [storageState](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)).
  It signs an account in once per worker, lazily, through Fred's pages on an
  empty context, from the test-scoped fixture that first needs it, and
  accepts Fred's terms when shown. The factory fixtures' removals use the
  same store.
- **A user.** A `User` (`fixtures/users.ts`) is a browser context opened
  with `browser.newContext({ storageState })`
  ([storageState option](https://playwright.dev/docs/api/class-browser#browser-new-context-option-storage-state)),
  so it starts signed in. Each explicit context inherits the configuration's `use` options
  ([option inheritance](https://playwright.dev/docs/test-use-options#explicit-context-creation-and-option-inheritance)).
- **A test's users.** The automatic fixture `testUsers` (`TestUsers` of
  `fixtures/users.ts`) opens an account's user on first use and gives the
  same user to that account's fixture and to `teams`, and opens the
  visitor's context and each removal's. The users' contexts are closed
  before the first removal, or after the test when it has no factory
  fixture, and every context that is left after the removals. A failed
  sign-in leaves its context open for the fixture's page diagnostic.
- **Signing in again.** Fred's frontend keeps its tokens in session storage
  ([session storage](https://playwright.dev/docs/auth#session-storage)). A
  storage state holds Keycloak's cookies and Fred's interface caches; a
  context opened from it loads Fred, which signs in again through Keycloak's
  own cookies without the form.
- **First load.** A user's first load of Fred waits for one locator: the
  home page's signed-in account menu, joined by `or()` with the element of the
  first step of `sign-in.json` and Fred's terms
  ([locator.or](https://playwright.dev/docs/api/class-locator#locator-or)).
  A session Fred refuses fails the test, naming the sign-in form or the
  terms, the account and the worker.
- **Signing out.** A sign-out ends the account's Keycloak session, so only
  the `visitor` has `signIn(name)` and `signOut()`: the "Disconnect" click
  is in `components/sign-out-menu.ts`, which only `Visitor` builds. Each
  use of a storage state renews Keycloak's idle limit.
- **Shared state.** The tests of a worker share each account's preferences,
  personal-space contents and memberships: what a test creates is removed in
  its factory's teardown, and a changed preference is restored as
  [WRITING-TESTS](WRITING-TESTS.md#setup-and-created-objects) says. Each
  active worker needs exclusive use of its dedicated accounts.
- After a failed test, each open user's page is described by
  `describePage(page)` of `components/page-state.ts`, a plain function that
  carries no `@step`, and attached as `PAGE_AT_FAILURE`, for the report and
  the run log.

## Factory fixtures and removal

[WRITING-TESTS](WRITING-TESTS.md#the-fixtures-a-test-receives) gives the
call of each factory fixture and what it returns. A team is removed through
Fred's API team delete, a folder through the resources page with the
documents in it, an agent through the agents page and a prompt through the
prompts page; a setting is restored through the page that changed it.

- A factory fixture works through flows and page objects, which hold the
  clicks (`createTeam` of the admin teams page, `createFolder` of the
  resources page, `create` of the agents page), and adds the unique name and
  the removal. `agents` creates an agent with the template and the use case of
  `testData`, in a personal space or a team, and records what `duplicate`,
  `copy` and `importFromMarketplace` create as it records what `create`
  does. An agent published to the marketplace goes with its removal.
  `prompts` records the copy `duplicate` names before it confirms the
  dialog; an unconfirmed copy is deleted if the space lists it.
- `personalAgent` creates agents only as `member` in the space of
  `testData`, with `create(word)`, which the test calls after setup. It
  hands creation and removal to one `Agents`. It depends on
  no other factory fixture and opens the member's user at the first
  creation, so a test can pair it with `prompts`, and so with `teams`,
  within three factory fixtures, where `agents` would bring `folders` too.
- `preferences` and `agents.sort` read a setting before they change it and
  record its restoration first. The restoration chooses the value again,
  goes to another page of Fred, which keeps the page while Fred saves the
  setting without a sign, loads Fred again and expects the value. An account
  whose language is French shows Fred in French on the first load of a
  restoration: the account menu's button, its "Profile" and the profile's
  title, "Back" and languages are found in English or in French. A picture
  cannot be read and put back, so `importPicture` fails for an account that
  has one.
- A team is registered for removal when its creation response supplies its
  id. Other factories record a pending removal before creation so teardown
  can clean up after a partial setup. Removal of a confirmed team or folder
  fails if Fred no longer lists it. A folder whose creation Fred did not confirm is
  taken as absent only beside another folder that the space lists. A test
  that deletes a folder itself calls `folders.delete(user, folder)`, after
  which its removal takes it as not confirmed.
- It is test-scoped and removes what it created in its own teardown, after
  `use`, after a passed, failed or timed-out test
  ([timeouts](https://playwright.dev/docs/test-timeouts)).
- **Order.** `folders`, `agents` and `prompts` depend on `teams`, and
  `agents` on `folders`, so Playwright tears a folder down before its team
  ([fixtures](https://playwright.dev/docs/test-fixtures)): a folder's
  removal needs the team to reach the folder. `personalAgent` depends on
  none: its agents are in the test data's space and use no folder.
- **The test's part ends first.** Before its first removal a factory closes
  the contexts of the test's users. The body of a test that timed out or was
  cancelled goes on beside the teardown, and could create a thing after its
  removal, so its pages are closed at once. The pages of any other test are
  read for the report first, once their context is offline
  ([setOffline](https://playwright.dev/docs/api/class-browsercontext#browser-context-set-offline)).
  From then on only a removal opens a user.
- **Every removal tried.** A factory tries every removal, newest first, even
  when one fails, and fails once at the end, naming every failed removal.
  The combined error starts with `REMOVAL_FAILED`, defined in
  `reporting/run-log.ts` and re-exported by `fixtures/test.ts`.
  The CAUSE line describes the failing action or assertion, locator role and
  timeout when available. When one fixture's teardown throws, the others still
  tear down. The loop is `removeEach` of `fixtures/test.ts`, which each factory
  fixture runs in its teardown over the removals its class lists.
- **One removal.** Each removal runs in a browser context of its own, opened
  from the storage state of the account that created the thing, so a test
  that left its own page broken does not stop it. It is a `test.step` titled
  for what it removes, with the subtitle `removal` and its own limit through
  the step's `timeout` option
  ([test.step](https://playwright.dev/docs/api/class-test#test-step)): a
  removal that hangs fails at its limit. Teardown closes its context
  immediately and attaches a generic page description. A removal that
  returns an error within its limit can report what its page showed. A
  sign-in in progress can finish, and a context that opens after the limit
  is closed immediately.
  An error the body raises after its limit is added to the test's errors.
- **In the reports.** The HTML report shows a removal under the fixture's
  teardown, and the run log marks it `AFTER`. A failed removal's page is
  attached as `PAGE_AT_FAILURE`, whether the test itself passed or failed,
  and the run log prints every such attachment in its PAGE lines.
- **Time limit.** Each factory fixture's `timeout` option
  ([timeouts](https://playwright.dev/docs/test-timeouts)) is
  `factoryFixtureTimeout` of `env-config.json`, which `fixtures/test.ts`
  reads when it is imported: one timeout for the fixture's setup and
  teardown together, the test between them aside. Each removal's limit is
  the fixture's time left, divided by the removals left, so later removals
  still run within `factoryFixtureTimeout`. The factory measures the time
  left from `factoryFixtureTimeout`, the time its setup took and the start
  of its teardown, less `REMOVAL_MARGIN_MS` (10 s) for describing a failed
  removal's page, closing its context and raising the combined error.
- **Worst case.** A test uses at most three factory fixtures, those another
  one depends on included, such as `agents` with `folders` and `teams`, and
  they tear down one after another. The users and the other fixtures without a timeout of their own
  tear down within the time Playwright gives the after hooks, the test
  timeout; a worker that stops after a failed test cleans up within the
  test timeout again. For a test on
  the default timeout, the worst case of a teardown is
  `3 × factoryFixtureTimeout + 3 × testTimeout`; a test with a longer
  timeout of its own may take its extra time on top.

### Temporary teams

A test changes only a team it created.

- `teams` takes the platform administrator's user lazily, inside `create`
  and in its own teardown, so a test that only creates a folder opens only
  the users it drives.
- `teams.create(word, options)` creates the team in the platform
  administrator's browser context with any additional admins. It adds
  the specified members, grants the requested roles, and configures the agent
  template and capabilities in Admin › Features. The options refer to
  accounts by fixture name.
  [Fixture example](WRITING-TESTS.md#the-fixtures-a-test-receives)
- It returns a `TemporaryTeam` containing the name used by flows.
  `teams.rename(team, word)` uses the console's edit form and returns a
  `TemporaryTeam` with the new name. Teardown uses the ID from creation.
- Its removal is Fred's API team delete with the page's own bearer token,
  through Playwright's request API
  ([API testing](https://playwright.dev/docs/api-testing)). `fred-api/`
  checks that the team id is in the administrator's bootstrap response and
  reads the token from the corresponding request.
- A test of membership or of what Admin › Features enables acts through
  `admin.flows` and `admin.pages`.

## Names

`uniqueName(word)`, the function a test-scoped fixture of `fixtures/test.ts`
gives the factory fixtures, returns `e2e <word> <stamp>`. The stamp is
the test's start time, worker and test number, so two tests that pass the
same word on two workers create two names. The `e2e` prefix marks in Fred
what the tests created.

## Run configuration

| What                                                                           | Lives in                                                                                  |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Workers, browser, the test, expect and factory fixture timeouts, `excludeTags` | `env-config.json`, committed; the chart renders its own                                   |
| Fred's address, `fredBaseUrl`                                                  | `env-config.json`, as README's [Set up](README.md#set-up) says; the chart renders its own |
| The steps of the sign-in pages                                                 | `sign-in.json`, committed; the chart renders one that a release sets                      |
| Accounts                                                                       | `.env` locally; a Secret in the cluster                                                   |
| One run's selection and workers                                                | Playwright's command line                                                                 |
| Test data: the space, the agent template, the use case                         | `test-data/test-data.json`                                                                |
| A run from Fred: report folder and title, progress file                        | Playwright's flags and variables; `RUN_PROGRESS_FILE`                                     |
| The service's own settings                                                     | Its environment, from the chart                                                           |

- **`env-config.json`** is read once and parsed with a strict `zod` schema
  ([zod: strict objects](https://zod.dev/api#objects)); README's
  [env-config.json](README.md#env-configjson) lists its keys and what is
  rejected, and the chart renders the file of each release.
  `fredBaseUrl()` in `config/settings.ts` is the one reader of Fred's
  address, its origin, for `playwright.config.ts` and the service.
  `excludeTags` is the project's `grepInvert`
  ([grepInvert](https://playwright.dev/docs/api/class-testproject#test-project-grep-invert)),
  and a command-line `--grep-invert` adds to it. A profile excluding
  `@multi-user` and a run selecting `@preprod` together select the cases
  a single dedicated platform administrator can exercise.
- **`sign-in.json`** is read once and parsed with a strict `zod` schema
  ([zod: unions](https://zod.dev/api#unions)); README's
  [sign-in.json](README.md#sign-injson) gives its steps and its limits. Global
  setup checks it after the accounts; `npx playwright test --list` and the
  service do not read it. `SignInPage` carries the steps out through
  `components/sign-in-actions.ts`, which finds an element by role and name,
  label or placeholder, matched whole and visible
  ([locators](https://playwright.dev/docs/locators)). The first step's element
  shows that the sign-in pages have loaded; the last step's, that they are
  still open.
- **`.env`** is read with Node's `util.parseEnv`
  ([Node: util.parseEnv](https://nodejs.org/api/util.html#utilparseenvcontent)),
  as README's [Set up](README.md#set-up) describes. The message on any
  unsupported entry is a fixed configuration error.
- **`testData`** is a worker fixture: `test-data/test-data.json`, parsed by
  a strict `zod` schema (`space`, `agentTemplate`, `agentUseCase`); an
  unknown key fails the fixture, naming the key and the file. Its `space` is
  a `Space`
  ([WRITING-TESTS](WRITING-TESTS.md#the-fixtures-a-test-receives)).
- **Selection** is Playwright's command line
  ([command line](https://playwright.dev/docs/test-cli)): file paths, tags
  and workers; README's [Run the tests](README.md#run-the-tests) gives the
  commands. A run's browser is the one of `env-config.json`.

## Timeouts and budgets

A budget is a timeout longer than the test timeout, exported beside its page
object, such as `PROCESSING_TIMEOUT` (600 s) beside the resources page;
`fixtures/test.ts` re-exports it for test files. The defaults below are the
values of the committed `env-config.json`.

| Limit                                  | Value                                                                     | Set by                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| A test                                 | 120 s by default                                                          | `testTimeout`                                           |
| A web-first assertion or an action     | 15 s by default                                                           | `expectTimeout`                                         |
| A page object's wait on a budget       | The budget, such as 600 s                                                 | The page object                                         |
| A test that waits on a budget          | The budget and a margin, such as 720 s                                    | `test.setTimeout` in the test                           |
| A factory fixture's setup and teardown | 120 s by default                                                          | `factoryFixtureTimeout`, the fixture's `timeout` option |
| One removal                            | The factory fixture's time left divided by the removals left              | The step's `timeout` option                             |
| A cancelled run in Fred                | `3 × factoryFixtureTimeout + 3 × testTimeout` and `STOP_MARGIN_MS`        | The service                                             |
| The pod's termination grace period     | `3 × factoryFixtureTimeout + 3 × testTimeout` plus 60 s, 780 s by default | The chart, from `envConfig`                             |

The test timeout is above every other wait of a page object (a user's first
load of Fred, 60 seconds; an action), so a slow Fred fails with the named
message of the wait ([timeouts](https://playwright.dev/docs/test-timeouts)).
The stop grace, the time the service waits for a cancelled run to stop, and
the termination grace period derive from the worst case of a teardown
([worst case](#factory-fixtures-and-removal)).

## Reports and the run log

- **Local runs.** The first reporter selects authored steps, fixture roles,
  page summaries and failure descriptions for the list and HTML reporters.
  Executing tests requires this filter. Discovery can select its own reporter.
  A failed or interrupted test has an in-memory JSON attachment with its step
  timeline. The HTML report includes the attachment. Browser recording is off,
  and the runner discards per-test output on completion.
  [Reporters](https://playwright.dev/docs/test-reporters)
- **The run log.** With `RUN_PROGRESS_FILE` set, as the service sets it for
  a run, the reporters are the run log and `html`. The run log writes the
  counts of tests loaded, passed, failed and skipped to the file
  `RUN_PROGRESS_FILE` names. It prints one line per test start and end,
  step, flow and page-object call to `RUN_LOG_FILE` when the service starts
  the run. Each entry carries the time, worker and test title path
  ([titlePath](https://playwright.dev/docs/api/class-testcase#test-case-title-path),
  [reporter API](https://playwright.dev/docs/api/class-reporter)). Its
  header counts the tests Playwright loads.
- **A failed test** has a CAUSE line, naming the innermost failing class,
  and a PAGE line for each `PAGE_AT_FAILURE` attachment, which the report
  also shows. A first sign-in page that does not show has the cause
  `SIGN_IN_NOT_SHOWN`; a sign-in whose last page stays open or comes back,
  `SIGN_IN_FAILED`, which says to check the account's user name and password
  and the steps of `sign-in.json`; a sign-in after which Fred shows no page,
  `FRED_NOT_SHOWN`. A failed step between them shows its action and text, such
  as `click("Next")`. A locator that matches several elements has the cause
  `SEVERAL_ELEMENTS`
  ([strictness](https://playwright.dev/docs/locators#strictness)). The first
  problem of `sign-in.json` stands in the report and the run log as global
  setup names it.
- **Fred's failed responses.** `testUsers` listens once to every browser
  context the test's fixtures open, the users', the visitor's and the
  removals', for `response` and `requestfailed`, so popups and later pages
  are covered
  ([response](https://playwright.dev/docs/api/class-browsercontext#browser-context-event-response),
  [requestfailed](https://playwright.dev/docs/api/class-browsercontext#browser-context-event-request-failed)).
  The `PAGE_AT_FAILURE` text of a failed test ends with Fred's responses
  with a status of 400 or more and the failed requests seen during the test:
  HTTP method, operation category and numeric status or transport failure.
  The list may hold responses that are normal for Fred, such as a 404.
- **Upgrades.** `@playwright/test` is pinned to an exact version.
  `reporting/failure-summary.ts` reads Playwright's message format, so an
  upgrade is taken when every test gives the result it gave on the pinned
  version, `make test-unit` passes, and one failing test's CAUSE line still
  names its cause.

## Run from Fred

| Name                                         | For                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `e2e-tests`                                  | The application id, the run page's address `/apps/e2e-tests`, Fred's registration |
| "End-to-end tests" ("Tests de bout en bout") | The run page's title and Fred's display name                                      |
| `fred-e2e-tests`                             | The package, chart, release and image; `statefulset/fred-e2e-tests`               |
| `fred-e2e-tests-accounts`                    | The accounts Secret                                                               |
| "Workers"                                    | The run page's count of workers                                                   |

### The service and the run page

- **Test inventory.** The service runs Playwright's command `playwright test`
  from `node_modules/.bin`. It reads the test inventory once at start with
  `playwright test --list --reporter=json`
  ([JSON reporter](https://playwright.dev/docs/test-reporters#json-reporter)),
  and stops when the tests do not load or a title breaks a rule of
  [titles of tests](#titles-of-tests). List mode runs no global setup, so
  the inventory needs no `.env`. The test inventory,
  `app/service/test-inventory.ts`, holds test files, with path, area and
  title, and their tests, with title path, tags and whether each is
  planned.
- **The choice.** The run page offers the choices README's
  [Run from Fred](README.md#run-from-fred) lists, shows each file's tests by
  title path and counts, and states how many tests the choice runs, not
  counting planned tests.
- **A start** writes those tests to a test list file in the run's folder,
  `<run>/tests.txt`, one line each, `<path from tests/> › <title path>`, and
  runs `playwright test --test-list <file> --workers <n> --forbid-only --output <run>/test-results`
  with `PLAYWRIGHT_HTML_OUTPUT_DIR`, `PLAYWRIGHT_HTML_TITLE` and
  `RUN_PROGRESS_FILE` and `RUN_LOG_FILE` in its environment
  ([test list](https://playwright.dev/docs/test-cli#test-list),
  [HTML reporter](https://playwright.dev/docs/test-reporters#html-reporter)).
  A test list's paths are relative to the top-level `testDir`, the
  configuration's `rootDir`. Each line names one test, so the run executes
  exactly the tests the run page counted, the number the run log's header
  states.
- **Access check.** The service serves the built run page at
  `/apps/e2e-tests` without a token. Before every route under
  `/teams/<team>/`, on every request, it asks Fred's control plane, with the
  caller's own authorization header, for the applications of the team, and
  serves the call only when `e2e-tests` is listed. A call without a token,
  or for the team `personal`, is refused without asking.
- **Runs.** A start during a run of any team gets the status 409. A team's
  routes serve only that team's runs. A cancel stops the run and its
  browsers after the tests' teardown. Each team's `KEEP_RUNS` newest
  finished runs, 10 by default, are kept with their logs and reports; its
  oldest beyond that number are deleted when a run ends and when the service
  starts. A log or a record that cannot be written ends neither the run nor
  the service and changes no test's result; the end of a run is recorded
  again every 30 seconds and when the service stops, with the time it had, and
  a run whose end was not recorded is marked interrupted when the service
  starts.
- **The run page** connects with `@fred-oss/iframe-sdk`, takes its palette
  from `@fred-oss/design-tokens` and its theme from the frame, and uses
  `@fred-oss/ui` for its controls.

### Image, chart and registration

- **The image** is built on Playwright's own image at the pinned version
  ([Docker](https://playwright.dev/docs/docker)) and holds the service, the
  support code, the tests, `test-data/`, `env-config.json`, `sign-in.json` and
  the built run page. The Linux AMD64 runtime adds Microsoft Edge Stable
  alongside the bundled Chromium, Firefox and WebKit browsers. Its build runs
  `npx playwright test --list --reporter=list`, so a test file that does not
  load fails the build and is named.
- **The chart** `fred-e2e-tests` requires `envConfig` in its values, every
  key of the schema, Fred's address `fredBaseUrl` included, and renders it
  into a ConfigMap of its own, mounted over the image's `env-config.json`. A
  release that sets `signIn` gets a ConfigMap with its `sign-in.json`, mounted
  over the image's. The service's ConfigMap holds the control plane, the runs
  folder, retention, the port and the relay. The chart takes the accounts from
  the Secret `accounts.existingSecret` names, `fred-e2e-tests-accounts` in
  `deploy/k3d/values-local.yaml`, runs at most one pod on the runs volume,
  and is reachable only in the cluster. It computes the pod's termination
  grace period, the worst case of a teardown plus 60 seconds, from
  `envConfig`.
- **The relay.** A browser in the pod sends a Fred at a `*.localhost`
  address to its own loopback. For such a Fred, the chart sets
  `LOCAL_RELAY` from `envConfig.fredBaseUrl` and `localRelay.ingress`, and
  global setup starts the relay of `fixtures/relay.ts`, which forwards the
  address's port to the cluster ingress for the length of the run.
- **Registration.** Fred's registration file,
  `deploy/k3d/fred-registration.yaml.gotmpl`, registers `e2e-tests` at
  `/apps/e2e-tests`, with the display name "End-to-end tests" and the
  upstreams `fred-e2e-tests`.

## Lint boundaries and checks before a commit

| Files            | ESLint rejects                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Everywhere       | An import of a cryptography module, and the global `crypto`                                                                                                                                                                                                                                                                                                     |
| `e2e-framework/` | An import from `app/`; a locator outside `pages/` and `components/`; a script run in a page; a fixed wait; in `pages/`, `components/` and `fred-api/`, a public async method without `@step`, a public async function held in a property, and a promise-returning function that is not `async`                                                                  |
| `tests/**`       | An import other than `e2e-framework/fixtures/test.ts`; a locator call; a destructured `page`, `context`, `browser`, `request` or `expect`, and `test.expect`; `.only`; `test.fixme` in a form other than a planned test's; `test.skip`, `test.fail`, `test.describe.skip`, `test.describe.fixme`; `test.describe.serial` and serial mode; `›` or `>` in a title |

`.only` meets two checks: ESLint catches it while a test is written; at run
time, `forbidOnly` on CI and `--forbid-only` in a run from Fred stop a run
that holds it.

README's [Check before committing](README.md#check-before-committing)
lists the targets of the checks before a commit and what each checks.

### Titles of tests

A run from Fred selects tests by title path: the service writes each line
of the test list as `<path from tests/> › <title path>`, Playwright's test
list also reads `>` as a separator, and a line matches every test whose
title path starts with it
([test list](https://playwright.dev/docs/test-cli#test-list)). Playwright
refuses two tests with the same title path in a file. So ESLint rejects `›`
and `>` in every title of a `test`, `test.describe`, `test.step` or
`test.fixme`; the service's test inventory refuses a title path that holds
either, an empty title, a title with a line break or with spaces at its
start or end, and a test whose title path is the start of another test's
title path in the same file. Each line of a test list then names one test.

## Beyond a standard Playwright project

| Part                                                                  | Its job                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `test.describe` per rule of the product, a `test` per case          | The list and the HTML report show each test under the rule of the product it checks; the run page shows each file's tests by title path                                                                                                                                               |
| Steps written in the test, each titled for exactly what its body does | A test reads as what it does, and the HTML report and the run log show each step by that title                                                                                                                                                                                        |
| Planned tests: `test.fixme` with their steps as comments              | Every rule of the product has a test; a search of `tests/` and the run page show what is automated and what is planned, and a planned test's steps are written before it is automated                                                                                                 |
| Section and feature tags, `@smoke` and `@preprod`                     | Section tags select product areas. `@smoke` selects the quick sign-in check. `@preprod` selects individually reviewed shared-canary cases.                                                                                                                                            |
| `test-data/test-data.json` and `testData`                             | The values several tests share, the space, the agent template and the use case, are in one committed file, checked by a strict schema and typed in tests                                                                                                                              |
| `make test TESTS=…`                                                   | One entry point beside the other targets, passing Playwright's own arguments to `npx playwright test`                                                                                                                                                                                 |
| The check for `*.test.ts` under `e2e-framework/`                      | The support code is checked by running the tests against a local Fred; unit tests belong to the service of the run page                                                                                                                                                               |
| Tokens left to Fred                                                   | Fred verifies every token: the service passes the caller's token to Fred's control plane on every request, the run page never holds it, and the browser's own session is reused. Nothing in the project creates, signs, verifies or exchanges a token or holds a key or client secret |
| `env-config.json`                                                     | One reviewed file for Fred's address and how an environment runs the tests; the chart supplies the file of each release                                                                                                                                                               |
| `sign-in.json`                                                        | The image signs in through the pages of each environment; a release supplies its own steps, and no code holds a text of the sign-in pages                                                                                                                                             |
| Strict `.env` loader                                                  | `.env` holds only the accounts                                                                                                                                                                                                                                                        |
| Account sets per worker and global setup's check                      | Each parallel worker uses an account set of its own; a missing variable stops the run before a browser starts                                                                                                                                                                         |
| Storage states kept in a worker's memory                              | One sign-in per account and worker; every user but `visitor` starts signed in                                                                                                                                                                                                         |
| Fred's failed responses listed on a failed test                       | A server error is named in the report and the run log, beside the element it left missing                                                                                                                                                                                             |
| Each removal in a browser context of its own                          | A test that left its own page broken does not stop the removal of what it created                                                                                                                                                                                                     |
| Temporary teams, set up through Fred's pages, deleted through its API | A test changes only a team it created                                                                                                                                                                                                                                                 |
| `uniqueName(word)` and the stamp                                      | Parallel tests never collide on a name in Fred                                                                                                                                                                                                                                        |
| Run log reporter and `RUN_PROGRESS_FILE`                              | The run page follows a run's log and progress                                                                                                                                                                                                                                         |
| The run log's CAUSE and PAGE lines                                    | Whoever reads the log in Fred sees why a test failed without opening the report                                                                                                                                                                                                       |
| Relay in global setup (`LOCAL_RELAY`)                                 | A browser in the pod reaches a Fred at a `*.localhost` address                                                                                                                                                                                                                        |
| `app/`, `deploy/`                                                     | Runs the tests from the run page in a Fred test environment                                                                                                                                                                                                                           |
| The checks of Playwright's pin and of the staged address              | `@playwright/test` pinned to an exact version in `package.json` and the committed `fredBaseUrl` in the staged `env-config.json`, checked before a commit                                                                                                                              |
