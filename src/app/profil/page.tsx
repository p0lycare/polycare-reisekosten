import { createClient } from "@/lib/supabase/server";
import { ProfilFormular } from "./profil-formular";
import { SprachAuswahl } from "@/app/sprache/sprach-umschalter";
import { ladeTexte } from "@/lib/i18n/server";
import { formatDatum } from "@/lib/format";
import { heuteBerlin, istAktiv, type Vertretung } from "@/lib/reisekosten/vertretung";
import { VertretungFormular } from "@/app/einstellungen/personen/vertretung-formular";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profil }, { data: privat }] = await Promise.all([
    supabase.from("profile").select("name, email, rolle, kostenstelle, kfz_kennzeichen, kalender_vorschlaege").eq("id", user!.id).single(),
    supabase.from("profil_privat").select("personalnummer, wohnort").eq("id", user!.id).maybeSingle(),
  ]);

  const t = await ladeTexte();
  const tv = t.einstellungen.vertretung;

  // Vertretung: genehmigende Personen tragen ihre eigene ein und sehen, wen sie selbst vertreten
  const genehmigend = !!profil && profil.rolle !== "mitarbeiter";
  const heute = heuteBerlin();
  const [{ data: kandidaten }, { data: vertretungen }] = genehmigend
    ? await Promise.all([
        supabase.from("profile").select("id, name").neq("rolle", "mitarbeiter").order("name"),
        supabase
          .from("vertretung")
          .select("vertretene_id, vertreter_id, von, bis, bis_auf_weiteres, vertretene:profile!vertretung_vertretene_id_fkey(name)")
          .or(`vertretene_id.eq.${user!.id},vertreter_id.eq.${user!.id}`),
      ])
    : [{ data: [] }, { data: [] }];
  const meine = (vertretungen ?? []).find((v) => v.vertretene_id === user!.id) ?? null;
  const ichVertrete = (vertretungen ?? []).filter(
    (v) => v.vertreter_id === user!.id && (istAktiv(v, heute) || v.von > heute),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 font-sans">
      <div>
        <h1 className="text-xl font-semibold">{t.rahmen.profil.titel}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {profil?.name} · {profil?.email} – {t.rahmen.profil.herkunft}
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
      {genehmigend && (
        <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-medium">{tv.profilTitel}</h2>
          <p className="text-sm text-neutral-500">{tv.profilText}</p>
          {ichVertrete.map((v) => (
            <p key={v.vertretene_id} className="rounded-md bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
              {tv.ichVertrete(v.vertretene?.name ?? "", tv.zeitraum(formatDatum(v.von), v.bis ? formatDatum(v.bis) : null))}
            </p>
          ))}
          <VertretungFormular
            vertreteneId={user!.id}
            vertretung={meine ? ({ vertretene_id: meine.vertretene_id, vertreter_id: meine.vertreter_id, von: meine.von, bis: meine.bis, bis_auf_weiteres: meine.bis_auf_weiteres } satisfies Vertretung) : null}
            kandidaten={kandidaten ?? []}
            heute={heute}
            aufgeklappt
          />
        </section>
      )}
      <SprachAuswahl />
      {/* Am Handy steht Abmelden nicht in der Kopfzeile */}
      <form action="/auth/logout" method="post" className="border-t border-neutral-200 pt-6 sm:hidden dark:border-neutral-800">
        <button type="submit" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">
          {t.allgemein.knopf.abmelden}
        </button>
      </form>
    </main>
  );
}
