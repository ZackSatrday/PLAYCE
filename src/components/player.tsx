"use client";

import { useCallback, useEffect, useState } from "react";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { MutableRefObject } from "react";

type PlayerProps = {
  playlistDbId: string;
  ytVideoId: string;
  title: string;
  onVideoCompleted?: () => void;
  onVideoWatched?: (videoId: string) => void;
  resumeTimestampRef?: MutableRefObject<number>;
};

export function Player({
  playlistDbId,
  ytVideoId,
  title,
  onVideoCompleted,
  onVideoWatched,
  resumeTimestampRef,
}: PlayerProps) {
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setDuration(0);
    setPositionSeconds(0);
  }, [ytVideoId]);

  const onDurationSeconds = useCallback((d: number) => {
    if (d > 0) setDuration(d);
  }, []);

  const onTime = useCallback(
    (t: number) => {
      setPositionSeconds(t);
    },
    [],
  );

  const onEnded = useCallback(() => {
    setPositionSeconds(0);
    onVideoCompleted?.();
    onVideoWatched?.(ytVideoId);
  }, [onVideoCompleted, onVideoWatched, ytVideoId]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-slate-900 shadow-lg">
      <div className="relative">
        <YoutubeEmbed
          playlistDbId={playlistDbId}
          videoId={ytVideoId}
          resumeTimestampRef={resumeTimestampRef}
          onDurationSeconds={onDurationSeconds}
          onTime={onTime}
          onEnded={onEnded}
        />
      </div>
      <div className="space-y-3 border-t border-[var(--player-bar-border)] bg-[var(--player-bar-bg)] px-4 py-3">
        <p className="truncate text-sm font-medium text-slate-200">{title}</p>
        <div className="flex items-center justify-between gap-2 font-mono text-xs text-slate-400">
          <span>
            {Math.floor(positionSeconds / 60)}:
            {Math.floor(positionSeconds % 60)
              .toString()
              .padStart(2, "0")}
          </span>
          <span>
            {duration > 0 ? (
              <>
                {Math.floor(duration / 60)}:
                {Math.floor(duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </>
            ) : (
              "—:—"
            )}
          </span>
        </div>
        {duration > 0 ? (
          <ProgressBar
            value={Math.min(positionSeconds, duration)}
            max={duration}
            label="Playback progress"
          />
        ) : (
          <div
            className="h-1.5 w-full rounded-full bg-slate-700 dark:bg-slate-600"
            role="status"
            aria-label="Duration loading"
          />
        )}
      </div>
    </div>
  );
}
