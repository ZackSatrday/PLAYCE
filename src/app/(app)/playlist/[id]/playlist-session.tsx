"use client";

import { useEffect } from "react";
import { usePlayer } from "@/context/player-context";

/** Binds route playlist id to player context (server page cannot use hooks). */
export function PlaylistSession({ playlistId }: { playlistId: string }) {
  const { setActivePlaylistId, setActiveVideoId } = usePlayer();

  useEffect(() => {
    setActivePlaylistId(playlistId);
    return () => {
      setActivePlaylistId(null);
      setActiveVideoId(null);
    };
  }, [playlistId, setActivePlaylistId, setActiveVideoId]);

  return null;
}
