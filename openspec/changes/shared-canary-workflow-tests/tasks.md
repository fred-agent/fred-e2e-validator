## 0. Before implementation

- [x] 0.1 Record the identities selected by the README's whole-tag `@preprod` discovery command on the base revision. [Test CLI](https://playwright.dev/docs/test-cli)

## 1. Personal accounts and agents

- [x] 1.1 Add the personal agent duplication case using the existing description and duplicate helpers. [Fixtures](https://playwright.dev/docs/test-fixtures)
- [x] 1.2 Add the Back case starting at personal Prompts. Check the destination in the original browser context. [Assertions](https://playwright.dev/docs/test-assertions)
- [x] 1.3 Add the personal-agent factory, reuse its existing removal logic and document its dependencies. Add the chat case and its panel-scoped assertion. [Fixtures](https://playwright.dev/docs/test-fixtures)
- [ ] 1.4 Run the three cases individually against an isolated test environment. Check that chat activates at most three timed factories. In a throwaway check, fail the chat assertion after both objects exist and verify teardown removes both. Run code quality, service unit checks and strict OpenSpec validation. [Test CLI](https://playwright.dev/docs/test-cli)

## 2. Documents and team settings

- [x] 2.1 Add the CSV row action with the fresh file's stored profile and the existing processing wait. Verify Pending, then Done, then the known cell in the preview. [Assertions](https://playwright.dev/docs/test-assertions)
- [x] 2.2 Extend the team settings page object and add the independent description and name assertions for the draft and reopened form. [Locators](https://playwright.dev/docs/locators)
- [ ] 2.3 Run both cases individually against an isolated test environment and check folder, document and team cleanup. In a throwaway run, interrupt the CSV assertion after the row starts processing and verify its folder and document disappear. Check the specific upload using its recorded identity, including once processing has settled. Run code quality, service unit checks and strict OpenSpec validation. [Test CLI](https://playwright.dev/docs/test-cli)

## 3. Personal prompts and selection

- [x] 3.1 Add prompt duplication to the fixture and page objects, including registration before confirmation and waiting for the enabled dialog button. Check the full body and both commands in the read-only views. [Fixtures](https://playwright.dev/docs/test-fixtures)
- [ ] 3.2 Run the prompt case alone against an isolated test environment. In a throwaway check, throw after the saved copy appears but before the fixture marks it confirmed. Verify teardown finds and removes the recorded copy and source. [Fixtures](https://playwright.dev/docs/test-fixtures)
- [x] 3.3 Trace the six cases' effective fixtures, actions and teardowns. Add `@preprod` to each reviewed declaration. Compare whole-tag browser-free discovery with the saved baseline. Require exactly these six additions from this change and no removals. Run code quality, service unit checks and strict OpenSpec validation. [Tags](https://playwright.dev/docs/test-annotations#tag-tests)

## Verification

Browser-free discovery selects all six new cases and retains the 133
previously selected cases, for a total of 139. All six cases pass on an
isolated environment, including fixture teardown. Code quality, service
unit checks and strict OpenSpec validation pass. The interrupted-run
cleanup exercises remain pending.
