# @spyglass/auth

**Status:** alpha — F01 placeholder; populated in F02 (Identity & Auth
+ AAA primitives).

Clerk integration plus Spyglass's role/permission layer and the
agent-identity primitives Article II demands. Owns: human user auth,
employer org seats, agent principal verification, scoped/short-lived
agent credentials, MFA enforcement (NIST SP 800-63B AAL2+).

## Public API

To be defined in F02. Will export Clerk wrappers, auth middleware
helpers, principal-resolution utilities.

## Dependencies

Clerk SDK; will depend on `@spyglass/shared`.

## Stability tier

Alpha; AAL2 enforcement and agent-identity model land in F02.
