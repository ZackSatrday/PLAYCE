/** Server-only: uses YOUTUBE_API_KEY */

const API = "https://www.googleapis.com/youtube/v3";

function requireKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }
  return key;
}

/** Extract playlist id from a URL or raw id string. */
export function extractYoutubePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromQuery = trimmed.match(/[&?]list=([^&]+)/);
  if (fromQuery?.[1]) return decodeURIComponent(fromQuery[1]);
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length >= 13) {
    return trimmed;
  }
  return null;
}

function parseIso8601Duration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "0:00";
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  if (h > 0) {
    return `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${min}:${String(s).padStart(2, "0")}`;
}

export type YoutubePlaylistMeta = {
  yt_playlist_id: string;
  title: string;
  creator: string | null;
  thumbnail: string | null;
  total_videos: number;
};

export async function fetchYoutubePlaylistMeta(
  playlistId: string,
): Promise<YoutubePlaylistMeta> {
  const key = requireKey();
  const url = new URL(`${API}/playlists`);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube playlists.list failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; channelTitle?: string; thumbnails?: { high?: { url?: string } } };
      contentDetails?: { itemCount?: number };
    }>;
  };
  const item = data.items?.[0];
  if (!item) {
    throw new Error("Playlist not found or is private");
  }
  const thumb = item.snippet?.thumbnails?.high?.url ?? null;
  return {
    yt_playlist_id: item.id,
    title: item.snippet?.title ?? "Untitled playlist",
    creator: item.snippet?.channelTitle ?? null,
    thumbnail: thumb,
    total_videos: item.contentDetails?.itemCount ?? 0,
  };
}

export type YoutubePlaylistVideo = {
  yt_video_id: string;
  title: string;
  thumbnail: string;
  durationLabel: string;
  position: number;
};

async function fetchPlaylistItemIds(playlistId: string): Promise<string[]> {
  const key = requireKey();
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${API}/playlistItems`);
    url.searchParams.set("part", "contentDetails,snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", key);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube playlistItems.list failed: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      nextPageToken?: string;
      items?: Array<{ contentDetails?: { videoId?: string } }>;
    };
    for (const row of data.items ?? []) {
      const vid = row.contentDetails?.videoId;
      if (vid) ids.push(vid);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return ids;
}

async function fetchVideoDetails(
  videoIds: string[],
): Promise<
  Map<
    string,
    {
      title: string;
      thumbnail: string;
      durationLabel: string;
    }
  >
> {
  const key = requireKey();
  const map = new Map<
    string,
    { title: string; thumbnail: string; durationLabel: string }
  >();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL(`${API}/videos`);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube videos.list failed: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet?: { title?: string; thumbnails?: { medium?: { url?: string } } };
        contentDetails?: { duration?: string };
      }>;
    };
    for (const v of data.items ?? []) {
      const dur = v.contentDetails?.duration
        ? parseIso8601Duration(v.contentDetails.duration)
        : "0:00";
      map.set(v.id, {
        title: v.snippet?.title ?? "Video",
        thumbnail: v.snippet?.thumbnails?.medium?.url ?? "",
        durationLabel: dur,
      });
    }
  }

  return map;
}

/** Ordered videos for a playlist (for player page). */
export async function fetchYoutubePlaylistVideos(
  playlistId: string,
): Promise<YoutubePlaylistVideo[]> {
  const ids = await fetchPlaylistItemIds(playlistId);
  if (ids.length === 0) return [];

  const details = await fetchVideoDetails(ids);
  return ids.map((yt_video_id, position) => {
    const d = details.get(yt_video_id);
    return {
      yt_video_id,
      title: d?.title ?? "Video",
      thumbnail: d?.thumbnail ?? "",
      durationLabel: d?.durationLabel ?? "0:00",
      position,
    };
  });
}
