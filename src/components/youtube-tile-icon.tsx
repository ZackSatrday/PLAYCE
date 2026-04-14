/**
 * Black & white “YouTube-style” tile: rounded rectangle + play chevron (no brand red).
 */
export function YoutubeTileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="41"
        rx="8"
        fill="white"
        stroke="#0f172a"
        strokeWidth="2"
      />
      <path
        d="M27 14L27 30L41 22L27 14Z"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
