## ADDED Requirements

### Requirement: Apps tag

Each case or parameter row that opens a team space's "Apps" page SHALL carry
`@apps` on its declaration or parameter row.

#### Scenario: A deployment without team applications

- **WHEN** the run profile excludes `@apps`
- **THEN** the selection leaves out the cases that open a team's "Apps" page
- **AND** every other case of the team's pages stays selected

### Requirement: Status of a file uploaded without processing

A case that uploads a file without processing SHALL check the status that
Fred shows for it, "Pending", and SHALL NOT expect a mark of the document's
origin.

#### Scenario: A file uploaded with "Upload only"

- **WHEN** a member uploads a file into a folder with "Upload only"
- **THEN** the folder lists the file with the status "Pending"
