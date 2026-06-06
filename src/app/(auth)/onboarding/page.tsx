import { Suspense } from "react";
import { OnboardingForm } from "./onboarding-form";

function OnboardingFallback() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="mb-10 text-center">
        <p className="font-display text-xl font-bold tracking-[0.15em] text-[var(--foreground)]">
          PLAYCE
        </p>
      </div>
      <div className="h-48 w-full max-w-sm animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--background)] px-4">
      <Suspense fallback={<OnboardingFallback />}>
        <OnboardingForm />
      </Suspense>
    </div>
  );
}
