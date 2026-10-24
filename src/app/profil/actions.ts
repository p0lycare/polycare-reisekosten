"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { istGueltigeIban, normalisiereIban } from "@/lib/iban";

export type ProfilStatus = { fehler?: string; gespeichert?: boolean };

function text(formData: FormData, feld: string): string | null {
  return String(formData.get(feld) ?? "").trim() || null;
}

export async function profilSpeichern(_vorher: ProfilStatus, formData: FormData): Promise<ProfilStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ibanEingabe = text(formData, "iban");
  const iban = ibanEingabe ? normalisiereIban(ibanEingabe) : null;
  if (iban && !istGueltigeIban(iban)) {
    return { fehler: "Die IBAN ist ungültig. Bitte Eingabe prüfen." };
  }

  const kennzeichen = text(formData, "kfz_kennzeichen");
  const { error: fehlerProfil } = await supabase
    .from("profile")
    .update({
      kostenstelle: text(formData, "kostenstelle"),
      kfz_kennzeichen: kennzeichen?.toUpperCase() ?? null,
      kalender_vorschlaege: formData.get("kalender_vorschlaege") === "on",
    })
    .eq("id", user.id);

  const { error: fehlerPrivat } = await supabase.from("profil_privat").upsert({
    id: user.id,
    personalnummer: text(formData, "personalnummer"),
    wohnort: text(formData, "wohnort"),
    iban,
    updated_at: new Date().toISOString(),
  });

  if (fehlerProfil || fehlerPrivat) return { fehler: "Speichern fehlgeschlagen." };

  revalidatePath("/profil");
  return { gespeichert: true };
}
