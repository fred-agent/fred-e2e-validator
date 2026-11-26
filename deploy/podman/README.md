# Run the tests with Podman

Runs the published image once against a Fred test environment from the host
that runs Fred under `podman compose`, and leaves the HTML report and the
files for Zephyr (Jira) in a folder of the host. Nothing is installed on the
host but the image.

Placeholders: `<registry>` is the registry the host pulls from (ghcr.io, or a
proxy cache of it), `<tag>` the image's tag, `<fred-url>` Fred's public
address, `<fred-network>` the Podman network of Fred's compose project
(`podman network ls`, such as `fred-app_default`), `<proxy>` the HTTP proxy
the host reaches Microsoft through, if any.

## 1. Test accounts

The tests sign in as synthetic accounts, by user name and password, through
the sign-in pages that `sign-in.json` describes. Each account has a role:

| Name         | Role in Fred                                                        |
| ------------ | ------------------------------------------------------------------- |
| `admin`      | Platform administrator: creates the temporary teams of the tests    |
| `member`     | Works in the space of `test-data/test-data.json` ("Personal space") |
| `secondUser` | A second user with no platform role                                 |
| `outsider`   | A user never added to any team                                      |

With `"excludeTags": ["@extended"]`, the default, the tests use only `admin`
and `member`: one platform administrator may stand for all four names. Use
four separate accounts to run the `@extended` tests.

### In the identity provider (Microsoft Entra ID)

For each account:

- A cloud-only user of the tenant that Fred's app registration trusts.
- Signs in with its user name (UPN) and password only: no MFA, no security
  information registration ("Help us protect your account"), and no
  conditional access policy that asks the test host for more (a compliant
  device, a trusted location: allow the host's egress IP address).
- A final password, set by signing in once by hand if the tenant asks for a
  change at first sign-in, that does not expire during the test campaign.
- Its `mail` attribute set, and the `email` claim in Fred's tokens: Fred
  shows that address and the tests check it.
- Assigned to Fred's enterprise application when it requires assignment.

### In Fred

Sign in once by hand with each account, in a private window of a browser
set to English, and:

1. Accept the terms of service if Fred shows them.
2. In the profile, set the language to English and leave no profile
   picture: the tests check the pages by their English labels, and an
   account that saved another language, such as French, fails on the home
   page.
3. Note the user name Fred shows for the account, in its user picker
   "First Last (user name)", and the email its account menu shows: they go
   to `e2e.env` as Fred shows them, capitals included.

Then, as an administrator:

- Give `admin` Fred's platform administrator role, as the environment maps
  roles (from a group or an app role of the token, or in the console).
- Leave `secondUser` without a platform role and `outsider` outside every
  team.

### The accounts file

`e2e.env` holds the accounts, one `KEY=value` per line, values unquoted.
Keep it on the host only, readable by its owner (`chmod 600 e2e.env`):

```bash
ACCOUNT_ADMIN_USERNAME=
ACCOUNT_ADMIN_PASSWORD=
ACCOUNT_ADMIN_EMAIL=
ACCOUNT_MEMBER_USERNAME=
ACCOUNT_MEMBER_PASSWORD=
ACCOUNT_MEMBER_EMAIL=
ACCOUNT_SECOND_USER_USERNAME=
ACCOUNT_SECOND_USER_PASSWORD=
ACCOUNT_SECOND_USER_EMAIL=
ACCOUNT_OUTSIDER_USERNAME=
ACCOUNT_OUTSIDER_PASSWORD=
ACCOUNT_OUTSIDER_EMAIL=
```

`_USERNAME` is what the sign-in page takes (the UPN for Entra) and what
Fred's user picker shows in parentheses; `_EMAIL` the address Fred's account
menu shows. Four separate accounts run every test; one account standing for
all four names repeats its values in each group and runs only the tests
without `@extended`.

## 2. The run folder

```bash
mkdir -p ~/fred-e2e/reports && cd ~/fred-e2e
```

It holds `e2e.env` and three files mounted over the image's own.

`env-config.json`, the environment (see the main README):

```json
{
  "fredBaseUrl": "<fred-url>",
  "workers": 1,
  "browser": "chromium",
  "testTimeout": 120000,
  "expectTimeout": 15000,
  "factoryFixtureTimeout": 120000,
  "excludeTags": ["@model"]
}
```

`excludeTags`: `@model` leaves out the tests that call a language model;
add `@extended` when one account stands for all four names.

`sign-in.json`, the steps of the sign-in pages. The browser of the tests is
in English, so Microsoft's pages are too, whatever the tenant's language:

```json
[
  { "click": "Use another account", "ifShown": true },
  { "fill": "someone@example.com", "with": "username" },
  { "click": "Next" },
  { "fill": "Password", "with": "password" },
  { "click": "Sign in" },
  { "click": "Yes" }
]
```

- The first step answers Microsoft's account picker, which shows after a
  sign-out; `ifShown` skips it in a new browser.
- The email field goes by its placeholder, which depends on the tenant,
  such as `someone@example.com` or `Email, phone, or Skype`.
- The last step answers "Stay signed in?"; remove it if the tenant does
  not ask.

`sign-out.json`, what the sign-out asks after "Disconnect". Entra ID asks
which account to sign out of, then shows its account picker, which the
first step of `sign-in.json` answers:

```json
[{ "choose": "username" }]
```

`choose` clicks the account's user name on its tile, whatever its capitals.
A provider that asks nothing after "Disconnect" takes `[]`.

## 3. Pull the image

```bash
podman pull <registry>/thalesgroup/fred-agent/fred-e2e-tests:<tag>
```

Rootless Podman with a small `/tmp` may need `TMPDIR` set to a larger
folder for the pull, such as `TMPDIR=/opt/fred/data/rootless/tmp`.

## 4. Run

```bash
cd ~/fred-e2e
IMAGE=<registry>/thalesgroup/fred-agent/fred-e2e-tests:<tag>
PROXY=http://<proxy>   # leave empty when the host reaches Microsoft directly
FRED_HOST=$(grep -oP '"fredBaseUrl": *"https?://\K[^/:"]+' env-config.json)

run() {
  podman run --rm --init --shm-size=1g \
    --network <fred-network> \
    --userns=keep-id --user "$(id -u):$(id -g)" -e HOME=/tmp \
    --env-file ./e2e.env \
    ${PROXY:+-e HTTPS_PROXY=$PROXY -e NO_PROXY=$FRED_HOST,localhost} \
    -e FRED_IGNORE_HTTPS_ERRORS=true \
    -e PLAYWRIGHT_HTML_OUTPUT_DIR=/reports/html \
    -e ZEPHYR_REPORT_DIR=/reports/zephyr \
    -v "$PWD/env-config.json:/app/env-config.json:ro,Z" \
    -v "$PWD/sign-in.json:/app/sign-in.json:ro,Z" \
    -v "$PWD/sign-out.json:/app/sign-out.json:ro,Z" \
    -v "$PWD/reports:/reports:Z" \
    "$IMAGE" \
    ./node_modules/.bin/playwright test --output /reports/test-results "$@"
}

run tests/home/sections.spec.ts              # 1. sign-in and the home page
run tests/accounts/switch-users.spec.ts      # 2. sign-out and sign-in again
run                                          # 3. the whole suite
```

- The command replaces the image's default, the run page's service, with
  one Playwright run. Arguments after `run` go to `playwright test`, such as
  a test file or `--grep @smoke`.
- `--userns=keep-id --user` runs as the host user, so the reports belong to
  that user. With rootful Podman, remove `--userns=keep-id`.
- `--env-file` passes the accounts without mounting the file.
- `HTTPS_PROXY` routes the browser through the proxy; `NO_PROXY` keeps Fred
  out of it, as the proxy does not reach an internal Fred.
- `FRED_IGNORE_HTTPS_ERRORS=true` accepts a certificate an internal
  authority signs, which the image does not trust. Leave it out for a Fred
  with a public certificate.
- `PLAYWRIGHT_HTML_OUTPUT_DIR` and `ZEPHYR_REPORT_DIR` are required: the
  image's own folder is read-only for the run.
- A long run outlives an SSH session in `tmux`, or with `-d --name fred-e2e`
  followed by `podman logs -f fred-e2e`.

## 5. Reports

| File                              | For                                                                 |
| --------------------------------- | ------------------------------------------------------------------- |
| `reports/zephyr/zephyr-tests.csv` | Zephyr's test import: one row per step, rows grouped by `Name`      |
| `reports/zephyr/junit.xml`        | Zephyr's import of execution results                                |
| `reports/html/index.html`         | The step report: copy the folder to a workstation and open the file |

Each run replaces the reports of the previous one: copy `reports/` first to
keep them.

## Troubleshooting

| Symptom                                                  | Check                                                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "A required test account is incomplete."                 | A variable of `e2e.env` is missing or empty                                                              |
| `open()` fails at once, "navigation failed"              | Fred's certificate: `FRED_IGNORE_HTTPS_ERRORS=true`; with a proxy, Fred's host in `NO_PROXY`             |
| "The first sign-in page did not show"                    | Microsoft is not reached: set `PROXY`; or the first steps of `sign-in.json` differ from the page         |
| A sign-in step `click("Suivant")` fails                  | The pages are in English in the tests: `Next`, `Sign in`, `Yes`                                          |
| "The sign-in did not finish"                             | The user name or password, or an extra page of the provider (MFA, password change, security information) |
| `expectShown()` of the home page fails after the sign-in | The account's language in Fred is not English                                                            |
| `choose(...)` fails after "Disconnect"                   | `_USERNAME` differs from the user name on Microsoft's tile                                               |
| A user cannot be found in a picker                       | The account never signed in to Fred, or Fred shows another user name than `_USERNAME`                    |
| The registry answers "unknown repository"                | The image path, and that the package is public for a proxy cache without credentials                     |
