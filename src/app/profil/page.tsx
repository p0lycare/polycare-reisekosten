import { createClient } from "@/lib/supabase/server";
import { ProfilFormular } from "./profil-formular";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profil }, { data: privat }] = await Promise.all([
    supabase.from("profile").select("name, email, rolle, kostenstelle, kfz_kennzeichen, kalender_vorschlaege").eq("id", user!.id).single(),
    supabase.from("profil_privat").select("personalnummer, wohnort").eq("id", user!.id).maybeSingle(),
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
          kostenstelle: profil?.kostenstelle ?? "",
          kfzKennzeichen: profil?.kfz_kennzeichen ?? "",
          kalenderVorschlaege: profil?.kalender_vorschlaege ?? false,
        }}
      />
      {/* Am Handy steht Abmelden nicht in der Kopfzeile */}
      <form action="/auth/logout" method="post" className="border-t border-neutral-200 pt-6 sm:hidden dark:border-neutral-800">
        <button type="submit" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          Abmelden
        </button>
      </form>
    </main>
  );
}
