## ADDED Requirements

### Requirement: Section and shared-canary selection

Every test SHALL carry a section tag. Feature tags MAY identify a narrower
behavior or file format. A reviewed automated case MAY carry `@preprod` on
its own declaration or parameter row. The review SHALL cover fixtures, shared
setup, page visits, actions and teardown. The case SHALL confine deliberate
writes to dedicated accounts' profiles and personal spaces and resources owned
by the test. It SHALL leave other users' resources, memberships and permissions
and platform settings alone throughout the run.

Each `@preprod` case that requires distinct users during setup, execution,
assertions or cleanup SHALL also carry `@multi-user` on its declaration
or parameter row.

#### Scenario: One platform administrator runs the shared-canary selection

- **WHEN** the run profile excludes `@multi-user` and the operator selects `@preprod`
- **THEN** the selection contains every reviewed case that can exercise its rule using one dedicated platform administrator
- **AND** a reviewed case whose shared setup adds a different user to a temporary team is excluded

#### Scenario: Selecting cases for a shared environment

- **WHEN** an operator selects only `@preprod` on the run page
- **THEN** the selection matches the automated cases listed by the command line for that whole tag

#### Scenario: A new case in a previously reviewed group

- **WHEN** an author adds a test or parameter row without a shared-canary review
- **THEN** the case inherits its section and stays outside the shared-canary selection

#### Scenario: A temporary team's setup writes a shared permission

- **WHEN** a case's fixture can create a shared organization-to-feature grant while configuring the test's team
- **THEN** the case stays outside the shared-canary selection
