import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Deletes all playlists and watch progress for the signed-in user.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: owned, error: listError } = await supabase
    .from("playlists")
    .select("id")
    .eq("user_id", user.id);

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const playlistIds = (owned ?? []).map((r) => r.id as string);
  if (playlistIds.length > 0) {
    const { error: progressError } = await supabase
      .from("progress")
      .delete()
      .in("playlist_id", playlistIds);

    if (progressError) {
      return NextResponse.json(
        { error: progressError.message },
        { status: 500 },
      );
    }
  }

  const { error: orphanProgressError } = await supabase
    .from("progress")
    .delete()
    .eq("user_id", user.id);

  if (orphanProgressError) {
    return NextResponse.json(
      { error: orphanProgressError.message },
      { status: 500 },
    );
  }

  const { error: playlistsError } = await supabase
    .from("playlists")
    .delete()
    .eq("user_id", user.id);

  if (playlistsError) {
    return NextResponse.json(
      { error: playlistsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
