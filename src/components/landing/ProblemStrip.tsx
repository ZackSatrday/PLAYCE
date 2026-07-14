export function ProblemStrip() {
  return (
    <div className="w-full bg-[#111111] border-y border-white/5 py-10 mt-12 mb-16">
      <div className="max-w-[720px] mx-auto px-4 flex flex-col md:flex-row gap-8 justify-center items-center md:items-start text-center md:text-left">
        
        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="text-[#6B7280]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <span className="text-[#F5F5F5] font-medium text-sm">YouTube has no memory</span>
        </div>

        <div className="hidden md:block w-px bg-white/10 h-10 self-center"></div>

        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="text-[#6B7280]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <span className="text-[#F5F5F5] font-medium text-sm">Extensions break across devices</span>
        </div>

        <div className="hidden md:block w-px bg-white/10 h-10 self-center"></div>

        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="text-[#6B7280]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <span className="text-[#F5F5F5] font-medium text-sm">You always lose your place</span>
        </div>

      </div>
    </div>
  );
}
