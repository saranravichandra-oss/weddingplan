# Wedding SS · Alles im Blick

Die ausgewählte Variante A als private, gemeinsam nutzbare App. React und TypeScript im Browser, wahlweise lokal mit SQLite oder online mit Vercel Hobby und Supabase Free. Es gibt keinen Codepfad für kostenpflichtige KI-Aufrufe.

Die Atelier-Oberfläche bietet verlinkbare Bereiche, eine Kartenübersicht und den direkten Angebotsvergleich, Excel-Gästeimport mit Familiengrößen sowie eine getrennte recherchierte Vorauswahl. Vorschläge erzeugen erst nach ausdrücklichem Merken einen Kontakt. Öffentliche Preisbausteine sind keine persönlichen Angebote und fließen nicht automatisch ins Budget ein.

Auf dem Handy führen vier feste Ziele zu Übersicht, Angeboten, Gästen und Budget. „Mehr“ öffnet alle neun Planungsbereiche, einschließlich Recherche, Aufgaben, Veranstaltungen, Dokumenten und gemeinsamer Nutzung. Die kompakte Tablet-Seitenleiste behält beschriftete zugängliche Links und Tooltips.

Angebotsentwürfe werden im aktuellen Browser-Tab pro Konto wiederaufgenommen. Die unbestätigten Feldkorrekturen stehen bis zur Übernahme nur in diesem Tab; hochgeladene Originale und Auswertungen liegen bereits im gemeinsamen privaten Dokumentbereich. Bei gleichzeitigen Änderungen werden unterschiedliche Felder zusammengeführt und konkurrierende Angaben bewusst ausgewählt. Unterschiedliche Originale werden als getrennte Fassungen behandelt. Nach einer Zusammenführung ist eine erneute Prüfung nötig.

Eine fehlgeschlagene Auswertung lässt sich im Prüfdialog erneut starten. Während des Neustarts bleibt das Original fest zugeordnet; manuelle Feldkorrekturen bleiben möglich. Später übernommene Erkennungsergebnisse erhalten diese Korrekturen und setzen die Prüfbestätigung zurück. Das aktuelle Ergebnis wird erst nach erneuter Bestätigung gespeichert.

Auch Gäste, Aufgaben und andere Planungsformulare bieten bei parallelen Änderungen eine gemeinsame Prüfung an. Gästerückmeldungen werden je Feier zusammengeführt. Gleiche Angaben mit verschiedenen Werten benötigen eine Auswahl; die Zusammenführung allein speichert nichts. Ein inzwischen gelöschter Eintrag wird nicht automatisch wieder angelegt. Ungespeicherte Formulare warnen vor versehentlichem Schließen oder Neuladen.

## Online gemeinsam planen

Die Cloud-Fassung verwendet eine stateless Vercel-Funktion als Proxy, eine Supabase Edge Function mit eigener Sitzungsprüfung, Postgres und einen privaten Storage-Bucket. Originale und Auswertungen werden dauerhaft im gemeinsamen Speicher abgelegt. Das Lesen von PDF-Text und die deutsche/englische OCR erfolgen im Browser mit selbst gehosteten Sprachdateien. Der Browser muss während der Auswertung geöffnet bleiben. Bei einem Abbruch kann die Auswertung fortgesetzt werden. Es gibt keine externe KI-Analyse und keinen benötigten OpenAI-Schlüssel.

Anmeldung mit dem bestehenden Konto, Einladung des zweiten Zugangs unter **Gemeinsam**. Beide können über HTTPS auch aus verschiedenen Netzwerken zugreifen. Änderungen werden bei geöffneter Seite ungefähr alle 15 Sekunden geladen; gleichzeitige Änderungen desselben Eintrags werden erkannt. Automatische E-Mails werden nicht versendet.

Die Bereitstellung benötigt Vercel **Hobby** und Supabase **Free**, ohne Upgrade oder kostenpflichtige Zusatzdienste. Die App begrenzt Dokumente auf 750 MB insgesamt und 15 MB pro Datei. Anbieterlimits gelten zusätzlich; kostenlose Projekte können bei Inaktivität pausieren oder beim Erreichen von Freigrenzen eingeschränkt werden. Es wird keine unbegrenzte Verfügbarkeit zugesichert. Exporte und Originale regelmäßig privat sichern.

`npm run build:cloud` baut nach `dist-cloud`, der lokale Build bleibt in `dist`. Vercel erhält nur `WEDDING_BACKEND_URL` und den öffentlichen `WEDDING_BACKEND_PUBLIC_KEY`. Der Supabase-Administrationsschlüssel bleibt ausschließlich in der Edge-Runtime. Alle Anwendungstabellen haben RLS, direkten anonymen Zugriff und öffentliche Originale gibt es nicht. Produktionsadressen werden in `wedding_config.allowed_origins` ausdrücklich freigegeben.

Für die einmalige Übernahme: lokale Sicherung erstellen, lokal Schreibzugriffe sperren, signierten Snapshot und private Originale mit `scripts/migrate-to-cloud.mjs` übertragen. Die Signatur wird mit einem temporären Ed25519-Schlüssel überprüft; nach Abschluss wird der öffentliche Migrationsschlüssel serverseitig entfernt. Private Migrationsdateien liegen ausschließlich im ignorierten Ordner `.wedding-cloud`. Die lokale Fassung bleibt anschließend als schreibgeschützte Sicherung erhalten. Keine privaten Dateien oder Passwort-Hashes gehören ins Repository.

Cloud-Integrationstests verwenden einen ausdrücklich vorbereiteten, isolierten synthetischen Datenstand: `npx playwright test --config tests/cloud/playwright.config.ts`. Sie dürfen nicht gegen eure bereits migrierte Planung ausgeführt werden.

Die App verwendet **echte lokale Texterkennung mit Tesseract.js und regelbasierte Angebotsextraktion**. Dies ist keine generative KI und keine simulierte Auswertung. Ein optional separat eingerichteter OpenAI-Schlüssel wird von der App weder geladen noch verwendet. Es gibt keinen Schalter und keinen Codepfad für kostenpflichtige OpenAI-Aufrufe.

## Starten

Voraussetzung: **Node.js 24 oder neuer**. Auf dem Rechner, auf dem eure Planung gespeichert werden soll:

```sh
npm ci
npm run build
npm start
```

Öffnen: [http://127.0.0.1:5173](http://127.0.0.1:5173). Für Entwicklung mit automatischer Aktualisierung: `npm run dev`.

1. Das erste Konto direkt auf dem Hauptrechner erstellen: Name, E-Mail als Anmeldename und ein Passwort mit mindestens 12 Zeichen. E-Mails werden nicht versendet.
2. Unter **Gemeinsam** einen Einladungscode für den zweiten Zugang erzeugen. Der Code gilt 48 Stunden, ist einmalig und kann widerrufen werden.
3. Auf dem zweiten Gerät im selben privaten Netzwerk die unter **Gemeinsam** angezeigte Netzwerkadresse öffnen. „Ich habe einen Einladungscode“ wählen und ein eigenes Konto erstellen.

Beide Zugänge verwenden dieselben Daten. Änderungen erscheinen auf dem anderen Gerät nach spätestens etwa fünf Sekunden. Der Hauptrechner und die App müssen laufen. Bei abgeschaltetem Rechner gibt es keinen Zugriff. Die Netzwerkadresse kann sich ändern. Bei Bedarf muss Node.js in der Windows-Firewall für **private Netzwerke** freigegeben werden; die App ändert keine Firewallregeln.

Die ausgelieferte HTTP-Konfiguration ist für euer vertrauenswürdiges privates Netzwerk gedacht. Sie ist nicht als öffentliche Internetbereitstellung konfiguriert. Für Zugriff über fremde Netze wäre separat ein sicherer Zugangsweg mit HTTPS/VPN einzurichten. Es wurde dafür kein Dienst gebucht und kein Port im Router geöffnet. Vorhandene Hardware, Strom und Internet werden natürlich weiter benötigt; die Software erzeugt keine API- oder Hostinggebühren.

## Was dauerhaft funktioniert

- Aufgaben anlegen, zuordnen, terminieren, bearbeiten, abhaken und löschen.
- Dienstleister mit Kontakt, Website, Region, Status, nächster Aktion und Notizen verwalten.
- Angebote hochladen oder Text einfügen; Originale speichern und lokal auswerten.
- Erkannte Angaben mit Original, erkanntem Seitentext und Seiten-/Textfundstellen prüfen und korrigieren. Manuelle Eingabe bleibt möglich.
- Geprüfte Angebote samt Quellen, offenen Fragen und persönlicher Entscheidung vergleichen. Bis zu vier Angebote nebeneinander, Kategorien und Suche.
- Mehrere Angebotsfassungen beim selben Dienstleister zusammenhalten. Ein neues Original erzeugt einen neuen Angebotseintrag; Korrekturen desselben Eintrags werden versioniert. Frühere gespeicherte Stände bleiben im Änderungsverlauf der Datenbank und im Export erhalten.
- Buchungen ausdrücklich bestätigen. Der bestätigte Betrag wird genau einmal als beauftragt erfasst. Ein Angebot verändert das Budget nicht automatisch.
- Kosten als geschätzt, unverbindliches Angebot oder beauftragt erfassen. Gezahlte und offene Beträge, Fälligkeit, Zielbudget und Obergrenze unterscheiden.
- Szenarien mit 180, 200 oder 220 Gästen und separat gespeicherten Fix-/Pro-Kopf-Annahmen berechnen. Unbekannt ist nicht null Euro.
- Gäste, Haushalte, Kinder/Begleitung, Essenswünsche, Hinweise und optionale Tischangabe verwalten. Einladung und Rückmeldung getrennt je Veranstaltung.
- Standesamt, tamilische Zeremonie und Reception mit Datum, Ort, Gästegröße, Ablauf und selbst gewählten Traditionen bearbeiten.
- Unterlagen erneut öffnen oder herunterladen; Planungsdaten einschließlich Auswertungen als JSON exportieren.
- Zwei private Zugänge, Passwortänderung, Abmeldung, Einladungswiderruf und Konflikterkennung bei gleichzeitiger Bearbeitung.

## Excel-Gästelisten

Unter **Gäste → Excel importieren** lassen sich `.xlsx`-Dateien bis 2 MB einlesen. Die Datei wird im Browser gelesen; es wird keine Arbeitsmappe an einen Auswertungsdienst übertragen. Tabellenblatt, Namens-/Anzahlspalten und Veranstaltungen sind vor dem Import prüfbar. Bis zu 500 Einträge können gemeinsam gespeichert werden.

Familien können als Gruppe mit ihrer Personenzahl übernommen werden. Es werden keine erfundenen Einzelpersonen angelegt. „x“ wird als **Vorgesehen** behandelt, ausdrücklich genannte Zusagen/Absagen getrennt je zugeordneter Veranstaltung. Fehlende Zuordnungen bleiben **Nicht angegeben**. Namensgleichheiten werden angezeigt und standardmäßig ausgelassen; ein gleicher Name ist kein sicherer Identitätsnachweis. Bestehende Einträge werden nicht überschrieben. Der Sammelimport wird transaktional gespeichert und kann nach einer unterbrochenen Antwort ohne doppelte Einträge wiederholt werden.

Die Szenario- und Budgetannahmen ändern sich durch einen Gästeimport nicht automatisch. Bei einer Gruppenrückmeldung zählt die angegebene Personenzahl für die gesamte Gruppe; bei unterschiedlichen Rückmeldungen die Gruppe entsprechend in Einträge aufteilen.

## Angebotsauswertung ohne API-Kosten

Unterstützt: **PDF, PNG, JPG, WebP und UTF-8-TXT**, alternativ eingefügter Text. Maximal 15 MB pro Datei, 20 PDF-Seiten und 20 Megapixel je gerenderter Seite/Bild. Der lokale Dokumentenspeicher ist auf 2 GB begrenzt. Word- und E-Mail-Dateien bitte als PDF exportieren oder ihren Text einfügen. Ein aus einer E-Mail heruntergeladenes PDF/Bild kann direkt hochgeladen werden.

PDFs mit Text werden direkt gelesen. Gescannte oder textarme Seiten und Bilder werden mit lokal installierten deutschen und englischen OCR-Sprachdateien erkannt. Alle Sprachdaten sind npm-Abhängigkeiten; während der Auswertung wird kein CDN und keine externe KI aufgerufen. OCR läuft in einem separaten Worker mit Zeit- und V8-Speicherlimit. Eine unterbrochene Auswertung kann wiederholt werden; das Original bleibt für manuelle Prüfung erhalten.

Die Regeln übernehmen nur ausdrücklich erkennbare Angaben. Beispielsweise wird „Gesamtpreis: 3.200,00 EUR“ als Preis vorgeschlagen. Bei mehreren unterschiedlichen Gesamtpreisen bleibt er offen. Anzahlung, Restbetrag und optionale Extras werden nicht zum Paketpreis gemacht. Nicht beschriftete, komplexe oder sprachlich uneindeutige Angebote erfordern mehr manuelle Ergänzung. Die Texterkennung kann Zeichen, Zeilen und Tabellen falsch lesen. Deshalb ist die ausdrückliche Prüfung vor der Übernahme verpflichtend.

Erfasst werden Anbieter, Kontakt, Kategorie, Veranstaltungen, Paket, Angebotsdatum, Gültigkeit, Preis/Währung/Preisbasis, Anzahlung/Rest, Zahlungsbedingungen, enthaltene/ausgeschlossene/optionale Leistungen, Zusatzkosten, Foto-/Videoumfang, Team, Dauer, Lieferzeit, zusätzliche Stunden und offene Fragen. Fehlendes bleibt „nicht angegeben“. Es wird kein „bester Anbieter“ automatisch bestimmt.

## Speicher & Backup

Der Server legt **`.wedding-data/`** neben dem Projekt an:

- `wedding.sqlite` sowie SQLite-WAL-Dateien: Konten, Sitzungen, Planung, Angebote, Auswertungen und Änderungsverlauf.
- `documents/`: privat gespeicherte Originale mit zufälligen internen Dateinamen.
- `ocr/`: lokale Sprachdateien für die Texterkennung.

Dieser Ordner und `.env*` werden von Git ausgeschlossen und vom Webzugriff gesperrt. **Nicht löschen, wenn ihr die App aktualisiert.** Ein optionales `WEDDING_DATA_DIR` kann beim Serverstart als Umgebungsvariable einen anderen Speicherort festlegen. `PORT` und `HOST` lassen sich ebenso über Umgebungsvariablen setzen. `.env.example` ist nur Dokumentation, kein automatisch geladenes Serverprofil.

Vollständiges Backup von Datenbank und allen darin referenzierten Originalen:

```sh
npm run backup
```

Das Ergebnis liegt in **`.wedding-backups/<Zeitpunkt>/`**. Der SQLite-Snapshot ist auch bei laufendem Server konsistent. Das Backup enthält private Planungsdaten und Konten; deshalb separat und privat sichern. Für Wiederherstellung: Server stoppen, den bisherigen Datenordner separat sichern und `wedding.sqlite` sowie `documents/` aus dem Backup in einen leeren Datenordner kopieren. Danach starten. OCR-Sprachdateien werden bei Bedarf lokal aus den installierten Paketen erneut kopiert. Das JSON aus der Oberfläche ist ein Datenexport; Originaldateien sind separat herunterzuladen oder über das vollständige Backup zu sichern.

Passwörter werden mit zufälligem Salt und scrypt gehasht. Sitzungen verwenden zufällige, nur gehasht gespeicherte Tokens und HttpOnly-/SameSite-Cookies. Zustandsänderungen benötigen einen CSRF-Token. Fremde Origins und unbekannte Hosts werden abgelehnt. Es gibt keine öffentliche Registrierung nach dem ersten Konto; der zweite Zugang benötigt eine gültige Einladung. Hochgeladene Dateien sind nur nach Anmeldung erreichbar. Dateigröße, tatsächlicher Dateityp, Eingaben und Schreibversionen werden serverseitig geprüft. Die lokale Datenbank ist nicht zusätzlich dateiverschlüsselt; den Rechner und Backups mit den vorhandenen Betriebssystem-Zugriffsschutzfunktionen schützen.

## Verbindlicher Ausgangsstand

2027, konkretes Datum offen; Berlin und nahes Brandenburg, maximale Entfernung offen. Standesamt, tamilische Zeremonie und Reception. 180–220 Gäste bei der größten Feier, Zuordnung und Einzelzahlen offen. Keine religiösen Vorgaben.

Initial ausschließlich Saal: 1.000 € beauftragt, 500 € gezahlt, 500 € offen. Name, Adresse, Termin und Zahlungsfrist nicht angegeben. Foto-/Videoangebote liegen extern vor, wurden noch nicht bereitgestellt. Musik organisiert, Preis und Zahlungsstatus offen. Outfits und Styling selbst organisiert, Kosten offen. Catering wird persönlich betreut und bleibt ungebucht. Zielbudget und Obergrenze offen. Es werden keine Demo-Anbieter oder erfundenen Preise in eure Datenbank eingetragen.

## Prüfen

```sh
npm run build
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Die Tests verwenden getrennte temporäre Datenbanken und synthetische Dokumente. Sie prüfen Anmeldung, CSRF, Einladungen, gemeinsame Sicht, konkurrierende Änderungen, dauerhafte Speicherung über Serverneustart, private Originale, echte Screenshot- und Scan-PDF-OCR, fehlende Preise, einmalige Buchung, Gästeantworten pro Feier, Browserabläufe, Desktop und Mobilansicht. Eure echte `.wedding-data` wird nicht für Tests verwendet.

Technische Grundlagen: [Node SQLite](https://nodejs.org/api/sqlite.html), [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [PDF.js Node-Beispiel](https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/pdf2png.mjs).

Die Cloud-SQL-Tests in `tests/event-renaming.test.mjs` verwenden [PGlite](https://pglite.dev/docs/) als ausschließlich lokale Postgres-Instanz im Arbeitsspeicher. Sie benötigen keine Cloud-Zugangsdaten und prüfen auch den vollständigen Rollback bei einem Fehler in einer verknüpften Änderung. Die Bibliothek ist nur eine Entwicklungsabhängigkeit. Die Suite unter `tests/cloud/` setzt dagegen eine leere Fixture-Umgebung voraus und darf niemals gegen die bereits genutzte Produktion laufen.

Die Migration zur sicheren Veranstaltungsumbenennung liegt zusätzlich lesbar in `cloud/event-renaming.sql`. Sie ändert keine bestehenden Planungsdaten; erst eine ausdrücklich gespeicherte Namensänderung aktualisiert zugeordnete strukturierte Verweise innerhalb derselben Transaktion. Originalzitate und Gästerückmeldungen mit Veranstaltungs-ID bleiben erhalten.
