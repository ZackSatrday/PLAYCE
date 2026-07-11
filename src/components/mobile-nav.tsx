"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, List, Settings } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/context/player-context";
import { usePlaylists } from "@/hooks/use-playlists";
import { displayNameFromUser, avatarInitialsFromUser } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Renders a mobile navigation drawer with route-aware navigation, playlist progress, and account controls.
 */
export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { saveCurrentProgress } = usePlayer();
  const { cards } = usePlaylists();

  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close the drawer automatically on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) {
    return null;
  }

  const username = displayNameFromUser(user);
  const initials = avatarInitialsFromUser(user);

  async function handleNavClick(href: string) {
    await saveCurrentProgress();
    router.push(href);
    router.refresh();
    setIsOpen(false);
  }



  return (
    <>
      {/* 1. Hamburger button FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-50 md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-transform duration-200 active:scale-95 focus:outline-none"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {/* 2. Full-screen overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. Slide-in drawer panel from the left */}
      <div
        className="fixed top-0 left-0 h-full w-[260px] z-50 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-300 md:hidden"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        {/* TOP SECTION — logo row */}
        <div className="h-13 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-[0.12em] text-neutral-900 dark:text-white">
            PLAYCE
          </span>
        </div>

        {/* NAV SECTION */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1">
            {/* Dashboard Link */}
            <button
              type="button"
              onClick={() => void handleNavClick("/dashboard")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <LayoutDashboard className="size-5 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Playlists Link */}
            <button
              type="button"
              onClick={() => void handleNavClick("/dashboard")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                pathname.startsWith("/playlist")
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <List className="size-5 shrink-0" />
              <span>Playlists</span>
            </button>

            {/* Settings Link */}
            <button
              type="button"
              onClick={() => void handleNavClick("/settings")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                pathname === "/settings"
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Settings className="size-5 shrink-0" />
              <span>Settings</span>
            </button>
          </div>

          {/* DIVIDER + "Playlists" label */}
          <div className="pt-2">
            <div className="border-t border-neutral-100 dark:border-neutral-800 my-2" />
            <p className="px-3 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
              Playlists
            </p>
          </div>

          {/* Playlists list */}
          <div className="space-y-1">
            {cards.map((playlist) => {
              const active = pathname === `/playlist/${playlist.id}`;
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => void handleNavClick(`/playlist/${playlist.id}`)}
                  className={`w-full text-left rounded-lg p-2.5 transition-colors flex flex-col gap-1.5 ${
                    active
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <span className="text-sm font-semibold truncate block">
                    {playlist.title}
                  </span>
                  <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${playlist.progressPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
            {cards.length === 0 && (
              <p className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500 italic">
                No saved playlists
              </p>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION — user info + logout */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-sm uppercase">
              {initials}
            </div>
            <span className="truncate text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {username}
            </span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
