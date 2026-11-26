## Placement and ownership

| Case | Test file | Section and feature tags |
| --- | --- | --- |
| Independent agent duplicate | `tests/agents/personal.spec.ts` | `@agent` |
| Back to personal Prompts | `tests/accounts/profile.spec.ts` | `@account` |
| Personal prompt in chat | `tests/agents/personal.spec.ts` | `@agent`, `@chat`, `@prompt` |
| Process a stored CSV | `tests/documents/manage.spec.ts` | `@document`, `@csv` |
| Description autosave during a rename | `tests/teams/settings.spec.ts` | `@team` |
| Duplicate the full prompt | `tests/prompts/personal.spec.ts` | `@prompt` |

Before implementation, record the test identities selected by the whole
`@preprod` tag using the browser-free command in the README. After reviewing
each case's setup, actions and teardown, tag its own declaration and compare
the two inventories. This change adds exactly the six cases above.

Five cases use the dedicated member and its personal space. The team
settings case uses the dedicated platform administrator to create and
administer one temporary team through the existing `teams.create` setup. Use
the default options and the team ID recorded at creation. This case needs
no feature grants, membership changes or platform settings.

## Agent, profile and chat

Use `agents.create` and `agents.duplicate` for the duplicate case. Save a
known description on the source, reopen the duplicate and check it inherited
that description. Change the duplicate to a second description and reopen
each agent by its own fixture name to check both values.

For Back, start on the personal Prompts page and use `accountMenu.openProfile`
in that browser context. The existing `flows.openProfile` starts on Home.
Capture the personal Prompts URL before opening the profile. Wait for the
profile, press its Back button, then check the browser has returned to that
exact URL and the Prompts page shows Create prompt. Keep this check in the
same browser context without navigating again.

In the chat case, open the named personal agent, open Prompt library, find
the newly created prompt by its exact name inside the panel, then close the
panel and check that the composer is empty. Opening the list only reads
prompts. Selecting a prompt, attaching a file or sending a message is
outside this case.

The general `agents` fixture activates `folders` and `teams`; `prompts`
also activates `teams`. Combining `agents` and `prompts` would start four
timed factory fixtures. Give the chat case a narrow `personalAgent` factory
that can create an agent only for the dedicated member in the configured
personal space. It delegates creation and removal to the existing `Agents`
class. Let the test call its creation method after setup, so a failed create
still reaches the registered teardown. It depends on no other timed factory
and shares the existing `removeEach` teardown and timeout. Use it with `prompts`
and its transitive `teams` dependency, three timed factories in total. Keep
the general `agents` fixture out of the chat case's shared hooks.

## CSV and team settings

Upload the bundled CSV into one new, empty personal folder with **Upload
only**. After **Pending** appears, start processing from that file's row.
A fresh upload already has a processing profile, so this action uses the
stored profile directly. Use the existing processing wait for **Done** or
**Error**, require **Done**, then check for `Alderford` in the file's preview.
Use the existing processing timeout plus the document tests' margin.

The upload planner checks for existing names only in the destination
folder. An empty folder takes the new-document path. The input processor's
`_generate_file_unique_id` assigns a fresh ID to each ingestion, including
identical bytes. Reusing the bundled CSV therefore gives this test its own
document. Keep this folder as its only location. The folder fixture owns
teardown even after a timeout. Removing the last folder deletes the document
record and requests cleanup of its stored content and processing outputs.
That cleanup is best effort. Verify the visible folder and document are gone
on an isolated run, including after a failure during processing. Never look
up a document for deletion by its sample filename across folders.

Type a distinct draft team name. Enter a valid, different description with
surrounding spaces and blur that field directly. Wait for the saved confirmation and
for the field to show the trimmed description supplied by the refreshed
team. Check the draft name in that same open form. Reopen settings for the
fixture team and check the original name and the saved description. Leave
the rename button untouched.

## Prompt duplication

Create the source with a unique command. Use the existing text-edit action
to give it a known body longer than the 140-character card preview, with a
distinct ending. Duplicate through the source card's menu. Generate the
destination name and register it with the prompt fixture before submitting.
Wait for the dialog's confirmation button to be enabled with the new name.
It stays disabled until the source detail loads. Confirm once and wait for
the dialog to close and the destination card to appear. An uncertain save
uses the fixture's conditional removal. A confirmed copy uses its ordinary
removal. Teardown attempts the copy before the source.

Reopen the list and inspect each saved record in its read-only detail view.
Wait for the matching name and full text. Check the copy has no slash command
and the source shows its exact original command. Use a body and description
that start with plain words so they cannot match a displayed slash command.
