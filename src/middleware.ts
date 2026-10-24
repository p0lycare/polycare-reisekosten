import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Erneuert bei jedem Request die Supabase-Session und leitet Unangemeldete zum Login. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Cron-Routen prüfen ihr eigenes Geheimnis
  const oeffentlich = pathname === "/login" || pathname.startsWith("/auth/") || pathname.startsWith("/api/cron/");
  if (!user && !oeffentlich) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/login";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
