import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { playlist_id, video_id, timestamp_sec, completed } =
      await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let nextCompleted = completed === true;

    if (!nextCompleted) {
      const { data: existing } = await supabase
        .from("progress")
        .select("completed")
        .eq("user_id", user.id)
        .eq("playlist_id", playlist_id)
        .eq("video_id", video_id)
        .maybeSingle();
      if (existing?.completed === true) nextCompleted = true;
    }

    const { error } = await supabase.from("progress").upsert(
      {
        user_id: user.id,
        playlist_id,
        video_id,
        timestamp_sec,
        completed: nextCompleted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,playlist_id,video_id" },
    );

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
