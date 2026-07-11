"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Renders a button that signs the user out globally and navigates to the login page.
 *
 * @returns A logout button that displays progress while signing out.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void logout()}
      className="w-full h-10 rounded-lg border border-[var(--border)] text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-60 flex items-center justify-center"
    >
      {pending ? "Signing out…" : "Logout"}
    </button>
  );
}
