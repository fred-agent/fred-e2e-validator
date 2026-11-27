The repository's `env-config.json` selects `msedge`. A deployment supplies
its own profile through Helm. Each run starts one project with the
desktop device descriptor for its selected browser. The Edge project sets
the stable Edge channel. Chromium, Firefox and WebKit use their bundled
binaries. All four selections respect the profile's tag exclusions.

The runtime uses the official Playwright image pinned to the test runner's
version and installs Edge alongside its bundled browsers. The Linux Edge
installer requires AMD64. The image build lists the tests. A local check
can launch Edge headlessly in the built image without application access or
test accounts.
