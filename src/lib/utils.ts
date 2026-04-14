import type { User } from "@supabase/supabase-js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortUsernameFromEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "User";
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return "User";
  return local.length > 14 ? `${local.slice(0, 14)}…` : local;
}

export function initialsFromEmail(email: string | null | undefined): string {
  if (!email?.trim()) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const compact = local.replace(/[^a-zA-Z0-9]/g, "");
  return compact.slice(0, 2).toUpperCase() || "?";
}

/** Navbar label: saved username, or short email local part. */
export function displayNameFromUser(user: User | null): string {
  if (!user) return "User";
  const raw = user.user_metadata?.username;
  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();
    return t.length > 20 ? `${t.slice(0, 20)}…` : t;
  }
  return shortUsernameFromEmail(user.email);
}

export function avatarInitialsFromUser(user: User | null): string {
  if (!user) return "?";
  const raw = user.user_metadata?.username;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().slice(0, 2).toUpperCase();
  }
  return initialsFromEmail(user.email);
}

/** 3–24 chars: letters, numbers, underscore, hyphen */
export function isValidPublicUsername(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 3 || s.length > 24) return false;
  return /^[a-zA-Z0-9_-]+$/.test(s);
}
