import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spracheBeimLogin, SPRACH_COOKIE, SPRACH_COOKIE_OPTIONEN, SPRACH_WAHL_COOKIE } from "@/lib/i18n/sprache";

/** Rücksprung von Microsoft: Code gegen Session tauschen. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Auf der Login-Seite gewählte Sprache ins Profil übernehmen, sonst gilt das Profil –
      // so ist die Sprache auch auf einem neuen Gerät gleich richtig
      const { data: profil } = await supabase.from("profile").select("sprache").eq("id", data.user.id).maybeSingle();
      const { sprache, insProfil } = spracheBeimLogin(
        request.cookies.get(SPRACH_COOKIE)?.value,
        request.cookies.has(SPRACH_WAHL_COOKIE),
        profil?.sprache,
      );
      if (insProfil) {
        const { error: fehler } = await supabase.from("profile").update({ sprache }).eq("id", data.user.id);
        if (fehler) console.error("Sprache konnte nicht ins Profil übernommen werden", fehler.message);
      }
      const antwort = NextResponse.redirect(`${origin}/`);
      antwort.cookies.set(SPRACH_COOKIE, sprache, SPRACH_COOKIE_OPTIONEN);
      antwort.cookies.delete(SPRACH_WAHL_COOKIE);
      return antwort;
    }
  }

  return NextResponse.redirect(`${origin}/login?fehler=callback`);
}
