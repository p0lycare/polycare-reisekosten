"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function mitMicrosoftAnmelden() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      // "email" für die Adresse, "profile" für den vollen Namen
      scopes: "openid email profile",
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?fehler=anmeldung");
  }
  redirect(data.url);
}
