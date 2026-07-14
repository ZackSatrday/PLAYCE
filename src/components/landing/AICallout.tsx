export function AICallout() {
  const chapters = [
    { title: "Introduction & architecture overview", time: "00:00" },
    { title: "Setting up the database schema", time: "12:45" },
    { title: "Implementing OAuth with Supabase", time: "28:10" }
  ];

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-16">
      <div className="bg-[#0F1729] border border-accent/40 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_30px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row gap-8 relative z-10">
          <div className="flex-1">
            <div className="inline-block border border-accent/30 text-accent bg-accent/10 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-mono mb-4">
              Coming soon
            </div>
            <h2 className="text-xl font-display font-bold text-[#F5F5F5] mb-3">
              AI-powered video summaries
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-0">
              Skip the fluff. We&apos;re building AI that automatically generates chapter markers, extracts key concepts, and summarizes long tutorials so you can find exactly what you need in seconds.
            </p>
          </div>
          
          <div className="flex-1 bg-black/40 border border-white/5 rounded-lg p-5 self-center w-full">
            <div className="space-y-3">
              {chapters.map((chapter, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-accent/70 shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_80%,transparent)]"></div>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-[#9CA3AF] leading-tight">
                      {chapter.title}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-[#6B7280]">
                    {chapter.time}
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3 opacity-40 pt-1">
                <div className="mt-1 w-2 h-2 rounded-full bg-white/20"></div>
                <div className="w-full h-3 bg-white/10 rounded mt-0.5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
