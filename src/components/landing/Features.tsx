export function Features() {
  const features = [
    {
      title: "Cross-device sync",
      description: "Start on your laptop, finish on your phone. Playce syncs your progress everywhere.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
          <rect x="9" y="9" width="14" height="14" rx="2" ry="2"></rect>
        </svg>
      )
    },
    {
      title: "Automatic bookmarks",
      description: "Never lose your exact timestamp again. We save it automatically as you watch.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      title: "Playlist progression",
      description: "See your completion percentage for entire courses and video series at a glance.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      )
    },
    {
      title: "Distraction-free",
      description: "No recommendations algorithm trying to pull you away from what you actually want to watch.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
          <line x1="3" y1="3" x2="21" y2="21" className="stroke-accent"></line>
        </svg>
      )
    }
  ];

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-16 pt-8">
      <h2 className="text-xl md:text-2xl font-display font-bold text-[#F5F5F5] mb-8 text-center md:text-left">
        Everything YouTube playlists are missing
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, i) => (
          <div key={i} className="bg-[#111111] border border-accent/20 rounded-xl p-5 hover:border-accent/40 transition">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="font-display font-bold text-[#F5F5F5] mb-2">{feature.title}</h3>
            <p className="text-[#6B7280] text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
