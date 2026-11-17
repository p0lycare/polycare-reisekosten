import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { alsSprache, SPRACH_COOKIE, SPRACH_COOKIE_OPTIONEN } from "@/lib/i18n/sprache";

/** Rücksprung von Microsoft: Code gegen Session tauschen. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sprache aus dem Profil in den Zwischenspeicher – auch auf einem neuen Gerät gleich richtig
      const { data: profil } = await supabase.from("profile").select("sprache").eq("id", data.user.id).maybeSingle();
      const antwort = NextResponse.redirect(`${origin}/`);
      antwort.cookies.set(SPRACH_COOKIE, alsSprache(profil?.sprache), SPRACH_COOKIE_OPTIONEN);
      return antwort;
    }
  }

  return NextResponse.redirect(`${origin}/login?fehler=callback`);
}
