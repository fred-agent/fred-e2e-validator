## Context

See proposal.md for why. Admin › Features lists the features by kind:
Capabilities, Agents (the agent templates), Models, Knowledge Bases, Skills
and Apps. Every kind but Skills has, on each row, "Enabled for all" and
"Manage by team". When models come from a discovery source, the Models list
has the tabs "Catalog" and "Discovery", and a model is in one of them.
"Manage by team" opens a side panel, "<feature> — team access", with a search
"Search teams..." and, for each team, a radio group "Access for <team>" of
"Disable", "Default" and "Enable". "Default" makes the team follow "Enabled
for all"; its message is "<team> now follows the platform default.", with
"— <n> instance(s) suspended." when it suspends agents. The row "All personal
spaces" heads the panel for every kind but Apps and Knowledge Bases, and a
search hides it. Only a platform administrator or a feature manager changes
access; a team administrator has no page of it.

Where a team meets each kind, and what a change does:

| Kind | Where the team meets it | When the team loses it |
| --- | --- | --- |
| Capability | The agent form's capabilities | Its agents that use it are suspended |
| Agent template | "Select an agent template", the first step of a new agent | Its agents of that template are suspended |
| Model | The team's settings "Models", and "Recommended model" in the agent form | A recommended model or team default that names it is cleared |
| App | The team's "Apps" page, which lists its apps or "No applications are available for this team." | The app is no longer listed |
| Knowledge base | The entry "Knowledge Bases" of the team's space | A new one cannot be added |

A template that needs a capability the team lacks shows "Requires … to be
enabled for this team first."; "Enable" then asks "Enable required features
too?", whose message says that the team cannot use the template yet, and
"Enable all" enables the capability and the template for that team only. A
feature with suspended agents shows "<n> suspended" in its row, which opens
"<feature> — suspended agents", grouped by team. Admin › Features names a
capability differently from the agent form: "Fill a PowerPoint file" there is
"Fill in a PowerPoint document" in the form.

Sources for the test files: the Help Center articles "Platform
administration" ("Who opens functions to your team"), "Agents" ("The three
states of a function", "The recommended language model"), "Teams and
permissions" ("Team settings", "Evaluation application") and
"Capabilities".

## Goals / Non-Goals

**Goals:**
- Agent templates, models and apps: "Enable" for a feature off for all
  teams, "Disable" for one on for all teams, and "Default" after each; for
  capabilities, "Default" after each, as "Enable" and "Disable" have tests.
- The suspension of an agent whose template is disabled for its team, the
  console's list of suspended agents, and "Enable all" for a required
  capability.

**Non-Goals:**
- Any change for every team or every user (see proposal.md).
- What an agent does with a feature in a conversation.

## Decisions

### D1. One test file for templates, models and apps

`tests/admin/feature-access.spec.ts` holds one rule per behaviour, grouped by
kind in the order of the filter, so a team's access to every kind is read in
one place beside the console's other tests. The capability cases stay in
`tests/capabilities/team-access.spec.ts`, which gains "Default" and the
automated test of a team without a setting of its own, with the team that
has the capability as its control.

### D2. One account

`admin`, the platform administrator, creates the test's teams and is their
administrator, with the Editor role in every test that opens the agent form
or the template step. Every test carries `@team`.

### D3. The features, and the settings for all teams they rely on

`test-data.json` gains `teamAccess`:
- `agentTemplates`: a template off for all teams, and a template off for all
  teams that requires a capability. The template on for all teams is
  `agentTemplate`, which `agents.create` uses.
- `models`: a model on for all teams and one off for all teams, each with its
  tab when the Models list has tabs. The model on for all teams is not the
  one a new team's "Models" marks "Default".
- `apps`: an app on for all teams and one off for all teams.

Capabilities stay label unions in the code, as for the existing capability
tests: `TeamCapability`, the names in Admin › Features, gains "Documents",
"Generate a web page (HTML/CSS)" and "Fill a PowerPoint file", and
`AgentCapability`, the switches of the agent form's normal view, gains "Fill
in a PowerPoint document". A test passes both where it sets a capability and
checks the form. A capability that only the "Advanced capabilities view"
lists is not used for these checks.

When a check relies on a feature's "Enabled for all", after "Default" or to
show that "Enable" or "Disable" changed the team's access, the test first
expects that setting; a test that disables a model also expects the team's
"Models" to list it without "Default". A different environment fails there,
with the feature, its kind and what was found. The test never adapts to
what it finds. For each of the three capability cases, read "Enabled for all"
and record the checked "All personal spaces" choice with the team search
empty before creating the teams or setting access in a fixture. After each
override and each reset, clear the team search, read both shared controls
again and compare them with those initial values. Keep both controls
read-only. Scope the existing team-creation hook to cases that use its
setup. Create the new cases' teams after the default check, with an editor
and a usable agent template.

In the normal view of the reloaded agent form, check the effect of the
explicit override before clearing it. "Generate a web page (HTML/CSS)"
disappears after "Disable" and reappears after "Default". "Fill in a
PowerPoint document" appears after enabling "Fill a PowerPoint file" and
disappears after "Default". For the two-team inheritance case, enable the
PowerPoint capability for the first team only and leave its override active
while checking both forms. Use the same template and editor role for both
teams. Wait for the named team's confirmation and refreshed row to show its
saved radio choice before reopening the consuming form. Show a known
available capability beside each absence check.

### D4. The features page sets any kind's access for one team

`FeaturesPage` takes the kinds "Capabilities", "Agents", "Models" and "Apps"
as a union type. `setTeamAccess(kind, feature, team, access)` takes "Enable",
"Disable" or "Default" and replaces `setCapabilityAccess` and
`setAgentTemplateAccess`; for "Capabilities" its feature is a
`TeamCapability`, so a capability stays a checked label. `fixtures/teams.ts`
and the capability tests call it. The option `capabilities` of
`teams.create` keeps "Enable" and "Disable". `expectEnabledForAll(kind,
feature, on)` reads a row's switch without touching it.
`enableTemplateWithRequirements(template, team)` chooses "Enable" in the
team's row, checks that "Enable required features too?" is the dialog of a
team, whose message says that this team cannot use the template yet, and
answers "Enable all". `expectSuspendedAgent(kind, feature, team, agent)`
opens the row's suspended agents and closes them. `TeamAccessPanel` finds the
team through "Search teams...", which also hides "All personal spaces", and
ends each choice on the team's radio checked and the panel's message, with
or without suspended instances.

### D5. The team's side is read after a reload, beside a feature it shows

Each check of the team's side reloads the page it reads, and its name says
so. It checks a feature absent only beside one the same list shows, so a list
that did not load fails the check:
- `AgentsPage`: `reloadAndExpectTemplates(offered, notOffered)` opens
  "Create", reads "Select an agent template" and cancels the form;
  `reloadAndExpectRecommendedModels(template, offered, notOffered)` opens a
  new agent of the template, reads "Recommended model" and cancels the form.
- `TeamSectionsPages`, "Models": `reloadAndExpectModels(listed, notListed)`.
- `AppsPage`: `reloadAndExpectApps(listed, notListed)`. Every apps check
  keeps one of its two apps enabled for the team, so the page lists an app
  beside the one it checks absent.

### D6. A suspended agent

The suspension test creates its team with the test data's template off for
all teams enabled through the option `agentTemplate` of `teams.create`, so
the team keeps a second template whatever the environment offers. A team
without any template shows "No agents available yet" in place of its agents,
which would hide the suspended agent. The test creates an agent of
`agentTemplate`, disables that template for the team, and expects the
template step to offer the second template and not the disabled one, the
agent's card suspended, and the console's suspended agents of the template to
list the agent under the team. "Default" afterwards makes the agent available
again.

### D7. Model discovery

Selecting "Models" in Admin › Features refreshes model discovery, which saves
the platform's list of models for every discovery source the agent services
advertise. Where none is configured, the refresh saves nothing. The tests
that select "Models" carry `@model-discovery`, and the committed
`env-config.json` excludes it, so a working copy, or an image run without a
release's own `env-config.json`, runs them only after its `excludeTags`
drops the tag. The local Fred, whose models catalog
holds `discovery: null`, drops it in its working copy, and
`deploy/k3d/values-local.yaml` keeps `excludeTags` empty. A chart release has
no default for `excludeTags`: README says that a release with a discovery
source adds `@model-discovery` to it before it upgrades to an image with
these tests. The stage-1 script selects "Models" only on an environment whose
models catalog, read from its deployment before the script runs, configures
no discovery source, as the local Fred's `discovery: null`. The team's "Models" settings and an agent's
"Recommended model" do not refresh discovery.

### D8. Removal

The `teams` fixture removes the teams it created, including both teams in
the inheritance case. Deleting a team removes its team-specific access.
Setting access can also create an organization-to-feature permission that
survives deletion of both the team and its override. Every case that writes
feature access, directly or through a fixture, runs on an isolated
environment and stays outside `@preprod`. The tests only read "Enabled for
all" and "All personal spaces".

### D9. Planned and absent rules

A team's access to a knowledge base keeps a planned test: the environment
lists no knowledge base. Skills have no rule here.

## Risks / Trade-offs

- [Another environment has other features or settings for all teams] → The
  test data names them, and D3 fails with the name before any change.
- [A disabled model is the team's default] → D3 checks that the team's
  "Models" does not mark it "Default" before the change.
- [The panel lists every team of the platform] → The search finds the test's
  team by its unique name.
- [Enabling "Evaluation" opens that app to the test's team] → The test only
  reads the team's "Apps" page; the team is removed after the test.
- [Selecting "Models" opens "Default model missing", a dialog without a way
  back, where the platform has no default chat model] → The model tests fail
  there and name it; the local Fred has its Mistral models on.
