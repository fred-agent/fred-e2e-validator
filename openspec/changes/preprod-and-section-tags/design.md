## Section tags

Each file's top-level group identifies its area. Narrower tags identify tested
features such as chat, models and document formats. A section can contain both
single-account and multi-account cases. The complete suite requires dedicated
accounts for the distinct roles it exercises.

Team model settings and model-backed processing carry `@model`. Cases that
open Models in Admin › Features carry `@model-discovery` and stay outside
both the `@model` and `@preprod` selections. The format tags `@docx` and
`@ppt` include tests of the corresponding agent capabilities.

## Shared-canary selection

A reviewer traces each case's setup, actions, visits and cleanup before adding
`@preprod` to its declaration. For parameterized cases each row states its own
tags. Future cases therefore enter the selection through an explicit decision.

A reviewed case also carries `@multi-user` when any step, including a
fixture or hook, needs two distinct identities. For example, adding a user
to a team already administered by the creator needs a second identity.
Opening several contexts for the same account does not. An installation
with one dedicated platform administrator and one worker can select
`@preprod` and exclude `@multi-user` through the run profile.

Cases may change a dedicated account's profile and personal space, create teams
and resources, and manage dedicated users' membership in those teams. Shared
feature grants, platform writes and marketplace publication, likes and imports
stay outside the selection. A team-specific grant can initialize a shared
feature permission. A page visit that saves model discovery also changes
platform state.

The selected cases allow ordinary sign-in and bootstrap activity. Temporary
objects and links can survive interrupted cleanup. Audit and usage records and
starter content created by the platform can outlast a successful run.

## Selection and verification

The run page matches any chosen tag. Choose `@preprod` alone for a shared
canary. On the command line match it as a whole tag. Compare both selections
with the audited inventory through browser-free discovery.
