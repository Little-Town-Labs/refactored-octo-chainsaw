// F02 T060 — Typed errors thrown by `signOutAction`.
//
// Lives outside the `"use server"` action file because Next 16 /
// Turbopack restricts `"use server"` modules to async-function
// exports only. Importing the class from a sibling, non-action
// module keeps the error name (`SignOutFormInvalidError`) stable
// for the error.tsx boundary's selectBannerKind dispatch.

export class SignOutFormInvalidError extends Error {
  readonly errors: Readonly<Record<string, string | undefined>>;
  constructor(errors: Readonly<Record<string, string | undefined>>) {
    super("Sign-out form failed validation.");
    this.name = "SignOutFormInvalidError";
    this.errors = errors;
  }
}
