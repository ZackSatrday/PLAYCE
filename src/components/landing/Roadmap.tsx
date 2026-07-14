export function Roadmap() {
  const roadmapItems = [
    "Search inside playlists",
    "Video notes",
    "Smart resume context",
    "Playback speed memory",
    "Watch streaks",
    "PWA install",
    "Keyboard shortcuts",
    "Hindi & Hinglish summaries"
  ];

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-24">
      <h2 className="text-xl font-display font-bold text-[#F5F5F5] mb-6 text-center md:text-left">
        What's coming
      </h2>
      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
        {roadmapItems.map((item, i) => (
          <div 
            key={i} 
            className="border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors rounded-full px-4 py-1.5 text-sm text-[#9CA3AF]"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
