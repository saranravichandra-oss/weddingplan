# Wedding SS

Ausgewählt: **Variante A · Alles im Blick**. Die ruhige Salbei-Oberfläche ist die feste Grundlage der weiteren Planung. Repository: [saranravichandra-oss/weddingplan](https://github.com/saranravichandra-oss/weddingplan).

## Lokal starten

Voraussetzung: Node.js 22.12+ bzw. eine von Vite 8 unterstützte neuere Version.

```sh
npm ci
npm run dev
```

Im Browser: http://127.0.0.1:5173

Die Startseite öffnet die ausgewählte Variante A ohne Variantenwähler. Der Angebotsvergleich und die manuelle Dokumentprüfung sind über die Navigation und direkt aus der Übersicht erreichbar. Die ursprünglichen drei Entwürfe bleiben im ersten Git-Commit `daf618b` nachvollziehbar.

React, TypeScript und Vite; eigenes responsives CSS, Phosphor-Icons, lokal gebündelte DM Sans und Manrope. Kein Backend, keine laufenden API-Kosten.

## Was im ausgewählten Entwurf funktioniert

- Navigation, Veranstaltungswechsel, Aufgaben abhaken und wieder öffnen.
- Dienstleister manuell anlegen, Angebote mit expliziter Bestätigung manuell erfassen und nach Kategorie vergleichen.
- PDF-, Bild- und Textdateien lokal öffnen; Angebotstext alternativ einfügen. Format- und Größenprüfung (15 MB).
- Original und Formular nebeneinander prüfen; Seiten-/Textquelle manuell erfassen. Vorschau gescannter PDFs ohne OCR.
- Klar markierte erfundene Demo-Angebote optional einblenden; sie bleiben von echten manuell erfassten Angeboten getrennt.
- Budgetrechner mit expliziter Gästeannahme für 180, 200 und 220 Gäste. Fehlende Beträge sind unbekannt; 0 wird nur bei expliziter Eingabe gerechnet. Der Saal wird einmal berücksichtigt.
- Tastaturbedienung, native Dialoge mit Fokusbegrenzung und Escape, reduzierte Bewegung.

**Wichtig:** Änderungen bestehen ausschließlich im React-Sitzungszustand und gehen beim Neuladen verloren. Es gibt keine KI-/OCR-Auswertung, Upload-API, Authentifizierung, gemeinsame Nutzung oder dauerhafte Speicherung. Lokal geöffnete Dateien werden nicht an einen Server übertragen. Die Dokumentenliste enthält nach manueller Übernahme nur den Dateinamen; das Original wird nicht gespeichert. Externe Website-Links werden nur auf ausdrücklichen Klick geöffnet.

Die Prüfansicht ist ein bewusst begrenztes Formular zur Bewertung des Ablaufs, kein vollständiges Datenmodell aller Angebotsfelder aus dem Briefing. Bei übernommenen manuellen Angeboten sind weitere Angaben als „nicht angegeben“ sichtbar. Demo-Daten enthalten zusätzliche Vergleichsmerkmale und keine echten Empfehlungen.

## Verbindlicher Planungsstand

2027, konkretes Datum offen; Berlin und nahes Brandenburg, maximale Entfernung offen; Standesamt, tamilische Zeremonie und Reception; 180–220 Gäste bei der größten Feier, Zuordnung und Einzelzahlen offen. Keine religiösen Annahmen.

Bekannt beauftragt: ausschließlich Saal 1.000 €, davon 500 € angezahlt und 500 € offen. Name, Adresse, Termin und Zahlungsfrist offen. Foto-/Videoangebote liegen extern vor, wurden aber nicht bereitgestellt. Musik organisiert, Preis/Zahlungsstatus offen. Outfits und Styling selbst organisiert, Kosten offen. Catering wird persönlich betreut und bleibt ungebucht. Zielbudget und Obergrenze offen. Angebote verändern die beauftragten Kosten nicht.

## Prüfung

```sh
npm run build
npx playwright install chromium
npm test
```

Die Browserprüfungen decken alle Bereiche auf Desktop/Mobilgeräten, unbekannte Preise, Trennung von Demo und realen Daten, fehlende Szenariowerte, einmalige Saalkosten, lokale Dateien, Veranstaltungswechsel und sitzungsbezogene Aufgaben ab.

## Späterer funktionaler Ausbau

Privater Zugriff für zwei Personen, Datenbank und privater Dokumentenspeicher, Dateizugriff mit Berechtigungen, echte serverseitige Dokumentanalyse/OCR mit Quellen und Korrekturschritt, versionierte Angebote, vollständige Angebotsfelder, Aufgabenverantwortung/Termine, Gäste mit veranstaltungsbezogenen Rückmeldungen und Datenexport. Dafür sind Backend, Authentifizierung, Speicher und ein tatsächlich angebundener Auswertungsdienst noch auszuwählen und zu konfigurieren.
