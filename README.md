# Polycare Reisekosten

Web-App für Reisekostenabrechnungen bei Polycare: Mitarbeitende erfassen Dienstreisen und Belege
(auch per Handyfoto), das Tool berechnet Verpflegungs- und Kilometerpauschalen, Freigebende
genehmigen, die Buchhaltung exportiert als PDF bzw. CSV/DATEV.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind) – läuft im Browser und mobil
- **Supabase** – Postgres, Login (Microsoft/E-Mail), Storage für Belegfotos, Row Level Security
- **Vercel** – Hosting, Deployment automatisch aus `main`, Preview je Pull Request

## Stand

| Bereich | Status |
| --- | --- |
| Verpflegungspauschalen Inland (14/28 €, Mahlzeitenkürzung, über Mitternacht) | ✅ `src/lib/reisekosten/verpflegung.ts` |
| Kilometerpauschale (PKW 0,30 €, Motorrad 0,20 €) | ✅ `src/lib/reisekosten/fahrtkosten.ts` |
| Datenbankschema + Berechtigungen | ✅ `supabase/migrations/0001_init.sql` |
| Auslandspauschalen (BMF-Tabelle) | ⏳ |
| Login, Reise erfassen, Belege hochladen | ⏳ |
| Freigabe-Workflow | ⏳ |
| PDF-Abrechnung, CSV/DATEV-Export | ⏳ |

Offene Punkte werden als GitHub-Issues geführt.

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Supabase-Zugangsdaten eintragen
npm run dev
```

Tests: `npm test` · Typen: `npm run typecheck` · Lint: `npm run lint`

## Rechtsgrundlage

Pauschalen nach § 9 Abs. 4a EStG (Verpflegung) und § 9 Abs. 1 Satz 3 Nr. 4a EStG (Fahrtkosten).
Alle Beträge werden intern in Cent gerechnet. Die Berechnung ersetzt keine steuerliche Prüfung.
