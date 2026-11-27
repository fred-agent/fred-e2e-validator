## ADDED Requirements

### Requirement: Personal chat test resources

The chat library case SHALL create its agent and prompt in the dedicated
member's personal space using at most three timed factory fixtures,
including transitive dependencies. Each object's fixture SHALL record its
unique name before creation and attempt removal after a failed test. The
personal-agent factory SHALL start creation only when the test requests
it, reuse the existing agent lifecycle and depend on no other timed factory.

#### Scenario: The chat assertion fails after both objects are created

- **WHEN** the chat library check fails
- **THEN** the teardown attempts to remove both the personal agent and the personal prompt using their recorded names and creator

### Requirement: Cleanup of the stored CSV

The CSV case SHALL upload its file to exactly one newly created personal
folder. The folder fixture SHALL attempt removal after success, failure or a
processing timeout and propagate a visible teardown failure.

#### Scenario: The test fails after starting row processing

- **WHEN** processing has started and the CSV test fails
- **THEN** teardown removes the recorded folder through the normal UI, which removes its single-folder document
- **AND** isolated verification checks that the folder and its specific document disappear without removing any other file

### Requirement: Cleanup of duplicated prompts

The prompt fixture SHALL register the destination name, space and creator
before confirming a duplication and SHALL attempt the duplicate's removal
before the source's removal.

#### Scenario: The server creates a copy and confirmation is interrupted

- **WHEN** the duplicate might exist but the fixture did not confirm creation
- **THEN** teardown checks the loaded list for the registered copy, removes it if present and also attempts to remove the source
