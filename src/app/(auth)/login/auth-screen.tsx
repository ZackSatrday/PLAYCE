"use client";

import { GoogleIcon } from "@/components/auth/google-icon";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";
import { isValidPublicUsername } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

function safeNextParam(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMode = searchParams.get("register") === "1";
  const nextPath = safeNextParam(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loginHref = nextPath !== "/dashboard" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  const registerHref =
    nextPath !== "/dashboard"
      ? `/login?register=1&next=${encodeURIComponent(nextPath)}`
      : "/login?register=1";

  async function signInWithGoogle() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl(nextPath) },
      });
      if (oErr) setError(oErr.message);
    } finally {
      setLoading(false);
    }
  }

  const onSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setInfo(null);
      setLoading(true);
      try {
        const supabase = createClient();
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
        router.push(nextPath);
        router.refresh();
      } finally {
        setLoading(false);
      }
    },
    [email, password, nextPath, router],
  );

  const onRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setInfo(null);
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
        const { data, error: signErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthCallbackUrl(nextPath),
            data: { username: handle },
          },
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
        if (data.session) {
          setInfo("Account created. Redirecting…");
          window.location.assign(nextPath);
          return;
        }
        setInfo(
          "Check your email to confirm your account, then sign in here.",
        );
      } finally {
        setLoading(false);
      }
    },
    [email, password, username, nextPath],
  );

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
        <div className="flex rounded-lg border border-[var(--border)] bg-[var(--input-bg)] p-1 text-sm font-medium">
          <Link
            href={loginHref}
            className={`flex-1 rounded-md py-2 text-center transition ${
              !registerMode
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Sign in
          </Link>
          <Link
            href={registerHref}
            className={`flex-1 rounded-md py-2 text-center transition ${
              registerMode
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Register
          </Link>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="font-display text-xl font-bold tracking-wide">
            {registerMode ? "CREATE ACCOUNT" : "SIGN IN"}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {registerMode
              ? "Sign up with email or Google (via Supabase)."
              : "Sign in with email or Google (via Supabase)."}
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-center text-sm text-[var(--foreground)]">
            {info}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={registerMode ? onRegister : onSignIn}>
          {registerMode ? (
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
          ) : null}
          <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete={registerMode ? "email" : "email"}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] focus:border-transparent focus:ring-2"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete={registerMode ? "new-password" : "current-password"}
              required
              minLength={registerMode ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] focus:border-transparent focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[var(--accent)] text-sm font-semibold tracking-wide text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : registerMode
                ? "Create account"
                : "Continue"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--surface)] px-2 text-[var(--muted)]">
              Or
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void signInWithGoogle()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </>
  );
}
