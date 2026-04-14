"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Avatar } from "@/components/ui/avatar";
import { useTheme } from "@/contexts/theme-context";
import { createClient } from "@/lib/supabase/client";
import { avatarInitialsFromUser, cn, displayNameFromUser } from "@/lib/utils";

const PROFILE_CHARACTER_SRC = "/profile-character.svg";

export function Topbar() {
  const { resolved, toggleColorMode } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const label = displayNameFromUser(user);
  const initials = avatarInitialsFromUser(user);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm dark:bg-[var(--surface)]/90">
      <div className="flex h-[60px] items-center gap-6 px-6">
        <div className="flex flex-1 justify-center">
          <label className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]">
              <SearchIcon className="size-4" />
            </span>
            <input
              type="search"
              placeholder="Search playlists..."
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] py-2 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] outline-none ring-[var(--accent)] focus:border-transparent focus:ring-2"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => toggleColorMode()}
            className={cn(
              "rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]",
            )}
            aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolved === "dark" ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
            aria-label="Notifications"
          >
            <BellIcon className="size-5" />
          </button>
          
          <div className="flex min-w-0 items-center gap-3 border-l border-[var(--border)] pl-4">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {label}
              </p>
            </div>
            <Avatar
              src={PROFILE_CHARACTER_SRC}
              alt={label}
              fallback={initials}
              className="!size-10 shrink-0 rounded-md"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2z" strokeLinejoin="round" />
      <path d="M6 8a6 6 0 1112 0c0 7 3 7 3 7H3s3 0 3-7" strokeLinejoin="round" />
    </svg>
  );
}

