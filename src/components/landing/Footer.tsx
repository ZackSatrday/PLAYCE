import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 mt-auto">
      <div className="max-w-[720px] mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-[#6B7280] text-sm">
          Built by Som K.
        </div>
        <Link 
          href="/login" 
          className="text-accent text-sm hover:underline font-medium transition"
        >
          Sign in →
        </Link>
      </div>
    </footer>
  );
}
