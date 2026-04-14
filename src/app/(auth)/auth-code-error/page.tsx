import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-bold tracking-wide">
          Sign-in failed
        </h1>
        <p className="text-sm text-[var(--muted)]">
          The auth link was invalid or expired. Try signing in again.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
