import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-sm bg-black/60 border-b border-white/5">
      <div className="max-w-[720px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-lg font-bold tracking-[0.12em] text-[var(--foreground)]">
          PLAYCE
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium border border-white/20 text-[#F5F5F5] px-4 py-2 rounded-lg hover:bg-white/5 transition"
        >
          Sign in with Google
        </Link>
      </div>
    </nav>
  );
}
