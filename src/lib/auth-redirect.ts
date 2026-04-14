/** OAuth / magic-link return URL for Supabase (client-only). */
export function getAuthCallbackUrl(next: string) {
  if (typeof window === "undefined") return "";
  const n = next.startsWith("/") ? next : `/${next}`;
  return `${window.location.origin}/callback?next=${encodeURIComponent(n)}`;
}
