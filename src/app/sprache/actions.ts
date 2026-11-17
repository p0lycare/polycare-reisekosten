"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { istSprache, SPRACH_COOKIE, SPRACH_COOKIE_OPTIONEN } from "@/lib/i18n/sprache";

/** Wechselt die Sprache der Oberfläche: dauerhaft im Profil, das Cookie als Zwischenspeicher */
export async function spracheWechseln(sprache: string): Promise<void> {
  if (!istSprache(sprache)) return;
  (await cookies()).set(SPRACH_COOKIE, sprache, SPRACH_COOKIE_OPTIONEN);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profile").update({ sprache }).eq("id", user.id);

  revalidatePath("/", "layout");
}
