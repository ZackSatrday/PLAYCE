'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { saveProgress } from "@/hooks/use-progress";

export type PlayerContextValue = {
  playerRef: MutableRefObject<any>;
  activeVideoId: string | null;
  activePlaylistId: string | null;
  setActiveVideoId: (id: string | null) => void;
  setActivePlaylistId: (id: string | null) => void;
  saveCurrentProgress: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<any>(null);
  const [activeVideoId, setActiveVideoIdState] = useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistIdState] = useState<string | null>(
    null,
  );

  const setActiveVideoId = useCallback((id: string | null) => {
    setActiveVideoIdState(id && id.length > 0 ? id : null);
  }, []);

  const setActivePlaylistId = useCallback((id: string | null) => {
    setActivePlaylistIdState(id && id.length > 0 ? id : null);
  }, []);

  const saveCurrentProgress = useCallback(async () => {
    const t = playerRef.current?.getCurrentTime?.() ?? 0;
    if (activeVideoId && activePlaylistId && t > 5) {
      await saveProgress(activePlaylistId, activeVideoId, Math.floor(t));
    }
  }, [activeVideoId, activePlaylistId]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      playerRef,
      activeVideoId,
      activePlaylistId,
      setActiveVideoId,
      setActivePlaylistId,
      saveCurrentProgress,
    }),
    [
      activePlaylistId,
      activeVideoId,
      saveCurrentProgress,
      setActivePlaylistId,
      setActiveVideoId,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
