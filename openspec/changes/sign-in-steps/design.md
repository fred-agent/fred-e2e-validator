## Context

A user signs in through the environment's pages once per account and worker.
Three page objects depend on those pages: the sign-in page enters the
account, the home page recognises the first sign-in page on a first load, and
the terms page recognises that the sign-in pages refused the account.

`pw:` below is `https://playwright.dev/docs/` for Playwright 1.65.

## Goals / Non-Goals

**Goals:** another environment's sign-in pages, one or several, need no code
and no image; a malformed list stops a run before a browser starts and the run
log names the step; a failed sign-in names the step or the file to check; no
password in a report.

**Non-Goals:** those of `proposal.md`.

## Decisions

### D1. The steps are a file of their own, `sign-in.json`

```json
[
  { "fill": "Username or email", "with": "username" },
  { "fill": "Password", "with": "password" },
  { "click": "Sign In" }
]
```

The committed list is the one of Keycloak's own form. A working copy whose
Fred signs in through other pages sets its own list and does not commit it.

A list describes one page or several, as it names no page: the steps of every
page stand one after the other, and an action waits for its element, on the
page that is open or on the next one
([pw:actionability](https://playwright.dev/docs/actionability)). An
environment with several pages:

```json
[
  { "click": "Company SSO" },
  { "fill": "someone@example.com", "with": "username" },
  { "click": "Next" },
  { "fill": "Password", "with": "password" },
  { "click": "Sign in" }
]
```

| Step                              | Does                                                 | Locator                                         |
| --------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `{ "click": text }`               | Clicks the button or the link with this name         | `getByRole` of the button, `or()` of the link   |
| `{ "fill": text, "with": value }` | Fills the field with this label or this placeholder  | `getByLabel`, `or()` `getByPlaceholder`         |

A name is the element's accessible name, which is the visible text unless the
page gives it another one. `value` is `username` or `password`, so an accepted
list holds no credential. Each text is matched whole, with `exact: true`, and
a step takes the one visible element that matches
([pw:locator.or](https://playwright.dev/docs/api/class-locator#locator-or)):
two visible matches, such as a button and a link of one name, fail the step
([pw:locators](https://playwright.dev/docs/locators#strictness)). The last
step is a click, which submits the last page. A list of one click is valid.

Alternatives:

- A key of `env-config.json`: every release would have to give the steps, and
  the file says how an environment runs the tests, not what its sign-in pages
  show.
- An action per kind of element: a page does not show whether a text is a
  button or a link, or whether a text in a field is its label or its
  placeholder.
- A TypeScript file of steps mounted over the image's: code that neither the
  image's build nor the type check covers.
- An image per environment: a build for each button that changes.

### D2. The reader

`config/sign-in-steps.ts` reads the file as `config/settings.ts` reads
`env-config.json`: `parseSignInSteps(content)` checks a parsed file and
freezes the list and its steps; `readSignInSteps()` reads the project's file
once per process. It exports `SignInStep`, `SignInSteps`, `AccountValue` and
`lastStep(steps)`.

A list of at least one step is piped into a tuple of one step and any further
steps, so its type is `readonly [SignInStep, ...SignInStep[]]`
([zod: tuples](https://zod.dev/api#tuples),
[zod: pipes](https://zod.dev/api#pipes)). A step is a union of two strict
objects ([zod: unions](https://zod.dev/api#unions)). A text is trimmed and
not empty. A refinement requires a click as the last step
([zod: refinements](https://zod.dev/api#refinements)).

The error names each wrong step or, when no step is wrong, the problem of the
list, one line each, with the file and a step's number from 1. Its texts are
fixed, so it holds no value of the file and
nothing of the JSON parser's message:

| Problem                            | Message                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The file is missing or is not JSON | `sign-in.json: the file is missing or holds no valid JSON.`                                                      |
| It is not a list, or an empty one  | `sign-in.json: the file must hold a list of at least one step.`                                                  |
| A step is wrong                    | `sign-in.json: step 2: a step is a click with a text, or a fill with a text and a with of username or password.` |
| The last step fills a field        | `sign-in.json: the last step must be a click.`                                                                   |

### D3. Global setup checks the file

Global setup calls `readSignInSteps()` after it has checked the accounts, so a
wrong file stops the run before a browser starts
([pw:test-global-setup-teardown](https://playwright.dev/docs/test-global-setup-teardown)).
`failureCause` of `reporting/failure-summary.ts` shows the first line of D2's
error as it is. The line varies, so a pattern of the file's name and a colon finds it,
after the fixed messages. The HTML report and the run log of a run from Fred
show that line, and a terminal shows the whole error.

`playwright.config.ts` and the service do not read the file: `--list` loads
the tests without it, and a service whose release gives a wrong list starts,
offers its run page and reports the problem in the run log, where whoever
starts a run reads it.

### D4. One component holds the locators

`components/sign-in-actions.ts` holds the component `SignInActions`
(`displayName` "Sign-in actions") with the actions `click(text)` and
`fill(text, value, account)`, each with `@step`. The step's title shows the
text, the value's name and the account's name and user name, and
`step-title.ts` leaves out the password
([pw:api/class-test#test-step](https://playwright.dev/docs/api/class-test#test-step)).
The texts are values of `sign-in.json`, so their type is text.

The module also exports `firstElement(page, steps)` and
`lastElement(page, steps)`, the locators of the first and the last step. One
function builds every locator, the actions' included, with
`filter({ visible: true })`, as a field can be in a page and hidden
([pw:locators](https://playwright.dev/docs/locators#matching-only-visible-elements)).
The first is visible once the first sign-in page has loaded. The last is
visible while the last sign-in page is open, as when it refuses the account.

`SignInPage`, `HomePage` and `TermsPage` take the steps from
`readSignInSteps()`. `SignInPage.expectShown` waits for the first element,
with the message `SIGN_IN_NOT_SHOWN`; `signIn` carries out each step in order,
then expects the last element to be hidden, with `SIGN_IN_FAILED`. `HomePage`
uses `firstElement` and `TermsPage` `lastElement`; the flow `signIn`,
`createPages` and `SignOutMenu` are unchanged.

### D5. What a failed sign-in reports

The messages of `reporting/run-log.ts`:

| Message             | Says                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SIGN_IN_NOT_SHOWN` | The first sign-in page did not show: check the first step of sign-in.json.                                                               |
| `SIGN_IN_FAILED`    | The sign-in did not finish: check the user name and the password of the account, and the steps of sign-in.json.                          |
| `FRED_NOT_SHOWN`    | The steps of sign-in.json ended, but Fred showed neither its terms nor its signed-in page: check that they reach the end of the sign-in pages. |

| What happens                                                                               | Failed step                             | Cause                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------ |
| The first element is missing, or matches twice, or the first page is not in the list       | `expectShown()`                         | `SIGN_IN_NOT_SHOWN`                                          |
| A later button or link is missing                                                          | `click("Log in")`                       | "Could not click button: it was not found"                   |
| A later field is missing                                                                   | `fill("Passcode", "password", member (…))` | "Could not fill in field: it was not found"               |
| A later text matches two elements                                                          | That step                               | `SEVERAL_ELEMENTS`                                           |
| The account is refused on a page before the last, or a page between two steps is not in the list | The next page's step              | As for a missing element                                     |
| The last element stays beyond `expectTimeout`, or comes back before Fred shows             | `signIn(member (…))`, `acceptIfShown()` | `SIGN_IN_FAILED`                                             |
| The last page sends the account back to another sign-in page, or a page after the last step is not in the list | `acceptIfShown()` | `FRED_NOT_SHOWN` |
| The first text matches two elements on a user's first load                                 | `openAndReadSignInState(…)`             | `SEVERAL_ELEMENTS`                                           |

`failureCause` gives `SEVERAL_ELEMENTS`, "Several elements match where one was
expected.", for Playwright's strict mode violation
([pw:locators](https://playwright.dev/docs/locators#strictness)), after the
messages above and before it describes an action or an assertion. It holds for
every locator of the project, not only for those of the sign-in pages.

### D6. The image and the chart

The image holds the `sign-in.json` of the checkout it is built from, beside
`env-config.json`; an image for several environments is built from the
committed file. The chart's value `signIn` is null by default, and the image's
file is used. A release that sets it gets a ConfigMap of its own,
`<release>-sign-in`, with the list rendered by `toPrettyJson` and mounted over
`/app/sign-in.json`, as the release's `env-config.json` is
([Kubernetes: subPath](https://kubernetes.io/docs/concepts/storage/volumes/#using-subpath)).
An empty list is rendered too, and global setup rejects it.

A release's values hold the list with each text in quotes, as YAML reads `No`
without them as a boolean. Helm replaces a list as a whole, so a
release gives all its steps
([Helm: values files](https://helm.sh/docs/chart_template_guide/values_files/)).

Setting `signIn` for the first time, or removing it, changes the pod template,
and the pod rolls out. A change of the list alone reaches the pod with
`kubectl rollout restart`, as any change of a ConfigMap does. A release
without `signIn` in its values files, or with `signIn` null, uses the image's
file; with Helm's `--reuse-values`, a null does not remove a list that the
release already has, and `--reset-then-reuse-values` does
([Helm: upgrade](https://helm.sh/docs/helm/helm_upgrade/)). `Chart.yaml` and
the image tag of `values.yaml` are 0.3.0. `--reuse-values` also keeps the
image tag of the earlier chart, and the image of 0.2.0 does not read a list,
so the upgrade to 0.3.0 does not use it.

## Risks / Trade-offs

- A first or last text that Fred's own pages also show is taken for a sign-in
  page. → The list names a text that only the sign-in pages show.
- Two visible elements of one text, such as a button and a link, or a label
  and another field's placeholder: a step with that text fails. → A fill can
  name the field's other text; a click of such a text is not supported.
- Two sign-in pages in a row with one text, where the page changes after the
  click and not by the click itself: the second step can act before the page
  has changed. → A step of the second page between them, such as its field;
  two such pages with one button each are not supported.
- A field that is hidden by its opacity or its position counts as visible, so
  a step can fill it on an earlier page
  ([pw:actionability](https://playwright.dev/docs/actionability#visible)). →
  The sign-in ends in `SIGN_IN_FAILED`, and the list names the other text of
  the field, its label or its placeholder, where the hidden field does not
  carry it.
- A list without a fill enters no account, so only the account the environment
  chooses can pass a test's check of its email. → Such a list suits an
  environment that tests one account.
- A first sign-in page that shows on every load, even for a signed-in user, is
  taken for a refused session, and a refused session that opens on a later
  sign-in page is reported as a page of Fred that did not show. → Such
  an environment is not supported.
- An environment that keeps its own session after "Disconnect" signs the next
  account in without its pages. → The switching-users test requires the first
  sign-in page after "Disconnect".
- A text in a release's values without quotes, such as `No`, is a boolean in
  YAML, and a `with` of any text reaches the ConfigMap before global setup
  rejects it. → Each text is in quotes, and the list holds no account.
- No check before a commit covers the list of the staged `sign-in.json`. → The
  tests against the local Fred fail with another environment's list.
- A pod needs network access to the environment's sign-in pages. → The
  failed requests a test's report lists show it.
