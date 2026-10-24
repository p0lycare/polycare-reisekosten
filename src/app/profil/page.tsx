import { createClient } from "@/lib/supabase/server";
import { formatIban } from "@/lib/iban";
import { ProfilFormular } from "./profil-formular";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profil }, { data: privat }] = await Promise.all([
    supabase.from("profile").select("name, email, rolle, kostenstelle, kfz_kennzeichen, kalender_vorschlaege").eq("id", user!.id).single(),
    supabase.from("profil_privat").select("personalnummer, wohnort, iban").eq("id", user!.id).maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">Mein Profil</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {profil?.name} · {profil?.email} – Name und E-Mail kommen aus Microsoft 365.
        </p>
      </div>
      <ProfilFormular
        werte={{
          personalnummer: privat?.personalnummer ?? "",
          wohnort: privat?.wohnort ?? "",
          iban: privat?.iban ? formatIban(privat.iban) : "",
          kostenstelle: profil?.kostenstelle ?? "",
          kfzKennzeichen: profil?.kfz_kennzeichen ?? "",
          kalenderVorschlaege: profil?.kalender_vorschlaege ?? false,
        }}
      />
    </main>
  );
}
