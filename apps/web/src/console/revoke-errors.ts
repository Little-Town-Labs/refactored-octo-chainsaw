// F02 T058 — Typed errors thrown by `revokeCredentialAction`.
//
// Lives outside the `"use server"` action file because Next 16 /
// Turbopack restricts `"use server"` modules to async-function
// exports only. Importing the class from a sibling, non-action
// module keeps the error name (`RevokeFormInvalidError`) stable
// for the error.tsx boundary's selectBannerKind dispatch.

export class RevokeFormInvalidError extends Error {
  readonly errors: Readonly<Record<string, string | undefined>>;
  constructor(errors: Readonly<Record<string, string | undefined>>) {
    super("Revoke form failed validation.");
    this.name = "RevokeFormInvalidError";
    this.errors = errors;
  }
}
