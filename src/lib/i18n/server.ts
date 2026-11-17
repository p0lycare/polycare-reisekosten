import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { alsSprache, istSprache, SPRACH_COOKIE, STANDARD_SPRACHE, type Sprache } from "./sprache";
import { texte, type Texte } from "./woerterbuch";

/**
 * Sprache der angemeldeten Person: erst das Cookie (Zwischenspeicher), sonst das Profil, sonst Deutsch.
 * Einmal je Request.
 */
export const ladeSprache = cache(async (): Promise<Sprache> => {
  const cookieStore = await cookies();
  const gespeichert = cookieStore.get(SPRACH_COOKIE)?.value;
  if (istSprache(gespeichert)) return gespeichert;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return STANDARD_SPRACHE;
    const { data } = await supabase.from("profile").select("sprache").eq("id", user.id).maybeSingle();
    return alsSprache(data?.sprache);
  } catch {
    return STANDARD_SPRACHE;
  }
});

/** Wörterbuch für Server Components und Server Actions */
export async function ladeTexte(): Promise<Texte> {
  return texte(await ladeSprache());
}
