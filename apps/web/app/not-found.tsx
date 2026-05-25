import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>That page is not available</h1>
      <p>
        Spyglass keeps the seeker web surface limited to account setup, public discovery, and
        conversation entry points.
      </p>
      <Link href="/">Return to Spyglass</Link>
    </main>
  );
}
