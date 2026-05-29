// Clerk catch-all sign-in for the employer audience.
// Org context resolution and AAL2 enforcement happen in the proxy
// (B2 T018) and the AAL2 gate (B3 T030).

import { SignIn } from "@clerk/nextjs";

export default function EmployerSignInPage() {
  return <SignIn />;
}
