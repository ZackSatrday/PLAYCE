import { userNeedsUsername } from "@/lib/utils";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const login = new URL("/login", origin);
    login.searchParams.set(
      "error",
      searchParams.get("error_description") ?? "Sign-in was cancelled.",
    );
    return NextResponse.redirect(login);
  }

  if (!url || !key || !code) {
    return NextResponse.redirect(`${origin}/auth-code-error`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore when called outside mutable cookie context */
        }
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth-code-error`);
  }

  const user = data.user;
  if (userNeedsUsername(user)) {
    const onboarding = new URL("/onboarding", origin);
    onboarding.searchParams.set("next", next);
    return NextResponse.redirect(onboarding);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
