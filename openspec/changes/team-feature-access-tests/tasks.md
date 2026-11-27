Documentation pages are named per task; `pw:` is
`https://playwright.dev/docs/` for Playwright 1.65. A check of a task is made
by running the tests against the local Fred or with a throwaway script
outside the repository; no task adds a unit test.

## 1. Test data and page objects

- [ ] 1.1 `config/test-data.ts` and `test-data/test-data.json`: `teamAccess` of design D3, with names read from the local Fred's Admin › Features, on the local Fred, whose models catalog configures no discovery source (design D7). A throwaway script outside the repository proves each name on a team it creates and removes: the template off for all teams is offered once enabled, without "Enable required features too?"; the template that requires a capability shows "Requires …" once "Documents" is disabled for the team; the model on for all teams is listed in the team's "Models" without "Default"; the model's tab, if the Models list has tabs. Verify: `make type-check`, and `npx playwright test --list` loads every test.
- [ ] 1.2 `pages/features-page.ts`, `components/team-access-panel.ts` and the capability labels of `components/agent-form.ts`: design D4, with the calls in `fixtures/teams.ts` and `tests/capabilities/team-access.spec.ts` moved to `setTeamAccess`. Docs: [pw:locators](https://playwright.dev/docs/locators), [pw:test-assertions](https://playwright.dev/docs/test-assertions). Verify: the existing capability tests pass against the local Fred.
- [ ] 1.3 The team's side of design D5: `pages/agents-page.ts` with its template step and "Recommended model", `components/agent-form.ts`, `pages/team-sections-pages.ts` "Models", `pages/apps-page.ts`. Docs: [pw:locators](https://playwright.dev/docs/locators), [pw:test-assertions](https://playwright.dev/docs/test-assertions). Verify: a throwaway script outside the repository calls each check on a team it creates and removes.
- [ ] 1.4 Verify the stage: `make code-quality`, `make test-unit`, `make spec-check`.

## 2. The tests

- [ ] 2.1 `tests/admin/feature-access.spec.ts`, tag `@team`, one rule per behaviour: agent templates ("Enable" and offered; "Disable" and not offered, with a second template enabled for the team and the team's agent suspended and listed among the suspended agents, design D6; "Default" after each; "Enable all" for a template whose required capability the team has disabled), models, also tagged `@model-discovery` ("Enable" and listed and recommended; "Disable" and neither; "Default" after each), apps ("Enable" one and "Disable" another for one team, read on its "Apps" page and on another team's; "Default" after each), and the planned knowledge base test of design D9. Docs: [pw:test-annotations](https://playwright.dev/docs/test-annotations#tag-tests), [pw:test-parameterize](https://playwright.dev/docs/test-parameterize).
- [ ] 2.2 Add `@model-discovery` to the committed `excludeTags` as described in D7.
- [x] 2.3 In `tests/capabilities/team-access.spec.ts`, read the enabled platform default for "Generate a web page (HTML/CSS)" before team setup. Disable it for the test team, check its absence beside an available capability, then choose "Default" and check that it is offered again. Reopen the agent form for each check. For cases 2.3 through 2.5, capture the "All personal spaces" choice before setup and compare both shared controls with their original values after each override or reset.
- [x] 2.4 Read the disabled platform default for "Fill a PowerPoint file" before team setup. Enable it for the test team and check that the reloaded agent form offers "Fill in a PowerPoint document". Choose "Default" and check that the reloaded form shows another available capability and omits the PowerPoint capability.
- [x] 2.5 Automate the existing planned inheritance case in the same file. Read the disabled PowerPoint default before creating two teams. Use the same template and editor role in both. Enable it on the first team only. While that override is active, reload both forms and check that the first offers the capability and the second shows another available capability and omits it.
- [ ] 2.6 Verify the stage: `make code-quality`, `make test-unit`, `make spec-check`; then the new and changed tests against the local Fred with `excludeTags` empty ([pw:test-cli](https://playwright.dev/docs/test-cli)): each passes or fails for a named cause of Fred. A temporary change of the test data, undone afterwards, shows the failures of design D3 and of a model the page does not list. The working copy's `excludeTags` is then restored to the committed value; with it, `npx playwright test --list` lists no model rule, and only tests tagged `@model-discovery` pass "Models" to `setTeamAccess` or `expectEnabledForAll`. Use browser-free discovery to verify that no case that writes feature access, including in setup, carries `@preprod`. After execution on the isolated environment, verify that the fixture removed every team the cases created and that the global defaults and "All personal spaces" settings are as before.

Browser-free discovery lists all three capability inheritance cases outside
`@preprod`. The two PowerPoint cases carry `@ppt`. The HTML case carries
the capability and team tags. All three cases pass on an isolated
environment. The shared controls retain their initial values, and each
temporary team's removal completes successfully.

## 3. Documents

- [ ] 3.1 `WRITING-TESTS.md`: the tag `@model-discovery`, how a test sets a team's access, checks the settings for all teams first and reads a list beside a feature it shows; `ARCHITECTURE.md`: the features page, the team access panel and `teamAccess` in the test data; `README.md`: the committed `excludeTags` holds `@model-discovery`; an environment without a model discovery source drops it to run the model tests, and a chart release with one adds it before it upgrades to an image with these tests. Verify: `make code-quality`, `make test-unit`, `make spec-check`.
