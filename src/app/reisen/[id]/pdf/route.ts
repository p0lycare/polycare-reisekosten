import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { erzeugePdfMitBelegen } from "@/lib/pdf/abrechnung-pdf";
import { dateiBasis, ladeDokument } from "@/lib/pdf/dokument-laden";

/** Abrechnung mit Belegen als PDF zum Ansehen im Browser (Zugriff wie auf die Reise) */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const geladen = await ladeDokument(supabase, id);
  if (!geladen) return new NextResponse("Nicht gefunden", { status: 404 });

  const { pdf } = await erzeugePdfMitBelegen(geladen.dokument, geladen.dateien);
  const name = `${dateiBasis(geladen.reise.beleg_nr, geladen.dokument.reisende.name, geladen.reise.art)}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
