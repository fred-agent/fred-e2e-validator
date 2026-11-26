# Writing tests

The procedure for adding a test, and the conventions every test file
follows. The design behind them is [`ARCHITECTURE.md`](ARCHITECTURE.md);
running the tests is in [`README.md`](README.md).

Playwright documents its own tools:

| Topic                       | Playwright's page                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Running and filtering tests | [Running and debugging tests](https://playwright.dev/docs/running-tests), [command line](https://playwright.dev/docs/test-cli) |
| UI mode                     | [UI mode](https://playwright.dev/docs/test-ui-mode)                                                                            |
| Debugging                   | [Debugging tests](https://playwright.dev/docs/debug)                                                                           |
| Artifact handling           | [Handling test artifacts](https://playwright.dev/docs/ci-intro#properly-handling-secrets)                                      |
| Reports                     | [Reporters](https://playwright.dev/docs/test-reporters)                                                                        |
| VS Code                     | [VS Code extension](https://playwright.dev/docs/getting-started-vscode)                                                        |
| Locators                    | [Locators](https://playwright.dev/docs/locators)                                                                               |
| Assertions                  | [Assertions](https://playwright.dev/docs/test-assertions)                                                                      |
| Fixtures                    | [Fixtures](https://playwright.dev/docs/test-fixtures)                                                                          |

## Adding a test

1. Look at what is tested.
2. Find the file and the rule the test belongs to; a part of Fred without a
   file gets one, and a rule without a group gets one.
3. Write the test and its steps, calling fixtures, flows and page objects.
4. Add what the steps need: a page-object method, a component, a flow or a
   factory fixture.
5. Run the test against a Fred test environment and read each step's title
   against the code under it.
6. Pass the checks before a commit: `make code-quality`, `make test-unit`
   and `make spec-check`.

## Look at what is tested

```bash
npx playwright test --list --reporter=list
```

The list shows every test under its file and its top-level group; README's
[Run the tests](README.md#run-the-tests) says what it needs. A search of
`tests/` for the behaviour, and for `test.fixme(`, shows what is automated
and what is planned, so no behaviour is tested twice. A planned test of the
rule is automated where it stands: `test.fixme` becomes `test`, and its
comment steps become steps.

The list is read with `--reporter=list`, which replaces the configured
reporters: `html` then does not rebuild `playwright-report/`, and the run
log, when it is configured, does not hide the list.

## The test file

A test file is `tests/<area>/<name>.spec.ts`, one per part of Fred. The
areas are `accounts`, `admin`, `agents`, `capabilities`, `documents`,
`home`, `marketplace`, `prompts`, `resources`, `spaces`, `teams` and `wiki`.
The upload test file, with two of its rules:

```ts
// Uploading documents: members add files to the folders of a space they
// can edit. Source: Help Center, "Resources".
import { test, type Folder } from "../../e2e-framework/fixtures/test.ts";

test.describe("Uploading documents", { tag: "@document" }, () => {
  let folder: Folder;

  test.beforeEach(async ({ member, folders, testData }) => {
    folder = await test.step("member creates a folder in the test space", () =>
      folders.create(member, testData.space, "upload"));
  });

  test.describe("A member adds files to a folder of a space they can edit", () => {
    test(
      "A file stored without processing is listed as pending",
      { tag: "@preprod" },
      async ({ member }) => {
        await test.step('member uploads "e2e-sample.txt" into the folder without processing', async () => {
          await member.flows.openFolder(folder);
          await member.pages.resources.upload("e2e-sample.txt", "Upload only");
        });
        await test.step('member sees "e2e-sample.txt" with the status "Pending"', () =>
          member.pages.resources.expectStatus("e2e-sample.txt", "Pending"));
      },
    );
  });

  test.describe("A new file is marked as uploaded", () => {
    test.fixme('A new file is marked "Uploaded"', () => {
      // member uploads "e2e-sample.txt" into the folder without processing
      // member sees "e2e-sample.txt" marked "Uploaded" in the folder
    });
  });
});
```

| Part                      | Holds                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| The comment at the top    | Which part of Fred the file covers and its source: an article of Fred's Help Center, or the Fred page it tests           |
| The import                | Only `e2e-framework/fixtures/test.ts`: `test`, the types and the budgets it exports                                      |
| Top-level `test.describe` | One per file, titled for what the file tests ([test.describe](https://playwright.dev/docs/api/class-test#test-describe)) |
| A `test.describe` inside  | One rule of the product                                                                                                  |
| `test`                    | One case of the rule                                                                                                     |
| `test.fixme`              | A planned test                                                                                                           |

A test file holds no locator, no `expect` and no `page`, `context`,
`browser` or `request`: it calls page objects, flows and fixtures, and a
page-object method makes each check. ESLint enforces it, and page objects
keep their locators private.

## The fixtures a test receives

| Fixture                                     | Gives                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `admin`, `member`, `secondUser`, `outsider` | The account of that name, signed in; README's [Set up](README.md#set-up) describes each                            |
| `visitor`                                   | A user whose browser context starts with no state, with `signIn(name)` and `signOut()`                             |
| `teams`                                     | `teams.create(word, options)`, which returns a `TemporaryTeam`, and `teams.rename(team, word)`                     |
| `folders`                                   | `folders.create(user, space, word)`, which returns a `Folder`, and `folders.delete(user, folder)`                  |
| `agents`                                    | `agents.create(user, space, word)`, which returns an `Agent`; `duplicate`, `copy`, `sort`, `importFromMarketplace` |
| `prompts`                                   | `prompts.create(user, space, word, options)`, which returns a `Prompt`; `delete`, `withCommandOf`                  |
| `preferences`                               | `chooseAnotherTheme`, `chooseAnotherMode`, `chooseLanguage` and `importPicture` of a user                          |
| `testData`                                  | The test data: `space`, `agentTemplate`, `agentUseCase`                                                            |
| `accounts`                                  | The worker's account set: `accounts.get(name)` gives an account without opening a browser context                  |

- A user is a browser context of its own with `account`, `pages`, the typed
  page objects such as `member.pages.resources`, and `flows`, the routes
  such as `member.flows.openFolder(folder)`. Acting as another account is
  using another user.
- Only `visitor` signs in and out; the sign-in test and the switching-users
  test use it. Step titles name it `visitor`, as in "visitor signs in as
  member".
- An account is named by its fixture name, of the typed union `AccountName`:
  `visitor.signIn(name)` takes one, and so do a team's members and roles,
  so setup opens no browser context for an account the test does not drive.
- A factory takes its arguments in one order: the acting user when there is
  one, the space or team it creates in, the word, and the options. A team's
  options name its other admins, its members, the roles of its members and of
  `admin`, who administers it, the agent template, and the capabilities to
  enable or disable for it in Admin › Features:

  ```ts
  teams.create("documents", {
    members: ["secondUser"],
    roles: { admin: ["Editor"] },
    agentTemplate: testData.agentTemplate,
  });
  ```

- A `Space` is a `TemporaryTeam` or `testData.space`; a `Folder`, an `Agent`
  and a `Prompt` hold their space and their name. The types `Space`,
  `Folder`, `TemporaryTeam`, `Agent` and `Prompt` come from
  `e2e-framework/fixtures/test.ts`.

## Steps and their titles

- Steps are `test.step` calls inside the test. A step's body is usually one
  call, at most a short route and an action.
- A step's title is plain prose that says exactly what its body does:
  - an account by its fixture name: `member uploads …`;
  - quotation marks only around a file name or a label as Fred shows it:
    `member sees "e2e-sample.txt" with the status "Pending"`;
  - a created object by its kind: "a folder", "the team".
- Use fixture roles, object kinds and fixed interface labels in titles. Keep
  passwords, resource identifiers and addresses out of titles and annotations.
  Synthetic usernames may appear in the report and run log.
- Test titles keep Fred's wording, such as "platform admin"; documents say
  "platform administrator".
- A run from Fred selects tests by their title path, which sets what a
  title may hold ([titles of tests](ARCHITECTURE.md#titles-of-tests)).

## Setup and created objects

- Setup every test of a group needs is `test.beforeEach`, its body a titled
  step; what it creates is kept in a `let` of the group.
- A step that creates something returns it, and later steps take it as an
  argument: a team, a folder, an agent, a prompt, a download.
- A test passes a factory fixture the word for the object's name in Fred,
  such as `"upload"` ([names](ARCHITECTURE.md#names)); the factory removes
  the object after the test.
- Every test is independent: it creates what it needs and relies on no
  other test and no run order. A test changes an account's setting through
  `preferences`, or the order of a space's agents through `agents.sort`,
  whose teardown restores the value read before the change.

## Parameterized tests

A case that runs once per label is a `for … of` loop over a literal array
`as const`, each value in the title, such as
`` `A team admin sees the settings section "${section}"` ``
([parameterize tests](https://playwright.dev/docs/test-parameterize)). The
parameter type of the page-object method rejects a wrong label when the
file is type-checked.

## Tags

Give each file's top-level group the tag for its section. The section tags
are `@account`, `@admin`, `@agent`, `@capability`, `@document`, `@home`,
`@marketplace`, `@prompt`, `@resource`, `@space`, `@team` and `@wiki`. Every
case that creates a temporary team also carries `@team`, including cases in
other sections.

Add feature tags at the narrowest applicable group, case or parameter row.
A section may contain tests that use several accounts.
[Playwright test tags](https://playwright.dev/docs/test-annotations#tag-tests)

| Tag                | Coverage                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `@chat`            | Conversations                                                                                                               |
| `@model`           | Team model settings, model choices and model-backed processing                                                              |
| `@model-discovery` | Cases that open Models in Admin › Features, including its model defaults. These cases stay outside `@model` and `@preprod`. |
| `@ppt`, `@docx`    | Configuration of the presentation and Word document capabilities. The Word document cases check the agent's saved options.  |
| `@csv`             | CSV processing and preview                                                                                                  |
| `@smoke`           | The quick sign-in check                                                                                                     |

### Reviewing a case for `@preprod`

Trace the test, shared setup, fixtures, page visits and teardown. A case
qualifies when it changes only the dedicated accounts' profiles or personal
spaces, or resources it creates. Membership changes must use dedicated
accounts in a team the test creates. Check what loading a view does. For
example, opening Models in Admin › Features can save the platform model
list. Granting a feature to a temporary team can initialize a shared
permission. Both actions disqualify a case, even if teardown succeeds.
Marketplace publishing, liking and importing also stay outside this selection.

Add `@preprod` to each reviewed automated test's details. For parameterized
tests, put the tags beside each row and pass them into the test. Reserve
`@preprod` for individual cases so new tests, new rows and planned cases
enter the selection only after review and automation. Preview the resulting
inventory with the [shared-canary command](README.md#shared-canary).

## Timeouts and budgets

- A test runs with the default timeout, `testTimeout` of `env-config.json`.
- A test that waits on a budget, such as `PROCESSING_TIMEOUT`, sets the
  budget and a margin with `test.setTimeout`, such as
  `test.setTimeout(PROCESSING_TIMEOUT + 120_000)`; the other tests of the
  file keep the default
  ([timeouts and budgets](ARCHITECTURE.md#timeouts-and-budgets)).
- A test holds no wait: page objects wait for the page.

## Planned tests

Every rule of the product has a test, automated or planned. A rule without
an automated test holds a planned test, `test.fixme(title, body)`, or
`test.fixme(title, details, body)` with a `tag` in `details`, whose body is
its steps as comments
([test.fixme](https://playwright.dev/docs/api/class-test#test-fixme)), as in
the upload test file above.

- A test planned by decision gives its reason in its first comment line.
- A rule whose check compares the page with what Fred stores is planned by
  decision; its first comment line reads "Planned: the check compares the
  page with what Fred stores, which the tests do not read."
- ESLint allows `test.fixme` in these two forms only, with a body of
  comments, so every `fixme` is a planned test
  ([lint boundaries](ARCHITECTURE.md#lint-boundaries-and-checks-before-a-commit)).
- A planned test's comment steps are checked when the test is automated.

## What a test leaves alone

- A test may open a conversation of Fred; it never types into it or sends
  anything.
- A test deletes, overwrites or removes no user, team or data it did not
  create itself: no text or file someone else wrote, such as a platform
  prompt, an access rule, a model's display name or a template, no
  announcement, and no agent another team published.
- A test may change a choice for every team or every user, such as a switch,
  an option, a number or a selection, when it reads the choice first and a
  fixture's teardown puts it back. It publishes to the marketplace only an
  agent of a team it created.
- A test does nothing that cannot be put back: it resets, imports or repairs
  no platform data, dismisses no task or model, announces or withdraws no
  update, and imports no users into the whitelist.
- A rule that only a test these rules forbid could check is planned by
  decision, with its reason.
- A test that fails because of Fred is kept as written and fails.

## A page object

A page of Fred is one class in `e2e-framework/pages/` and one entry in the
registry object of `pages/pages.ts`; every user has it as a typed
property of `pages` ([page object models](https://playwright.dev/docs/pom)).

- It declares `static displayName`, such as `Resources page`, which the
  report and the run log show with the account: `Resources page · member`.
- Its locators are `private readonly` fields, built once per page object;
  others, such as one that depends on a name or a row, are built in the
  method that uses them or in a private one. They are user-facing: role,
  label or text, mostly with `exact: true`, scoped to `main`, a dialog or a
  panel. Tests are type-checked, so a test cannot reach them. A locator that
  depends on structure or position says so in a comment where it lives.
- Each public async method carries `@step`
  ([page objects and components](ARCHITECTURE.md#page-objects-and-components));
  ESLint rejects one without it. A method that only its own class calls is
  private and carries no `@step`.
- A label the method takes, as Fred shows it, is a union type beside the
  page object, with a `const` list only where code iterates over it, so a
  wrong label fails the type check. A name of the test data, such as the
  agent template, and a text of `sign-in.json` are text. Where the label
  alone does not name the locator, a record keyed by it, or an exhaustive
  `switch`, maps it to a locator, a text or a page object.
- A button a test checks by name, such as "New folder" or "Refresh this
  view", is an entry of a private record from the page's button union, such
  as `ResourcesButton`, to its locator fields. `expectButtonVisible(name)`
  and `reloadAndExpectButtonAbsent(name)` check it through
  `pages/buttons.ts`, such as `reloadAndExpectButtonAbsent("New folder")`;
  `reloadAndExpectButtonAbsent` first calls the page's
  `reloadAndWaitForButtons()`.
- A method is named for what it does, in plain words, such as
  `expectButtonVisible`, `reloadAndWaitForButtons` or
  `expectCapabilityListed`.
- An action returns what a later check needs, such as a download. A method
  that reloads the page says so in its name.
- A check is an `expect…` method that compares the page with what the test
  knows: the files it uploaded, the team, folder and agent it created, the
  labels Fred shows. Before it checks that something is absent, it waits
  until the part of the page it reads has loaded, as
  [waiting on the page](ARCHITECTURE.md#waiting-on-the-page) lists.
- It drives the page through Playwright's APIs only: ESLint rejects a script
  run in a page and a fixed wait. Its checks read the page alone.

A component is the same shape in `e2e-framework/components/`: a part of
Fred's pages, such as a dialog, a menu or a table, or the actions of the
sign-in pages, which one or several classes hold in a private field. One that
a test or a flow calls directly, such as `accountMenu`, has an entry in the
registry object. Fred's data tables use the `DataTable` component, which
gives its `rows` and `row(text)` locators to the class that holds it.

A file a test uploads lives in `test-data/uploads/` and is named in the
union type of `e2e-framework/config/uploads.ts`.

## The sign-in pages

`sign-in.json` holds the steps of the environment's sign-in pages, as README's
[sign-in.json](README.md#sign-injson) describes: when the pages change, only
this file changes. `SignInPage` carries the steps out with the component
`SignInActions`, which holds their locators.

## A flow

A route through several pages that tests or factory fixtures share is a
flow in `e2e-framework/flows/`: one route per destination, run as a named
step; a route into a space takes the `Space` or the `Folder`. A flow calls
only page objects and `test.step`, and adds no wait or check of its own. A
single page's action is a call to its page object.

## A factory fixture

Each kind of object the tests create has a test-scoped factory fixture in
`e2e-framework/fixtures/`, built as `teams`, `folders`, `agents` and `prompts`
are, and `preferences` restores what a test changes in the same way:

- its class, such as `Folders` in `fixtures/folders.ts`, names the object
  with `uniqueName(word)`, creates it through flows and page objects, and
  returns it;
- the class lists its removals, newest first, each with its title, the
  account that created the object and the removal itself, recorded before
  Fred is touched;
- its fixture in `fixtures/test.ts` hands an object of the class to the test
  with `use` and then calls `removeEach` with the function that lists the
  removals;
- its fixture depends on the factory fixtures whose objects it uses.

[Factory fixtures and removal](ARCHITECTURE.md#factory-fixtures-and-removal)
gives what a factory records and when, how its removals run and end, its
`timeout` option and the order in which factory fixtures tear down.
