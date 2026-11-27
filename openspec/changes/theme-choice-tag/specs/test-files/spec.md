## ADDED Requirements

### Requirement: Theme choice tag

Each case or parameter row that reads or chooses a theme in the profile's
"UI theme" select SHALL carry `@theme-choice` on its declaration or parameter
row. A case SHALL NOT check the mode or the language together with the
theme, so that excluding `@theme-choice` keeps their coverage.

#### Scenario: A platform that offers a single theme

- **WHEN** the run profile excludes `@theme-choice`
- **THEN** the selection leaves out the cases of the "UI theme" select
- **AND** the cases of the mode and the language stay selected
