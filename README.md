# Playce

> Save YouTube playlists and always resume from where you left off.  
> No more hunting for your last watched video.

License
Next.js
React
TypeScript
Supabase
Deployed on Vercel

---

## What is Playce?

YouTube has no native resume feature for playlists. You close a tab mid-video — your place is gone. Browser extensions help, but only in Chrome, only on one device.

**Playce** is a standalone web app that fixes this. Paste any YouTube playlist URL, and Playce becomes your personal learning player — auto-resuming the exact video and timestamp you left off, synced across every device.

---

## Preview

### Dashboard

Dashboard Preview

### Player View

Player Preview

---

## Features


| Feature                               | Status |
| ------------------------------------- | ------ |
| Email/password sign-in & registration | ✅ Done |
| Google OAuth sign-in                  | ✅ Done |
| Username on registration              | ✅ Done |
| Add playlist by URL                   | ✅ Done |
| Playlist dashboard with progress      | ✅ Done |
| Delete playlist with confirmation     | ✅ Done |
| Auto-resume last watched video        | ✅ Done |
| Embedded YouTube player (no redirect) | ✅ Done |
| Per-video timestamp resume            | ✅ Done |
| Video sidebar navigation              | ✅ Done |
| Watched video tracking                | ✅ Done |
| Cross-device progress sync            | ✅ Done |
| Save progress on tab close / nav      | ✅ Done |
| Light / dark / system theme           | ✅ Done |
| Settings — appearance & purge data    | ✅ Done |
| PlayerContext for global state        | ✅ Done |
| Playback speed memory                 | 🔜 V2  |
| Video notes per timestamp             | 🔜 V2  |
| PWA / home screen install             | 🔜 V2  |


---

## Tech Stack


| Layer          | Choice                                        |
| -------------- | --------------------------------------------- |
| Framework      | Next.js 16 (App Router)                       |
| UI             | React 19                                      |
| Language       | TypeScript                                    |
| Styling        | Tailwind CSS 4                                |
| Database       | Supabase (Postgres + RLS)                     |
| Auth           | Supabase Auth — email/password + Google OAuth |
| YouTube Data   | YouTube Data API v3                           |
| YouTube Player | YouTube IFrame API                            |
| State          | React hooks + Context                         |
| Deployment     | Vercel                                        |


---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── auth-code-error/page.tsx   # Invalid or expired auth link
│   │   ├── callback/route.ts          # OAuth / email-confirm callback
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── auth-screen.tsx        # Sign-in & register (email + Google)
│   │   └── register/page.tsx          # Redirects to /login?register=1
│   ├── (app)/
│   │   ├── layout.tsx                 # App shell — PlayerProvider
│   │   ├── app-layout-body.tsx        # Sidebar + topbar layout
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── dashboard-content.tsx
│   │   ├── playlist/[id]/
│   │   │   ├── page.tsx
│   │   │   ├── playlist-view.tsx
│   │   │   └── playlist-session.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── playlist/route.ts          # YouTube API proxy (fetch playlist)
│   │   ├── playlists/route.ts         # List / create playlists
│   │   └── user/purge/route.ts        # Delete all user data
│   ├── globals.css
│   ├── layout.tsx                     # Root layout + ThemeProvider
│   └── page.tsx                       # Redirect to dashboard or login
├── components/
│   ├── auth/                          # Google icon, logout button
│   ├── settings/                      # Theme picker, purge, sync blocks
│   ├── ui/                            # Avatar, badge, progress bar
│   ├── app-sidebar.tsx
│   ├── topbar.tsx
│   ├── playlist-card.tsx
│   ├── add-playlist-modal.tsx
│   ├── player.tsx
│   ├── video-sidebar.tsx
│   └── youtube-embed.tsx
├── context/
│   └── player-context.tsx             # Global player state
├── contexts/
│   └── theme-context.tsx              # Light / dark / system theme
├── hooks/
│   ├── use-playlists.ts               # Fetch + delete playlists
│   └── use-progress.ts                # Save + get video progress
├── lib/
│   ├── supabase/client.ts             # Browser Supabase client
│   ├── supabase/server.ts             # Server Supabase client
│   ├── auth-redirect.ts               # OAuth callback URL helper
│   ├── youtube.ts                     # YouTube Data API helpers
│   ├── youtube-iframe-api.ts            # IFrame player loader
│   └── utils.ts                       # cn(), playlist ID, username helpers
├── proxy.ts                           # Route protection (Next.js 16 proxy)
└── types/index.ts                     # Playlist, Progress types
```

---

## Database Schema

```sql
-- Playlists saved by each user
create table playlists (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete cascade,
  yt_playlist_id   text not null,
  title            text not null,
  creator          text,
  thumbnail        text,
  total_videos     int default 0,
  added_at         timestamptz default now()
);

-- Per-video watch progress
create table progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  playlist_id     uuid references playlists on delete cascade,
  video_id        text not null,
  timestamp_sec   int default 0,
  completed       boolean default false,
  updated_at      timestamptz default now(),
  unique(user_id, playlist_id, video_id)
);
```

Both tables use **Row Level Security** — users can only read and write their own rows.

Usernames are stored in Supabase Auth `user_metadata.username` at sign-up (no separate profiles table).

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/ZackSatrday/playce.git
cd playce
npm install
```

### 2. Set up environment variables

Create `.env.local` at the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
YT_API_KEY=your_youtube_data_api_v3_key
```

> Use `YT_API_KEY` without the `NEXT_PUBLIC_` prefix — the key is only used server-side inside `/api/playlist` and should never be exposed to the client bundle.

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema above in the SQL Editor
3. Enable **Email** auth: **Authentication → Providers → Email**
4. Enable **Google** OAuth: **Authentication → Providers → Google** (add Google Cloud client ID & secret)
5. Under **Authentication → URL Configuration**, set:
  - **Site URL:** `http://localhost:3000`
  - **Redirect URLs:** `http://localhost:3000/callback`

For Google OAuth, add Supabase’s callback URL (shown in the Google provider settings) to your Google Cloud OAuth client — not the Playce app URL.

### 4. Get a YouTube Data API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **YouTube Data API v3**
3. Create an API key under **Credentials**
4. Restrict usage to server-side only (no browser referrer restrictions needed if the key never ships to the client)

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

```bash
npx vercel --prod
```

Add environment variables in **Vercel → Settings → Environment Variables**.

Then update Supabase **Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/callback`

---

## How Resume Works

```
Open playlist
     │
     ▼
getResumeVideo(playlistId)
  → query progress WHERE completed = false
  → order by updated_at DESC, limit 1
     │
     ▼
Load YT IFrame player on that video
     │
     ▼
onReady → seekTo(timestamp_sec)
     │
     ├── onStateChange PAUSED  → saveProgress(videoId, currentTime)
     ├── onStateChange ENDED   → saveProgress(videoId, 0, completed=true)
     └── beforeunload          → saveProgress(videoId, currentTime)

Click sidebar video
     │
     ▼
getVideoProgress(playlistId, videoId)
  → if timestamp > 0 and not completed → loadVideoById(startSeconds: timestamp)
  → else                               → loadVideoById(startSeconds: 0)
```

Each video has its own `progress` row — timestamps never bleed across videos.

---

## Design System


| Token          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Accent (light) | `#3b82f6`                                            |
| Accent (dark)  | `#60a5fa`                                            |
| UI font        | Inter                                                |
| Display font   | Oswald (headings, labels)                            |
| Mono font      | JetBrains Mono                                       |
| Theming        | CSS variables in `globals.css` — light, dark, system |


---

## Known Behaviour

- **YouTube ads** — ads play inside the embed as they would on YouTube.com. No programmatic control over ads is available via the IFrame API. Users with YouTube Premium see no ads.
- **CORS errors in console** — `doubleclick.net` CORS errors come from YouTube's internal ad tracking inside the embed. They do not affect playback and cannot be suppressed.
- **Email confirmation** — if Supabase email confirmation is enabled, new accounts must confirm via the link before signing in. The link redirects through `/callback`.

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built by Sushant. · [GitHub](https://github.com/ZackSatrday)*