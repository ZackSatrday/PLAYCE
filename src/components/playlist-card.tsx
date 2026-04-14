"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useState, type MouseEvent } from "react";
import { YoutubeTileIcon } from "@/components/youtube-tile-icon";
import { cn } from "@/lib/utils";
import type { PlaylistCardModel } from "@/types";

type PlaylistCardProps = {
  playlist: PlaylistCardModel;
  onDelete?: (playlistId: string) => Promise<void>;
};

export function PlaylistCard({ playlist, onDelete }: PlaylistCardProps) {
  const inProgress = playlist.status === "in_progress";
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (!onDelete || isDeleting) return;
      setIsDeleting(true);
      try {
        await onDelete(playlist.id);
      } finally {
        setIsDeleting(false);
      }
    },
    [isDeleting, onDelete, playlist.id],
  );

  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:hover:border-slate-600">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <span
          className={cn(
            "rounded px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.14em]",
            inProgress
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "bg-[var(--progress-track)] text-[var(--muted)]",
          )}
        >
          {inProgress ? "IN PROGRESS" : "NOT STARTED"}
        </span>
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          aria-label="Delete playlist"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#E24B4A] disabled:cursor-not-allowed disabled:opacity-100"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="mb-4 flex gap-3 pr-16">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--input-bg)] ring-1 ring-[var(--border)]">
          {playlist.thumbnail ? (
            <Image
              src={playlist.thumbnail}
              alt=""
              width={52}
              height={52}
              className="h-full w-full object-cover"
            />
          ) : (
            <YoutubeTileIcon className="h-9 w-[52px]" />
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[15px] font-bold leading-snug tracking-tight text-[var(--foreground)] group-hover:underline">
            {playlist.title}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {playlist.source} · {playlist.totalVideos} videos
          </p>
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--progress-track)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${playlist.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span className="font-medium tracking-wide">
            {playlist.watchedCount} / {playlist.totalVideos} WATCHED
          </span>
          <span className="tabular-nums font-semibold text-[var(--foreground)]">
            {playlist.progressPercent}%
          </span>
        </div>
      </div>
    </article>
  );
}

export function PlaylistCardLink({ playlist, onDelete }: PlaylistCardProps) {
  return (
    <Link href={`/playlist/${playlist.id}`} className="block h-full">
      <PlaylistCard playlist={playlist} onDelete={onDelete} />
    </Link>
  );
}
