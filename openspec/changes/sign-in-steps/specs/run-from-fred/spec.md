## MODIFIED Requirements

### Requirement: Image, chart and registration

One image SHALL hold the service, the support code, the tests and the built
run page, and its build SHALL fail when the tests do not load. The chart
`fred-e2e-tests` SHALL require `envConfig` in its values, Fred's address
included, and mount the `env-config.json` it renders from it, mount the
`sign-in.json` it renders from `signIn` when a release sets it and otherwise
leave the image's in place, take the accounts from a named Secret, never run
two pods on the runs volume, give the pod no Kubernetes token, and be
reachable only in the cluster. Fred's registration file SHALL register
`e2e-tests` with the display name "End-to-end tests".

#### Scenario: A test file that does not load

- **WHEN** the image is built with a test file that has a syntax error
- **THEN** the build fails and names the file

#### Scenario: Accounts in the cluster

- **WHEN** the chart is installed
- **THEN** no credential is in the chart, its values or its ConfigMaps

#### Scenario: Another environment's sign-in pages

- **WHEN** a release sets other steps in `signIn` and its pod is restarted
- **THEN** the same image signs the accounts in with those steps

#### Scenario: A release without sign-in steps

- **WHEN** the values of a release hold no `signIn`
- **THEN** the pod uses the `sign-in.json` of the image

#### Scenario: A release with a wrong list

- **WHEN** a step of a release's `signIn` is wrong and a user starts a run
- **THEN** the run fails before a browser starts, and its log names `sign-in.json` and the step's number
