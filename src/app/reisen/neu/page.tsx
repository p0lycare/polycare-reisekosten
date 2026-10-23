import { createClient } from "@/lib/supabase/server";
import { ReiseFormular } from "../reise-formular";

export default async function NeueReisePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profile")
    .select("kostenstelle, kfz_kennzeichen")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <h1 className="text-xl font-semibold">Neue Reise</h1>
      <ReiseFormular
        werte={{
          begruendung: "",
          reiseweg: "",
          besuchteStellen: "",
          land: "DE",
          beginn: "",
          ende: "",
          mitUebernachtung: true,
          mahlzeiten: {},
          verkehrsmittel: [],
          kfzKennzeichen: profil?.kfz_kennzeichen ?? "",
          mitfahrtBei: "",
          kostenstelle: profil?.kostenstelle ?? "",
          verpflegungBemerkung: "",
        }}
      />
    </main>
  );
}
