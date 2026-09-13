import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { playlist_id, video_id, timestamp_sec } = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await supabase.from("progress").upsert(
      {
        user_id: user.id,
        playlist_id,
        video_id,
        timestamp_sec,
        completed: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,playlist_id,video_id" },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
