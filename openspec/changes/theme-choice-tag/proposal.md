## Why

Fred shows the profile's "UI theme" select only when the platform offers more
than one theme. On a platform with a single theme, the cases that read or
choose a theme fail although Fred behaves as intended. The same cases also
checked the mode, which every platform offers, so the mode lost its coverage
there too.

A profile shows the username and the email. With an identity provider whose
username is the email, such as Microsoft Entra ID, the email shows twice and
the check of the account's email matched two elements.

## What changes

- Split the theme from the mode in the profile's settings cases and tag the
  theme cases with `@theme-choice`.
- Accept the account's email shown twice in the profile.
- Document the tag for authors and the exclusion for operators.

## Capabilities

- `test-files` defines the `@theme-choice` tag and the selection it allows.
