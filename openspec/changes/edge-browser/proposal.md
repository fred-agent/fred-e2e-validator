## Why

Local and container runs need to exercise the same browser that users run.

## What changes

- Set Microsoft Edge Stable in the repository's test profile and allow a
  run profile to select Chromium, Firefox or WebKit.
- Add Edge to the three browsers provided by the official Playwright image.

## Capabilities

- `run-configuration` defines the browser setting and Playwright project.
- `run-from-fred` defines the container runtime and its architecture.
