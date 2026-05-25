import { UserProfile } from "@clerk/nextjs";

export default function SeekerProfilePage() {
  const hasClerkConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main>
      <h1>Account profile</h1>
      <p>
        Manage your Spyglass account details through Clerk. Matching preferences and product
        decisions stay in the conversation.
      </p>
      {hasClerkConfig ? (
        <UserProfile routing="path" path="/profile" />
      ) : (
        <p>Clerk profile management is available when Clerk public configuration is present.</p>
      )}
    </main>
  );
}
