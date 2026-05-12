"use client";

// F02 T061 — Error boundary for the operator console (NFR-13, NFR-14).
//
// Maps typed errors thrown by pages/actions to one of five
// enumeration-resistant `<AuthBanner />` kinds. The boundary itself
// never includes scope names, role names, or factor types in the
// rendered output — it only chooses the *kind* of banner and lets
// the banner own the fixed copy.
//
// Next.js error boundaries are client components (state + the
// `reset()` callback). They receive a serialized `Error` whose
// `message`/`name`/`digest` survive but whose prototype chain does
// not, so the typed-error discrimination uses `error.name` rather
// than `instanceof` against the source class.
//
// `digest` is the server-side stable id Next attaches to thrown
// errors. We log it to the *browser* console (this is a client
// component) for ops to recover via session-replay tooling; it is
// not surfaced in the rendered banner. The digest itself is a
// random id and not sensitive.

import { useEffect, useRef } from "react";

import { AuthBanner } from "../../../src/console/auth-banner";
import { selectBannerKind } from "../../../src/console/select-banner-kind";

interface ErrorPageProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function OperatorConsoleError({ error, reset }: ErrorPageProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Browser-side correlation log. Only `name` + `digest` go to the
    // log; `message` may contain detail we deliberately don't expose
    // to the user (or to client-side log forwarders).
    console.error(
      JSON.stringify({
        kind: "operator_console_error",
        name: error.name,
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  useEffect(() => {
    // Move keyboard focus into the banner so a sighted keyboard user
    // doesn't lose context. `role="alert"` already handles the AT
    // announcement; focus management closes the gap for keyboard.
    sectionRef.current?.focus();
  }, []);

  return (
    <AuthBanner
      kind={selectBannerKind(error)}
      onReset={reset}
      headingLevel={1}
      sectionRef={sectionRef}
    />
  );
}
