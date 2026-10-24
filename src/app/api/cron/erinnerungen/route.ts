import { NextResponse, type NextRequest } from "next/server";
import { erinnerungenSenden } from "@/lib/erinnerungen/senden";

export const dynamic = "force-dynamic";

/** Von Vercel Cron täglich aufgerufen; Vercel sendet CRON_SECRET als Bearer-Token mit */
export async function GET(request: NextRequest) {
  const geheimnis = process.env.CRON_SECRET;
  if (!geheimnis || request.headers.get("authorization") !== `Bearer ${geheimnis}`) {
    return NextResponse.json({ fehler: "nicht berechtigt" }, { status: 401 });
  }
  const basis = process.env.APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
  return NextResponse.json(await erinnerungenSenden({ basis }));
}
