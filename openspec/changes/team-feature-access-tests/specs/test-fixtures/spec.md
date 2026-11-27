## MODIFIED Requirements

### Requirement: Test data

`testData` SHALL be the test data of `test-data/test-data.json`, parsed with
a strict schema that rejects an unknown key. For the agent templates, models
and apps whose access a test sets for its team, the test data SHALL name a
feature on for all teams and a feature off for all teams, by the names
Admin › Features lists, as these differ between environments.

#### Scenario: A setting in test data

- **WHEN** `test-data/test-data.json` holds `fredBaseUrl`
- **THEN** the worker fixture fails and names the key and the file

#### Scenario: A feature the environment does not list

- **WHEN** the test data names a model that Admin › Features does not list
- **THEN** a test that uses it fails and names the model and its kind
