# Playce LMS: Project Plan

Converts Playce (Next.js 14, Supabase, Vercel) from a YouTube playlist tracker into a personal LMS. Design details are in `playce-lms-system-design.md`. This file covers the build order, instrumentation, and metrics.

## 1. Scope

| In scope | Out of scope (for now) |
|---|---|
| Course → Module → Lesson hierarchy | Multi-user enrollment / creator-learner split |
| Playlist import | Discussions / comments |
| Precise resume | Spaced-repetition reminders |
| Timestamped notes | Mobile app |
| On-demand AI summary + lazy quiz | Bulk AI generation |
| Dashboard, certificates | External job queue (QStash) |

## 2. Build Plan

Instrumentation goes in at phase 0, so every later feature produces data from day one.

| Phase | Build | Done when |
|---|---|---|
| 0 | Schema migration + RLS (courses, modules, lessons) + `usage_events` table | A user can only read their own rows, tested with two accounts |
| 1 | Playlist → Course import | Importing a playlist creates the full hierarchy with order preserved |
| 2 | Precise resume (`lesson_progress` checkpoints) | Closing and reopening a lesson seeks to within ~15s of where you left off |
| 3 | `video_assets` cache + on-demand summary + `generation_jobs` lock | A second open of the same video makes zero LLM calls, and a double-click makes one call |
| 4 | Timestamped notes | Clicking a note seeks the player |
| 5 | Lazy quiz + attempts | The quiz is generated only on click and cached by video |
| 6 | Dashboard (completion %, streaks, time spent) | Numbers match manual counts on a test course |
| 7 | Certificates | A test course issues exactly one certificate when eligible |
| 8 | Landing page + deploy + README | A public link works end to end for a new user |

**Ship phases 0-3 first.** They cover both resume bullets, so metric collection can start while the rest is built.

### Certificate rule (decision needed before phase 7)

| Option | Rule |
|---|---|
| A | Every lesson needs a passed quiz. Strict, forces a generation call per video |
| B (default) | Average score across quizzes taken ≥ threshold, with at least 50% of lessons quizzed. Fits free-tier limits |

## 3. Instrumentation (phase 0)

One table:

| `usage_events` | Fields |
|---|---|
| | `id`, `user_id`, `event_type`, `youtube_video_id` (nullable), `lesson_id` (nullable), `provider` (nullable), `status` (nullable), `latency_ms` (nullable), `meta` (jsonb), `created_at` |

| Event | When | Key fields |
|---|---|---|
| `playlist_imported` | After import | `meta.lesson_count` |
| `progress_write` | Each checkpoint upsert | `meta.trigger` (pause/seek/unload/tick) |
| `resume_open` | Lesson opened with saved position | `meta.saved_pos`, `meta.sought_pos` |
| `session_end` | Unload or pause | `meta.actual_pos`, `meta.saved_pos`, `meta.watch_seconds` |
| `cache_hit` / `cache_miss` | Summary or quiz lookup | `job_type` |
| `llm_call` | Each provider attempt | `provider`, `status` (ok/429/error), `latency_ms` |
| `lesson_completed` | On completion | `lesson_id` |

Log from API routes where possible, since client-side events get lost on tab close.

## 4. Metrics

| Claim | Metric | Calculation | Baseline |
|---|---|---|---|
| LLM call reduction | % fewer calls than eager generation | `1 − (summary llm_calls) ÷ (sum of lesson_count from playlist_imported)` | Eager = one call per imported lesson |
| Cache effectiveness | Cache hit rate | `cache_hit ÷ (cache_hit + cache_miss)` | n/a |
| Fallback reliability | Summary success rate | Videos with a saved summary ÷ videos where generation was attempted. Also report each provider's share of summaries | n/a |
| Write reduction | Progress writes per watch-hour | `progress_write count ÷ (sum watch_seconds ÷ 3600)` | Per-second saving = 3,600/hr. Per-5s = 720/hr |
| Resume accuracy | Median and p95 drift | `abs(actual_pos − saved_pos)` from `session_end` | Target: median under 15s |
| Latency | p50/p95 summary generation | Percentiles of `latency_ms` on successful `llm_call`s | n/a |
| Scale | Users, courses, lessons, hours watched | `COUNT` and `SUM` queries | n/a |
| Engagement | Lesson completion rate | `lesson_completed ÷ lessons opened` | n/a |

### Getting real data
- Share with 10-20 classmates or friends and ask them to use it for 1-2 weeks. Self-testing alone gives numbers that are too thin.
- Only report a percentage when the denominator is meaningful. Write "measured over N sessions", not a bare percentage.
- The eager and per-second baselines are hypothetical, so say so: "versus generating per imported video". Never imply the old approach was run.
- Keep the raw numbers and queries so any figure can be reproduced live.

## 5. Resume Bullets (no metrics yet)

**Playce: AI-Powered Learning Platform** | Next.js 14, TypeScript, Supabase, Tailwind CSS, Vercel, Gemini API

- Built a full-stack LMS that converts YouTube playlists into structured courses with precise resume and progress tracking, by designing a Course → Module → Lesson Postgres schema with row-level security and checkpoint-based position saving.
- Delivered AI transcript summaries and quizzes within free-tier rate limits, by generating on demand for the playing video, caching results by video ID, and chaining Gemini Flash → Gemini Pro → Llama fallbacks (supports Hindi/Hinglish transcripts).

Only claim features that have shipped. Remove quizzes from bullet 2 until phase 5 is live.

Once data exists, add the figures to the "by" clauses (e.g., "reducing LLM calls by X%").

## 6. After the Data Exists

1. Run the metric queries and put the results in a small table.
2. Fill them into the "by" clauses of the resume bullets.
3. Add the same table to the README under "Results".

## 7. Next Step

Write the `usage_events` migration and the metric SQL queries as minimal Cursor prompts.
