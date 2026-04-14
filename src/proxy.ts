import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function copySessionCookies(from: NextResponse, to: NextResponse) {
  const headers = from.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const list = headers.getSetCookie?.() ?? [];
  for (const cookie of list) {
    to.headers.append("Set-Cookie", cookie);
  }
}

function isProtectedPath(pathname: string) {
  if (pathname === "/dashboard" || pathname === "/settings") return true;
  if (pathname.startsWith("/playlist/")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  let user = null;

  try {
    const {
      data: { user: fetchedUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !fetchedUser) {
      if (isProtectedPath(pathname)) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("sb-access-token");
        response.cookies.delete("sb-refresh-token");
        return response;
      }
    } else {
      user = fetchedUser;
    }
  } catch {
    if (isProtectedPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (!user && isProtectedPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.delete("register");
    login.searchParams.delete("next");
    login.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    const redirectResponse = NextResponse.redirect(login);
    copySessionCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const dashboard = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboard);
    copySessionCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
