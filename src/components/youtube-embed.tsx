"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  loadYoutubeIframeApi,
  type YtPlayerInstance,
} from "@/lib/youtube-iframe-api";
import { usePlayer } from "@/context/player-context";
import { saveProgress } from "@/hooks/use-progress";

type YoutubeEmbedProps = {
  playlistDbId: string;
  videoId: string;
  resumeTimestampRef?: MutableRefObject<number>;
  /** Called whenever the player reports a valid video length (may repeat; not only first load). */
  onDurationSeconds: (durationSeconds: number) => void;
  /** Called ~every 1.5s while playing */
  onTime: (seconds: number) => void;
  onEnded: () => void;
};

export function YoutubeEmbed({
  playlistDbId,
  videoId,
  resumeTimestampRef,
  onDurationSeconds,
  onTime,
  onEnded,
}: YoutubeEmbedProps) {
  const { playerRef } = usePlayer();
  const hostRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onDurationRef = useRef(onDurationSeconds);
  const onTimeRef = useRef(onTime);
  const onEndedRef = useRef(onEnded);

  const isPlayerReady = useRef(false);
  const activeVideoRef = useRef(videoId);
  const lastLoadedVideoIdRef = useRef<string | null>(null);

  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    onDurationRef.current = onDurationSeconds;
    onTimeRef.current = onTime;
    onEndedRef.current = onEnded;
  }, [onDurationSeconds, onTime, onEnded]);

  const emitDuration = (p: YtPlayerInstance) => {
    try {
      const d = p.getDuration?.() ?? 0;
      if (Number.isFinite(d) && d > 0) {
        onDurationRef.current(d);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    activeVideoRef.current = videoId;
  }, [videoId]);

  /** Script / API — once */
  useEffect(() => {
    let cancelled = false;
    const w = window as Window & { YT?: { Player: unknown } };
    if (w.YT?.Player) {
      setIsApiReady(true);
      return;
    }
    void loadYoutubeIframeApi().then(() => {
      if (!cancelled) setIsApiReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Create the player exactly once */
  useEffect(() => {
    if (!isApiReady || !hostRef.current || isPlayerReady.current) return;

    const w = window as unknown as Window & {
      YT: {
        Player: new (
          el: HTMLElement,
          opts: {
            videoId: string;
            playerVars?: { start?: number };
            events?: {
              onReady?: (e: { target: YtPlayerInstance }) => void;
              onStateChange?: (e: {
                data: number;
                target: YtPlayerInstance;
              }) => void;
            };
          },
        ) => YtPlayerInstance;
        PlayerState: { ENDED: number };
      };
    };

    const initialVid = activeVideoRef.current;

    const player = new w.YT.Player(hostRef.current, {
      videoId: initialVid,
      playerVars: {
        start: 0,
      },
      events: {
        onReady: (e) => {
          const resumeAt = resumeTimestampRef?.current ?? 0;
          if (resumeTimestampRef && resumeAt > 0) {
            try {
              e.target.seekTo(resumeAt, true);
            } catch {
              /* ignore */
            }
            resumeTimestampRef.current = 0;
          }
          emitDuration(e.target);
        },
        onStateChange: (e) => {
          emitDuration(e.target);
          if (e.data === 0) {
            const totalSeconds = Math.floor(e.target.getDuration?.() ?? 0);
            void saveProgress(
              playlistDbId,
              activeVideoRef.current,
              totalSeconds,
              true,
            );
            onEndedRef.current();
          } else if (e.data === 2) {
            const t = e.target.getCurrentTime?.() ?? 0;
            void saveProgress(
              playlistDbId,
              activeVideoRef.current,
              Math.floor(t),
            );
          }
        },
      },
    });

    playerRef.current = player;
    isPlayerReady.current = true;
    lastLoadedVideoIdRef.current = initialVid;

    tickRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      try {
        emitDuration(p);
        onTimeRef.current(p.getCurrentTime());
      } catch {
        /* ignore */
      }
    }, 1500);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      const p = playerRef.current;
      try {
        p?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      isPlayerReady.current = false;
      lastLoadedVideoIdRef.current = null;
    };
  }, [isApiReady]);

  /** Switch video without destroying the player */
  useEffect(() => {
    const p = playerRef.current;
    if (!isPlayerReady.current || !p?.loadVideoById) return;

    const vid = activeVideoRef.current;
    if (vid === lastLoadedVideoIdRef.current) return;

    const startSeconds = Math.max(0, resumeTimestampRef?.current ?? 0);
    try {
      p.loadVideoById({ videoId: vid, startSeconds });
    } catch {
      /* ignore */
    }
    if (resumeTimestampRef) {
      resumeTimestampRef.current = 0;
    }
    lastLoadedVideoIdRef.current = vid;
  }, [videoId, resumeTimestampRef]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const t = playerRef.current?.getCurrentTime?.() ?? 0;
      if (t > 5) {
        void saveProgress(
          playlistDbId,
          activeVideoRef.current,
          Math.floor(t),
        );
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [playlistDbId]);

  return (
    <div className="relative aspect-video w-full bg-slate-950">
      <div
        id="yt-player"
        ref={hostRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
