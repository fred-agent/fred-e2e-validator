# Run the tests with Podman

Runs the published image once against a Fred test environment from the host
that runs Fred under `podman compose`, and leaves the HTML report and the
files for Zephyr (Jira) in a folder of the host. Nothing is installed on the
host but the image.

Placeholders: `<registry>` is the registry the host pulls from (ghcr.io, or a
proxy cache of it), `<fred-url>` Fred's public address, `<fred-network>` the
Podman network of Fred's compose project (`podman network ls`, such as
`fred-app_default`).

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

- Sign in once by hand with each account, so Fred knows the user: the tests
  pick users by their user name, which Fred's user picker shows as
  "First Last (user name)".
- Give `admin` Fred's platform administrator role, as the environment maps
  roles (from a group or an app role of the token, or in the console).
- Leave `secondUser` without a platform role and `outsider` outside every
  team.
- Keep each account's language English and without a profile picture: the
  pages are checked by their English labels. An account without a saved
  language follows the browser, English in the tests; one that saved
  another, such as French from a first sign-in by hand, is set back to
  English in its profile.

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
menu shows. One account standing for all four names repeats its
values in each group.

## 2. The run folder

```bash
mkdir -p ~/fred-e2e/reports && cd ~/fred-e2e
```

It holds `e2e.env` and two files mounted over the image's own.

`env-config.json`, the environment (see the main README):

```json
{
  "fredBaseUrl": "<fred-url>",
  "workers": 1,
  "browser": "chromium",
  "testTimeout": 120000,
  "expectTimeout": 15000,
  "factoryFixtureTimeout": 120000,
  "excludeTags": ["@extended", "@model"]
}
```

`@model` leaves out the tests that call a language model; remove it to run
them.

`sign-in.json`, the steps of the sign-in pages. For Entra ID in French:

```json
[
  { "fill": "someone@example.com", "with": "username" },
  { "click": "Suivant" },
  { "fill": "Mot de passe", "with": "password" },
  { "click": "Se connecter" },
  { "click": "Oui" }
]
```

Check each text against the pages: a field by its label or placeholder, a
button by its text. The email field's placeholder depends on the tenant,
such as `someone@example.com` or `Email, phone, or Skype`. In English, the
buttons read `Next`, `Sign in` and `Yes`, the password field `Password`. The
last step answers "Stay signed in?"; remove it if the tenant does not ask.

`sign-out.json`, optional: what the sign-out asks after "Disconnect", up to
the first sign-in page again. Entra ID asks which account to sign out of,
then shows its account picker again:

```json
[{ "choose": "username" }, { "click": "Utiliser un autre compte" }]
```

`choose` clicks the account's user name on its tile, whatever its capitals;
the click leaves the picker for the email field, the first step of
`sign-in.json`. In English: `Use another account`. Only the tests that sign
out, tagged `@extended`, use it.

## 3. Pull the image

```bash
podman pull <registry>/thalesgroup/fred-agent/fred-e2e-tests:<tag>
```

Rootless Podman with a small `/tmp` may need `TMPDIR` set to a larger
folder for the pull, such as `TMPDIR=/opt/fred/data/rootless/tmp`.

## 4. Run

```bash
cd ~/fred-e2e
run() {
  podman run --rm --init --shm-size=1g \
    --network <fred-network> \
    --userns=keep-id --user "$(id -u):$(id -g)" -e HOME=/tmp \
    --env-file ./e2e.env \
    -e PLAYWRIGHT_HTML_OUTPUT_DIR=/reports/html \
    -e ZEPHYR_REPORT_DIR=/reports/zephyr \
    -v "$PWD/env-config.json:/app/env-config.json:ro,Z" \
    -v "$PWD/sign-in.json:/app/sign-in.json:ro,Z" \
    -v "$PWD/sign-out.json:/app/sign-out.json:ro,Z" \
    -v "$PWD/reports:/reports:Z" \
    <registry>/thalesgroup/fred-agent/fred-e2e-tests:<tag> \
    ./node_modules/.bin/playwright test --output /reports/test-results "$@"
}

run tests/home/sections.spec.ts   # a quick check: sign-in and the home page
run                               # the whole suite
```

`sign-out.json` must exist for its mount: an empty list `[]` when the
sign-out asks nothing. With four separate accounts, remove `@extended` from
`excludeTags` to run the tests that need several accounts and the one that
signs out (`tests/accounts/switch-users.spec.ts`).

- The command replaces the image's default, the run page's service, with
  one Playwright run. Arguments after `run` go to `playwright test`, such as
  a test file or `--grep @smoke`.
- `--userns=keep-id --user` runs as the host user, so the reports belong to
  that user. With rootful Podman, remove `--userns=keep-id`.
- `--env-file` passes the accounts without mounting the file.
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

| Symptom                                          | Check                                                                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| "A required test account is incomplete."         | A variable of `e2e.env` is missing or empty                                                                                                   |
| A sign-in step `fill(...)` or `click(...)` fails | Its text in `sign-in.json` differs from the page                                                                                              |
| "The sign-in did not finish"                     | The user name or password, or an extra page of the provider (MFA, password change, security information)                                      |
| The first page never shows                       | The container reaches `<fred-url>`: `podman run --rm --network <fred-network> <image> curl -sI <fred-url>`; else add `--add-host <host>:<ip>` |
| A user cannot be found in a picker               | The account never signed in to Fred, or Fred shows another user name than `_USERNAME`                                                         |
| The registry answers "unknown repository"        | The image path, and that the package is public for a proxy cache without credentials                                                          |
