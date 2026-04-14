"use client";

import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { usePlayer } from "@/context/player-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGridIcon },
  { href: "/dashboard", label: "Playlists", icon: ListIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

type AppSidebarProps = {
  pathname: string;
};

function isActive(pathname: string, label: string) {
  if (label === "Dashboard") return pathname === "/dashboard";
  if (label === "Playlists") return pathname.startsWith("/playlist");
  if (label === "Settings") return pathname === "/settings";
  return false;
}

export function AppSidebar({ pathname }: AppSidebarProps) {
  const router = useRouter();
  const { saveCurrentProgress } = usePlayer();

  async function handleNavClick(href: string) {
    await saveCurrentProgress();
    router.push(href);
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-dvh w-[220px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-6">
      <div className="px-3 pb-8">
        <p className="font-display text-lg font-bold tracking-[0.12em] text-[var(--foreground)]">
          PLAYCE
        </p>
        <p className="mt-1 font-mono text-[10px] font-medium tracking-wide text-[var(--muted)]">
          V1.0.4-STABLE
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {nav.map((item) => {
          const active = isActive(pathname, item.label);
          const className = cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            active
              ? "bg-[var(--sidebar-active)] text-white"
              : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]",
          );
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => void handleNavClick(item.href)}
              className={className}
            >
              <item.icon
                className={cn("size-5 shrink-0", active ? "text-white" : "text-current")}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-6">
        <div className="flex flex-col gap-2 px-1 text-sm text-[var(--muted)]">
          <button
            type="button"
            className="text-left hover:text-[var(--foreground)]"
          >
            Support
          </button>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

function LayoutGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}
