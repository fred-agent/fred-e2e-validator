## ADDED Requirements

### Requirement: KPI store tag

Each case or parameter row whose setup, actions or assertions open a view that
reads KPI presets from an OpenSearch KPI store SHALL carry `@kpi-store` on its
declaration or parameter row. A case that only checks such a view is absent
for a role SHALL NOT carry it.

#### Scenario: A deployment without an OpenSearch KPI store

- **WHEN** the run profile excludes `@kpi-store`
- **THEN** the selection leaves out the cases that open Admin › Analytics, a team's "Analytics" and the home section "Your activity"
- **AND** every other case stays selected
