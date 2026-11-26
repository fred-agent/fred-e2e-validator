## Context

Many rules of Fred concern one user's own things: their profile, their
personal space, a team they administer and their agents. An environment may
have one account for the tests, and `excludeTags` of `env-config.json` is
where it says which tests it runs.

`pw:` below is `https://playwright.dev/docs/` for Playwright 1.65.

## Goals / Non-Goals

**Goals:** every rule that one user can check in their profile, their personal
space or a team of their own has a test; a test changes nothing of another
user, and removes or restores what it creates or changes; an environment
chooses with `excludeTags` whether the tests create teams.

**Non-Goals:** those of `proposal.md`.

## Decisions

### D1. Tags

A test that creates a temporary team carries `@team`. A file whose tests all
create teams can carry the tag on its top-level group. Setting `excludeTags`
to `["@team"]` leaves these cases out. A section can include cases run by one
user and cases that compare distinct users. [Playwright test tags](https://playwright.dev/docs/test-annotations#tag-tests)

### D2. The tests

| Area           | Cases                                                                                                                                                        | User     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Profile        | Language, theme and mode, picture imported, picture deleted                                                                                                   | `member` |
| Home page      | "Trending" for the period "30d" after another                                                                                                                 | `member` |
| Prompts        | Created, edited, deleted, searched, favorites, a command in use refused                                                                                       | `member` |
| Documents      | An existing name replaced or skipped, for one file and for all; a file dropped outside a folder; excluded from search and included again                       | `member` |
| Agent          | Each capability on and off, several at once, an unsaved change, the wiki's and the presentation's option                                                      | `member` |
| Own team       | The only admin keeps the role, stays a member and stays in the team; an admin without the Editor role; the description, the retention cap, the default model  | `admin`  |
| Team's agents  | Order, duplicate, copy to another team (destinations, "(copy 1)", folders reset), the recommended models, the "Advanced" view                                | `admin`  |
| Team's wiki    | An edit of the agent rules listed as an earlier version                                                                                                       | `admin`  |

"The only admin cannot leave the team" reads "Leave team" on the members page,
which holds it.

### D3. Factory fixtures

- `prompts.create(user, space, word, options)` creates a prompt through the
  prompts page, and its teardown deletes it. It returns the prompt's space,
  name, text and, with the option `command`, a command that only this prompt
  carries, the prompt's name as Fred's rule for a command allows it. It
  depends on `teams`, so a prompt goes before its team.
- `agents.create(user, space, word)` takes any space. `agents.duplicate` and
  `agents.copy` record what they create, and `agents.sort` chooses an order,
  a preference of the account, and restores the one before, ahead of the
  agents' removal, as "Sort" shows only beside an agent.
- `preferences` changes a profile setting of a user and restores the value
  read before the change: `chooseAnotherTheme`, `chooseAnotherMode`,
  `chooseLanguage` and `importPicture`. Each records the restoration first.

Restorations and removals run in `removeEach`, each in a browser context of
its own ([pw:test-fixtures](https://playwright.dev/docs/test-fixtures)). A
test uses at most three factory fixtures, as `agents` with the `folders` and
`teams` it depends on, so the worst case of a teardown is unchanged.

An account whose language is French shows Fred in French on the first load of
a restoration. The account menu's button, the profile's "Back", title and
language choices are found by their English or their French name; every other
locator is English.

A profile picture cannot be read and put back, so `importPicture` fails for an
account that has one.

### D4. Saving a preference

Fred saves a profile setting without a sign of its own. A test leaves the
profile with "Back", which keeps the page, then loads Fred again and reads the
setting, so a save that did not reach Fred fails the check
([pw:test-assertions](https://playwright.dev/docs/test-assertions)). The
picture comes with Fred's bootstrap, so the profile and the account menu are
read once the "Personal space" link points to the user's own space.

### D5. Files with one name and another content

`test-data/uploads/changed/` holds a file of the same name and another size
for each file a test replaces. `uploadPath(file, version)` takes `"original"`
or `"changed"`, and a document's row shows the size of the version it holds:
Fred shows a size under 1000 bytes as "57 byte".

A file is dropped with `locator.drop`
([pw:api/class-locator#locator-drop](https://playwright.dev/docs/api/class-locator#locator-drop)).

### D6. The personal space's agents

"Your personal agents" heads the personal space's agents, and the personal
space has no "Settings". The page waits for "Settings", "Create Agent" or
"Create", each shown once the space's record has loaded, and then for the
list.

### D7. The tests of a second account, the console and the marketplace

| Area          | Cases                                                                                                                                    | Section tags            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Membership    | A removed member and a member who leaves no longer see the team; an editor without the Admin role cannot manage members                  | `@team`                 |
| Team admin    | A team admin does not see the console; a team created with another admin                                                                 | `@admin`, `@team`       |
| Prompts       | Favorites belong to each user                                                                                                            | `@prompt`, `@team`      |
| Console       | A team renamed in its edit form; a name in use refused                                                                                   | `@team`                 |
| Invitations   | The console's invitation links: joined, revoked, link access off                                                                         | `@team`                 |
| Console views | Activity, corpus audit, announcements by view, features by kind, marketplaces, platform prompts, teams, user interface, analytics export | `@admin`                |
| Marketplace   | An agent of the test's public team, with its publishing "On", published, listed, liked and imported into another team of the test        | `@marketplace`, `@team` |
| Resources     | The statistics of the personal space by type                                                                                             | `@resource`             |

`teams.create` accepts additional team administrators in `admins`. The
fixture records the team ID from the successful creation response.
`teams.rename(team, word)` uses the team's edit form. Teardown uses the
recorded ID even after a rename.
`agents.importFromMarketplace` records the copy it imports. A team's
publishing "On" and its visibility "Public" are the team's own settings.

A test deletes, overwrites or removes no user, team or data it did not
create, and does nothing that cannot be put back. These stay planned, each
with its reason: a dismissed task or model, a corpus repair, an import or a
reset of platform data, an access rule or an import into the whitelist, a
platform prompt's text or its default restored, a model's display name, the
platform's presentation template, publishing turned off for every team, an
announced or withdrawn update, the self-test, which talks to agents, and the
cases that need an account that never signed in, never chose a theme or never
accepted the team administrator charter. The cases that change a choice for
every team or every user keep their planned tests, as no fixture puts the
choice back. A new team's empty wiki and a team's wiki hidden from its
members stay planned: the wiki shows the same empty state when its list
fails, and the team's space gives no sign that Fred has answered whether the
team has a wiki.

A favorite, a leave and an import end on Fred's confirmation: the prompts
loaded again, the personal space Fred opens, and the result "Imported into"
the team. The statistics show a type in the legend of the sizes by type only
once their query has counted a file of it.

A menu button without a name, on a prompt's card and a member's row, is the
button that opens a list (`aria-haspopup="listbox"`). A styled switch is
turned through its label.

## Risks / Trade-offs

- A run that is killed during a preference test leaves the account's setting
  changed. → The next test that needs English fails at its first load of
  Fred's pages; the setting is put back by hand.
- An account that never chose a theme, a mode, a language or an order follows
  the platform's default; a restoration chooses the value it read, which the
  account keeps after a change of the default. → The pages offer no way back
  to "not chosen".
- Two workers with one account would see each other's preferences. → Account
  sets of different workers are different accounts, as README says.
- The capabilities an environment offers to personal spaces, and the template
  of the test data, are the platform's. → A test of a capability that is not
  offered fails and names its switch.
- A browser that cannot reach the address Fred gives for a picture shows the
  initials. → The test of an imported picture fails there.
- A rule Fred breaks fails its test. → The test is kept as written.
