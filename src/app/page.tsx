import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profile")
    .select("name, rolle")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6 font-sans">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Polycare Reisekosten</h1>
        <form action="/auth/logout" method="post">
          <button type="submit" className="text-sm text-neutral-600 underline dark:text-neutral-400">
            Abmelden
          </button>
        </form>
      </header>
      <p>
        Hallo {profil?.name ?? user!.email}
        {profil?.rolle && profil.rolle !== "mitarbeiter" && (
          <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-sm dark:bg-neutral-800">
            {profil.rolle}
          </span>
        )}
      </p>
      <p className="text-sm text-neutral-500">Reisen erfassen folgt.</p>
    </main>
  );
}
