export const dynamic = "force-dynamic";

import { generateSummary } from "@/lib/summarize";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const videoTitle = searchParams.get("videoTitle") || "";

  if (!videoId) {
    return Response.json({ error: "Missing videoId" }, { status: 400 });
  }

  const supabase = await createClient();

  // ── Cache check ────────────────────────────────────────────────────────────
  const { data: row } = await supabase
    .from("videos")
    .select("summary_json, summary_provider, summary_model")
    .eq("yt_video_id", videoId)
    .maybeSingle();

  if (row && row.summary_json !== null) {
    return Response.json({
      summary: row.summary_json,
      provider: row.summary_provider,
      model: row.summary_model,
      cached: true,
    });
  }

  // ── Summarise ──────────────────────────────────────────────────────────────
  const result = await generateSummary(videoId, videoTitle);

  if (!result) {
    return Response.json({ summary: null, reason: "llm_failed" });
  }

  // ── Persist to Supabase ────────────────────────────────────────────────────
  await supabase.from("videos").upsert(
    {
      yt_video_id: videoId,
      summary_json: result.chapters,
      summary_provider: result.provider,
      summary_model: result.model,
      summary_generated_at: new Date().toISOString(),
    },
    { onConflict: "yt_video_id" }
  );

  return Response.json({
    summary: result.chapters,
    provider: result.provider,
    model: result.model,
    cached: false,
  });
}
