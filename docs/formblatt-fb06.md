# Abdeckung Formblatt FB 06 „Reisekostenabrechnung Inland“

Das Tool ersetzt das Excel-Formblatt FB 06 (Blätter „Reisekostenabr“ und „Fahrten“) vollständig.
Niemand muss für den Prozess Dateien herunterladen, ausfüllen oder hochladen; Belege werden in der
App fotografiert. Einzige Datei ist der optionale DATEV-Export für die Buchhaltung.

> Dieses Repo ist öffentlich. Persönliche Daten (Name, IBAN, Kennzeichen, Personalnummer …) und
> Polycare-interne Einstellungen (Kontenzuordnung, Kostenstellen) liegen ausschließlich in der
> Datenbank und werden nie committet.

## Kopf

| Formblatt | Im Tool | Issue |
| --- | --- | --- |
| Pers.-Nr., Vor- und Zuname, Wohnort | Profil (Name kommt aus Microsoft) | #13 |
| Bankverbindung / IBAN | Profil, nur für die Person selbst und die Buchhaltung sichtbar | #13 |
| Kostenstelle, Konto | Profil (Standard), je Reise überschreibbar | #13 |
| Beleg Nr., Datum, Monat („wird von Buchhaltung ausgefüllt“) | Vergabe bei der Belegprüfung | #7 |

## Reise

| Formblatt | Im Tool | Issue |
| --- | --- | --- |
| Reiseweg, besuchte Stellen, Begründung | Felder der Reise | #14 |
| Abfahrt / Rückkehr (Datum, Uhrzeit) | Beginn / Ende | #3 ✅ |
| Verkehrsmittel: Flugzeug, Eisenbahn, Firmenwagen, eig. PKW (Kennzeichen), Mitfahrt von/bei, Mietwagen | Mehrfachauswahl; Kennzeichen aus Profil vorbelegt | #14 |

## A – Fahrtkosten

Jede Position mit Bruttobetrag und MwSt-Satz; Netto = Brutto / (1 + MwSt) wird berechnet.

| Position | Standard-MwSt | Issue |
| --- | --- | --- |
| Flugzeug | 19 % | #4 |
| Auto tanken | 19 % | #4 |
| Parken / Waschanlage | 19 % | #4 |
| Maut / Vignette | 0 % | #4 |
| Mietwagen (selbst bezahlt) | 19 % | #4 |
| Taxi | 7 % | #4 |
| Zugticket | 7 % | #4 |
| Km-Geld Privatwagen (km aus Fahrtenliste × Satz) | – | #5 |

Km-Geld: Polycare erstattet 0,38 €/km. Steuerfrei sind bei Dienstreisen 0,30 €/km; die Differenz
wird als steuerpflichtiger Anteil separat ausgewiesen. Der Satz ist eine Admin-Einstellung.

**Blatt „Fahrten“**: mehrere Fahrten je Abrechnung mit Datum, Fahrstrecke, Zweck, km; Summe fließt
ins Km-Geld (#5).

## B – Verpflegung pauschal / D – Kürzung

| Formblatt | Im Tool | Issue |
| --- | --- | --- |
| Tage „ab 8 Stunden“ × 14 €, „ab 24 Stunden“ × 28 € | automatisch je Kalendertag aus Beginn/Ende | #3 ✅ |
| Bemerkung / Hinweis | Freitextfeld | #14 |
| Abzug Frühstück 5,60 €, Mittag 11,20 €, Abend 11,20 € | gestellte Mahlzeiten je Tag ankreuzen | #3 ✅ |

## C – Übernachtung (Hotelrechnung)

| Position | Standard-MwSt | Issue |
| --- | --- | --- |
| Übernachtung | 7 % | #4 |
| Frühstück | 19 % | #4 |
| Servicepauschale | 19 % | #4 |
| Beherbergungssteuer | 0 % | #4 |
| Parken | frei wählbar | #4 |
| Kurtaxe | frei wählbar | #4 |
| Sonstiges | frei wählbar | #4 |

## E – Bewirtung (mit Fremden) / F – Sonstige Ausgaben

| Position | Standard-MwSt | Issue |
| --- | --- | --- |
| Bewirtung 19 % / 7 % (inkl. Trinkgeld) | 19 % / 7 % | #4 |
| Telefon, Porto mit / ohne MwSt | 19 % / 0 % | #4 |
| Trinkgeld ohne MwSt | 0 % | #4 |
| Parken ohne MwSt | 0 % | #4 |
| Bürobedarf | 19 % | #4 |

## Summe und Abschluss

| Formblatt | Im Tool | Issue |
| --- | --- | --- |
| Vorschuss (abzüglich) | Feld je Reise | #15 |
| Auszuzahlender Betrag | Summe aller Positionen − Vorschuss | #15 |
| Konto je Position | Kontenzuordnung je Kategorie, in der Datenbank pflegbar | #16 |
| Unterschrift „Für die Richtigkeit“ (Reisender) | Einreichen mit Bestätigung, Zeitstempel | #7 |
| „Genehmigung“ (Vorgesetzter) | Stufe 1: Freigabe, Zeitstempel | #7 |
| „Belegprüfung“ (Prüfer) | Stufe 2: Buchhaltung prüft, vergibt Beleg-Nr. | #7 |
| Ausdruck / Ablage | Abrechnungsansicht im Tool; DATEV-Export für die Buchhaltung | #8 |
