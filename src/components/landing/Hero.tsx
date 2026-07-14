import Link from "next/link";

export function Hero() {
  return (
    <section className="px-4 pt-20 pb-16 text-center max-w-[720px] mx-auto flex flex-col items-center">
      <div className="bg-accent text-white text-xs px-3 py-1 rounded-full font-mono mb-6 inline-block">
        Now live in production
      </div>
      <h1 className="text-2xl md:text-4xl font-display font-bold text-[#F5F5F5] mb-6 tracking-tight leading-tight">
        The playlist tracker YouTube forgot to build.
      </h1>
      <p className="text-[#6B7280] max-w-lg mx-auto text-base mb-8">
        Keep track of your watched videos, pick up exactly where you left off, and never lose your place in a playlist again.
      </p>
      
      <div className="flex flex-col items-center mb-16">
        <Link
          href="/login"
          className="bg-accent text-white font-medium px-6 py-3 rounded-lg hover:opacity-90 transition shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_30%,transparent)] mb-4"
        >
          Get Started with Google
        </Link>
        <div className="text-xs text-[#6B7280] font-mono">
          Free. No install. No password.
        </div>
      </div>

      <div className="w-full bg-[#111111] border border-white/10 rounded-2xl p-6 md:p-8 text-left shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-20"></div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <div>
            <h3 className="text-[#F5F5F5] font-medium text-lg truncate pr-4">Ultimate Next.js 14 Course (App Router)</h3>
            <p className="text-[#6B7280] text-sm">Codevolution</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-accent h-full w-3/5 rounded-full relative">
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 blur-sm rounded-full"></div>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-mono text-[#6B7280]">
            <span>Resume at 12:34</span>
            <span>Video 7 of 24</span>
          </div>
        </div>
      </div>
    </section>
  );
}
