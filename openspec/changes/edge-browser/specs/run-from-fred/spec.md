## ADDED Requirements

### Requirement: Edge runtime image

The Linux AMD64 runtime SHALL use the official Playwright image and include
Edge Stable, Chromium, Firefox and WebKit.
The service user SHALL be able to launch Edge headlessly.

#### Scenario: Running Edge in the validator

- **WHEN** the service user launches the default browser in the built image
- **THEN** Edge can open a blank page without application access or test accounts
