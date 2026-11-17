import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { alsSprache, istSprache, SPRACH_COOKIE, SPRACH_COOKIE_OPTIONEN } from "@/lib/i18n/sprache";

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

  // Sprache fehlt im Zwischenspeicher (z. B. Sitzung von vor dem Sprachumschalter): einmal aus dem Profil holen
  if (user && !istSprache(request.cookies.get(SPRACH_COOKIE)?.value)) {
    const { data: profil } = await supabase.from("profile").select("sprache").eq("id", user.id).maybeSingle();
    response.cookies.set(SPRACH_COOKIE, alsSprache(profil?.sprache), SPRACH_COOKIE_OPTIONEN);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
