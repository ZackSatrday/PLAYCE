import { Suspense } from "react";
import { AuthScreen } from "./auth-screen";

function AuthFallback() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="mb-10 text-center">
        <p className="font-display text-xl font-bold tracking-[0.15em] text-[var(--foreground)]">
          PLAYCE
        </p>
      </div>
      <div className="h-64 w-full max-w-sm animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--background)] px-4">
      <Suspense fallback={<AuthFallback />}>
        <AuthScreen />
      </Suspense>
    </div>
  );
}
