// Clerk catch-all sign-in for the operator audience (FR-9).
// This URL is intentionally not linked from public marketing or
// employer landing pages. The proxy (B2 T018) returns 404 — not
// 403 — to non-operators reaching this surface.

import { SignIn } from "@clerk/nextjs";

export default function OperatorSignInPage() {
  return <SignIn />;
}
