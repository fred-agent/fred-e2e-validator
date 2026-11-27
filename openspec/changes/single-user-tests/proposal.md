## Why

An environment may have one account for the tests. Many rules of Fred concern
one user only: their profile, their personal space, a team of their own and
the capabilities of their agents. Their tests need no second account, and an
environment with one account can run them. The other rules of a team, the
console's views and the marketplace have tests too, where a test deletes,
overwrites and leaves behind nothing it did not create.

## What Changes

- The planned tests of a user's profile, home page, prompts and documents are
  automated, and those of a team that one user administers.
- A test file covers the capabilities of an agent of the personal space: each
  capability turned on and off, and the options saved with it.
- The factory fixture `prompts` creates prompts, `preferences` changes a
  user's profile settings and restores them, and `agents` works in any space.
- The planned tests of a second account in a team, of a team's settings and
  invitation links in the console, of the console's views, of a team's agents
  in the marketplace and of a space's statistics are automated.
- A test deletes, overwrites or removes no user, team or data it did not
  create, and does nothing that cannot be put back; the rules only such a
  test could check stay planned, each with its reason.
- `@team` marks every test that creates a team.
- A folder is opened with a double-click.

## Capabilities

### Modified Capabilities

- `test-files`: temporary-team and personal-space tests and their cleanup.
- `test-fixtures`: `prompts`, `preferences`, the agents of any space, a
  team's other admins and its rename.

## Non-Goals

- A test that changes a choice for every team or every user, which a teardown
  would put back: a banner, a theme, a home page, a model setting, a
  platform role, the marketplace's settings and the creation assistant's
  reasoning keep their planned tests.
- A conversation: no test types into or sends anything in one, so what an
  agent does with a capability is not tested.
- Publishing to the marketplace an agent of a team the test did not create.

## Impact

- New: `e2e-framework/fixtures/prompts.ts` and `preferences.ts`,
  `tests/capabilities/personal-agent.spec.ts`, the files
  `test-data/uploads/e2e-picture.png` and `test-data/uploads/changed/`.
- New: `e2e-framework/pages/console-views-pages.ts`, `user-interface-page.ts`
  and `join-page.ts`.
- Changed: the page objects and components of the profile, prompts, resources,
  agents, wiki, team members and team sections, the console's teams,
  announcements, analytics, features and marketplaces, the marketplace,
  `fixtures/agents.ts`, `teams.ts` and `test.ts`, `config/uploads.ts`, the
  tags of the test files, and
  `WRITING-TESTS.md`, `ARCHITECTURE.md` and `README.md`.
- The service, the image and the chart are unchanged.
