import type { ReactNode } from "react";
import Link from "next/link";
import {
  SettingsAppearanceThemes,
  SettingsBackgroundSync,
  SettingsPurgeAllData,
} from "@/components/settings/settings-client-blocks";

export default function SettingsPage() {
  return (
    <div className="min-h-full pb-12 pt-8 text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <header className="mb-10">
          <h1 className="font-display text-3xl font-bold tracking-[0.06em] md:text-4xl">
            SETTINGS
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            System configuration and account management.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SettingsCard title="Appearance" icon={<PaletteIcon className="size-5" />}>
              <SettingsAppearanceThemes />
            </SettingsCard>

            <SettingsCard
              title="Account"
              icon={<UserIcon className="size-5" />}
              action={
                <span className="rounded-md border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
                  ACTIVE
                </span>
              }
            >
              <div className="space-y-1 border-b border-[var(--border)] pb-5">
                <p className="font-display text-[10px] font-bold tracking-[0.18em] text-[var(--muted)]">
                  EMAIL ADDRESS
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--foreground)]">
                    alex.design@playce.io
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    CHANGE
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-xl border-2 border-[var(--accent)] bg-transparent py-3 text-sm font-semibold tracking-wide text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
              >
                SIGN OUT
              </button>
            </SettingsCard>

            <SettingsCard title="Data Management" icon={<DatabaseIcon className="size-5" />}>
              <SettingsBackgroundSync />
              <div className="pt-5">
                <SettingsPurgeAllData />
              </div>
            </SettingsCard>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <h2 className="font-display text-[11px] font-bold tracking-[0.22em] text-[var(--muted)]">
                SYSTEM INFORMATION
              </h2>
              <dl className="mt-5 space-y-4 text-xs">
                <div>
                  <dt className="text-[var(--muted)]">Client Version</dt>
                  <dd className="mt-0.5 font-mono text-[var(--foreground)]">1.0.4-stable</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Environment</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-[var(--foreground)]">
                    PRODUCTION
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Local Storage</dt>
                  <dd className="mt-0.5 font-mono text-[var(--foreground)]">14.2 MB / 50 MB</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Sync Status</dt>
                  <dd className="mt-0.5 flex items-center gap-2 font-mono text-[var(--foreground)]">
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                    OPTIMAL
                  </dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <div className="flex items-center justify-between font-display text-[10px] font-bold tracking-[0.15em] text-[var(--muted)]">
                  <span>TOTAL DATA CAP</span>
                  <span className="text-[var(--foreground)]">28% USED</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--progress-track)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: "28%" }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--accent)] bg-[var(--accent)] p-5 text-white shadow-sm">
              <h2 className="font-display text-lg font-bold tracking-wide">
                Need assistance?
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-white/90">
                Refer to technical documentation for configuration, API limits, and
                troubleshooting workflows.
              </p>
              <Link
                href="#"
                className="mt-5 inline-flex items-center gap-2 text-xs font-bold tracking-wide underline decoration-2 underline-offset-4"
              >
                VIEW DOCUMENTATION
                <ExternalIcon className="size-3.5" />
              </Link>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <QrIcon className="size-5 text-[var(--foreground)]" />
                <h2 className="font-display text-sm font-bold tracking-[0.15em]">
                  MOBILE SYNC
                </h2>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Pair this workspace with the mobile client.
              </p>
              <div className="mt-4 flex aspect-square max-h-48 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--input-bg)] font-mono text-[10px] text-[var(--muted)]">
                QR / PAIRING
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <span className="text-[var(--foreground)]">{icon}</span>
          <h2 className="font-display text-lg font-bold tracking-wide">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
      <path d="M12 8v4M9 12h6" strokeLinecap="round" />
      <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
    </svg>
  );
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2M18 18h2v2h-2" />
    </svg>
  );
}
