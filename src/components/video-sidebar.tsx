"use client";

import { cn } from "@/lib/utils";
import type { Video } from "@/types";

export type VideoProgressHint = {
  completed: boolean;
};

type VideoSidebarProps = {
  playlistLabel: string;
  videos: Video[];
  activeYtId: string;
  onSelect: (ytVideoId: string) => void;
  progressByVideoId: Record<string, VideoProgressHint | undefined>;
};

export function VideoSidebar({
  playlistLabel,
  videos,
  activeYtId,
  onSelect,
  progressByVideoId,
}: VideoSidebarProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-display text-xs font-bold tracking-[0.12em] text-[var(--foreground)]">
          UP NEXT
        </h2>
        <p className="mt-0.5 line-clamp-2 font-mono text-[10px] text-[var(--muted)]">
          {playlistLabel}
        </p>
      </div>
      <ol className="max-h-[min(70vh,520px)] divide-y divide-[var(--border)] overflow-y-auto">
        {videos.map((v, i) => {
          const isActive = v.yt_video_id === activeYtId;
          const hint = progressByVideoId[v.yt_video_id];
          const done = Boolean(hint?.completed);

          return (
            <li key={v.yt_video_id}>
              <button
                type="button"
                onClick={() => onSelect(v.yt_video_id)}
                className={cn(
                  "flex w-full gap-3 px-4 py-3 text-left text-sm transition",
                  isActive
                    ? "bg-[var(--accent-soft)]"
                    : "hover:bg-[var(--hover-bg)]",
                )}
              >
                <span className="tabular-nums text-[var(--muted-2)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-medium text-[var(--foreground)]">
                    {v.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
                    <span>{v.duration}</span>
                    {done ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Done
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
