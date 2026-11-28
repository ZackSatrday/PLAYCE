import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseImportUrlOrId } from "@/lib/lms/import-request";
import {
  importPlaylistForUser,
  PlaylistImportError,
} from "@/lib/lms/import-playlist";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = parseImportUrlOrId(body);
  if (!raw) {
    return NextResponse.json({ error: "Missing urlOrId" }, { status: 400 });
  }

  try {
    const result = await importPlaylistForUser(supabase, user.id, raw);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PlaylistImportError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
