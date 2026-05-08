// Clerk catch-all sign-in for the seeker audience.
// Spyglass renders no custom auth UI (PRD §3.4); Clerk's hosted
// component handles signup, login, password reset, MFA enrollment.

import { SignIn } from "@clerk/nextjs";

export default function SeekerSignInPage() {
  return <SignIn />;
}
