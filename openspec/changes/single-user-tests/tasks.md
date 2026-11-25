Documentation pages are named per task; `pw:` is
`https://playwright.dev/docs/` for Playwright 1.65. A check of a task is made
by running the tests against the local Fred or with a throwaway script
outside the repository; no task adds a unit test.

## 1. Tags and folders

- [x] 1.1 The tags of design D1 in every test file: `@team` on the files whose tests create a team, `@extended` on the groups and tests that need a second account or sign in through the form, none on the files of the personal space. Docs: [pw:test-annotations](https://playwright.dev/docs/test-annotations#tag-tests).
- [x] 1.2 `components/resource-table.ts`: a folder opens with a double-click. Docs: [pw:api/class-locator#locator-dblclick](https://playwright.dev/docs/api/class-locator#locator-dblclick).

## 2. The user's own profile, home page, prompts and documents

- [x] 2.1 `fixtures/preferences.ts` and the methods of `pages/profile-page.ts` and `components/account-menu.ts` of designs D3 and D4; `tests/accounts/profile.spec.ts`. Docs: [pw:test-fixtures](https://playwright.dev/docs/test-fixtures), [pw:input#upload-files](https://playwright.dev/docs/input#upload-files).
- [x] 2.2 `tests/home/sections.spec.ts`: "Trending" for "30d" after another period.
- [x] 2.3 `fixtures/prompts.ts`, `pages/prompts-page.ts`, `components/prompt-dialogs.ts`; `tests/prompts/personal.spec.ts`. Docs: [pw:locators](https://playwright.dev/docs/locators).
- [x] 2.4 `config/uploads.ts`, `components/dialogs.ts`, `components/resource-table.ts`, `pages/resources-page.ts` and the files of design D5; `tests/documents/upload.spec.ts` and `manage.spec.ts`. Docs: [pw:api/class-locator#locator-drop](https://playwright.dev/docs/api/class-locator#locator-drop), [pw:input#upload-files](https://playwright.dev/docs/input#upload-files).

## 3. The capabilities of a user's own agent

- [x] 3.1 `fixtures/agents.ts` and `pages/agents-page.ts` work in any space (designs D3 and D6); `components/agent-form.ts` has the capabilities, their options and the "Advanced" view. Docs: [pw:locators](https://playwright.dev/docs/locators).
- [x] 3.2 `tests/capabilities/personal-agent.spec.ts`: the cases of design D2. Docs: [pw:test-parameterize](https://playwright.dev/docs/test-parameterize).

## 4. A team one user administers

- [x] 4.1 `pages/team-members-page.ts`, `components/member-table.ts` and `pages/team-sections-pages.ts`; `tests/teams/membership.spec.ts` and `settings.spec.ts`.
- [x] 4.2 `components/agent-dialogs.ts`, `pages/agents-page.ts` and `fixtures/agents.ts` with `duplicate`, `copy` and `sort`; `tests/agents/card-and-chat.spec.ts`, `tests/agents/lifecycle.spec.ts` and the "Advanced" view in `tests/capabilities/team-access.spec.ts`.
- [x] 4.3 `pages/wiki-page.ts`; `tests/wiki/agent-rules.spec.ts`.
- [x] 4.4 `tests/admin/teams.spec.ts`: a second team with an existing name is refused, and its form cancelled.

## 5. A second account, the console and the marketplace

- [x] 5.1 `fixtures/teams.ts` with `admins` and `rename`; `fixtures/agents.ts` with `importFromMarketplace`; the page objects of the members, the console's teams, invitation links and views, the join page, the marketplace and the statistics (design D7). Docs: [pw:locators](https://playwright.dev/docs/locators), [pw:api/class-locator#locator-and](https://playwright.dev/docs/api/class-locator#locator-and).
- [x] 5.2 The tests of design D7, and the planned tests that stay planned with their reasons and their tags. Docs: [pw:test-annotations](https://playwright.dev/docs/test-annotations#tag-tests).
- [x] 5.3 Capture each temporary team's id from its successful creation response and use it for every removal. Require the report filter during test execution. Docs: [Network events](https://playwright.dev/docs/network#network-events), [Reporters](https://playwright.dev/docs/test-reporters).

## 6. Documents and verification

- [x] 6.1 `WRITING-TESTS.md`: the tags, the fixtures, restored preferences. `ARCHITECTURE.md`: the fixtures, their removals and order, the signs a page waits for, the tags and what a test leaves alone. `README.md`: what the accounts need.
- [x] 6.2 `make code-quality`, `make test-unit`, `make spec-check`.
- [x] 6.3 Against the local Fred with `excludeTags` of `["@extended"]` and one account for `admin` and `member`, and with `excludeTags` empty: every test passes or fails for a cause of Fred or of the local setup that is named, and the personal space, the profile, the marketplace and the list of teams are as before the run. `npx playwright test --list` shows the tests of each tag. Docs: [pw:test-cli](https://playwright.dev/docs/test-cli).
