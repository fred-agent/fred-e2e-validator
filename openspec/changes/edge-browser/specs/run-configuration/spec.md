## ADDED Requirements

### Requirement: Edge browser channel

The repository's `env-config.json` SHALL select the stable Edge channel with
the desktop Edge device descriptor. Profiles SHALL also accept explicit `chromium`,
`firefox` and `webkit` selections and run one project for the selected browser.

#### Scenario: Single-account discovery

- **WHEN** a profile selects `msedge`, excludes `@multi-user` and lists `@preprod`
- **THEN** the Edge project lists every selected single-account case without starting a browser
