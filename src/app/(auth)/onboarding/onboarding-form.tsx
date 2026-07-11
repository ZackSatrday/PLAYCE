"use client";

import { createClient } from "@/lib/supabase/client";
import {
  isValidPublicUsername,
  suggestedUsernameFromEmail,
} from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function safeNextParam(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/**
 * Renders the onboarding form for authenticated users to choose a public username.
 */
export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextParam(searchParams.get("next"));

  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function loadSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          router.replace("/login");
          return;
        }

        const suggestion = suggestedUsernameFromEmail(user.email);
        if (suggestion) setUsername(suggestion);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [mounted, router]);

  const onSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const handle = username.trim();
        if (!isValidPublicUsername(handle)) {
          setError(
            "Username must be 3–24 characters (letters, numbers, _ or -).",
          );
          return;
        }

        const supabase = createClient();
        const { error: updateErr } = await supabase.auth.updateUser({
          data: { username: handle },
        });
        if (updateErr) {
          setError(updateErr.message);
          return;
        }

        router.push(nextPath);
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [username, nextPath, router],
  );

  if (!mounted || checkingSession) {
    return (
      <div className="h-48 w-full max-w-sm animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
    );
  }

  return (
    <>
      <div className="mb-10 text-center">
        <p className="font-display text-xl font-bold tracking-[0.15em] text-[var(--foreground)]">
          PLAYCE
        </p>
        <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
          V1.0.4-STABLE
        </p>
      </div>
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-xl font-bold tracking-wide">
            CHOOSE USERNAME
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Pick a public handle for your profile.
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
            <span>Username</span>
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_-]{3,24}"
              title="3–24 characters: letters, numbers, underscore, hyphen"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] focus:border-transparent focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[var(--accent)] text-sm font-semibold tracking-wide text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Please wait…" : "Continue"}
          </button>
        </form>
      </div>
    </>
  );
}
