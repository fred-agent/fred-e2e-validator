## Why

Fred hides its KPI views when a deployment has no OpenSearch KPI store:
Admin › Analytics, a team's usage page ("Analytics") and the home section
"Your activity". On such a deployment, the cases that open these views fail
although Fred behaves as intended.

## What changes

- Tag with `@kpi-store` each case and parameter row that opens a view reading
  KPI presets from OpenSearch.
- Document the tag for authors and the exclusion for operators.

## Capabilities

- `test-files` defines the `@kpi-store` tag and the selection it allows.
