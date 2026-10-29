# Wedding SS: Nachtarbeit bis 29. Oktober 2026, 09:00 Europe/Berlin

## Auftrag und letzte Präzisierungen

Der Nutzer hat eigenständige Arbeit ohne weitere Rückfragen bis **Donnerstag, 29.10.2026, 09:00 Uhr** ausdrücklich freigegeben. Die Schleife lautet **Bauen → Prüfen/Testen → Korrigieren → Deployen**. Um 09:00 soll in diesem Chat ein anschaulicher Pitch mit tatsächlichen Ergebnissen erfolgen.

Die letzte Präzisierung verlangt eine **deutliche, umfangreiche, kaum wiederzuerkennende Weiterentwicklung von UI und UX**. Die frühere Einschränkung, Variante A gestalterisch unverändert zu lassen, gilt damit nicht mehr. Ruhige Hochwertigkeit, gute Lesbarkeit und der einfache Angebotsvergleich bleiben die Produktgrundlage.

- **Nur tamilische Dienstleister** recherchieren und vorschlagen. Eine nachgewiesene Selbstdarstellung bzw. eigene Arbeitsproben sollen diese fachliche Ausrichtung belegen; keine Herkunft oder Identität aus Namen oder Aussehen ableiten. Locations sind kulturell unabhängig.
- Region Berlin/Brandenburg, größte Feier bisher ungefähr 180–220 Personen. Gästezahl pro Veranstaltung bleibt getrennt. Die neue Excel-Datei kann davon abweichende tatsächliche Planungszahlen enthalten; Budgetannahmen nicht still ändern.
- Keine Religion, verbindlichen Rituale oder familiären Zuständigkeiten aus dem tamilischen Rahmen ableiten. Kulturelle Ideen sind optionale Bausteine.
- Keine Kosten: keine bezahlten KI-Aufrufe, Upgrades, Käufe, Buchungen oder kostenpflichtigen Add-ons. Keine Nachrichten an Anbieter oder Dritte versenden.
- Private Originale, Konten, Korrekturen und Planungsdaten erhalten. Keine echten Daten oder XLSX-Inhalte ins Git-Repository schreiben.
- Neue Recherchevorschläge nicht automatisch als persönlich ausgewählt, angefragt, zugesagt oder gebucht speichern.

## Laufzeit und Automationen

Es bestehen zwei aktive Heartbeat-Automationen im selben Chat:

- `wedding-ss-ausbau-bis-09-uhr`: einminütige Wiederanlaufabsicherung, endet zum vereinbarten Morgen. Kontinuierlich im laufenden Turn arbeiten, nicht zwischen Arbeitsabschnitten 15 Minuten warten.
- `wedding-ss-pitch-um-09-uhr`: einmalige Übergabe um 09:00 Europe/Berlin.

Die Termine wurden auf die letzten Präzisierungen aktualisiert. Nur bei wesentlichen Änderungen oder tatsächlichen Problemen melden; keine wiederholten Statusmeldungen ohne Fortschritt. Ein laufender Turn kann länger als ein Intervall dauern. Nicht gleichzeitig dieselben Dateien bearbeiten oder bereits erledigte Arbeit neu beginnen. Vor 09:00 keine große unfertige Baustelle eröffnen.

## Tatsächlicher Ausgangsstand

- Repository: `saranravichandra-oss/weddingplan`, Branch `main`, letzter veröffentlichter UI-Commit `56b4ddc`. Beim Fortsetzen zuerst `git status` und tatsächlichen HEAD prüfen.
- Produktiv: https://weddingplan-ace-d963.vercel.app
- Vercel-Projekt: `prj_CtSXYFdb3iArsv26OmBG6Mrf3JO3`, Team `team_r9YzGG5jmR2allqRgNIcVDWr` (ACE). Kostenlose Hobby-Bereitstellung. Letztes bekanntes READY-Deployment `dpl_7ux7R7m5DeMfjZc312Wxq5FURfu3`, UI-Code aus Commit `56b4ddc`.
- Supabase-Free-Projekt: `dprpnsocrmrnkmaqibxs`, Wedding SS, Frankfurt. **Vizha V2 nicht verändern.**
- Bestehende echte Planung einschließlich Zugang und PDF ist bereits migriert. Einmaliger Migrationsschlüssel ist serverseitig gelöscht. Die lokale `.wedding-data` ist nur noch eine schreibgeschützte Sicherung; der alte localhost-Tab ist nicht mehr der Arbeitsort.
- Passwörter und Originalsicherheit wurden nach der Migration geprüft. Private Test-/Migrationsunterlagen ausschließlich im ignorierten `.wedding-cloud`.
- Authentifizierung: eigene opaque HttpOnly/Secure/SameSite-Sitzung plus CSRF, zwei private Konten, Einladungslink. Kein OpenAI-Schlüssel oder kostenpflichtiger Modellaufruf.
- PDF-Text/Bild-OCR arbeitet online im Browser mit selbst gehosteten Sprachdateien. Originale liegen privat in Supabase Storage, die gemeinsame Planung in Postgres. Vercel ist ein stateless API-Proxy.
- Die bereitgestellte echte Angebots-PDF wurde im Browser auf der Produktivadresse geprüft; Anbieter, Gesamtpreis, Foto-/Videoumfang, Team, Aufnahmezeit, Lieferzeiten und Teilpreise werden erkannt. Alte manuelle Korrekturen bleiben erhalten. Ergänzte Felder werden nach erneuter Prüfung gespeichert.

## Prioritäten für die nächsten Arbeitszyklen

### 1. Excel-Gästeimport und richtige Zählung

Der Nutzer hat eine echte `Gästeliste.xlsx` unter seinem lokalen Wedding-Ordner bereitgestellt und möchte sie hochladen können. Sie wurde **nur lesend** mit dem Spreadsheet-Skill geprüft. Rohdaten und genaue private Diagnose liegen in `.wedding-cloud/diagnostics/guest-workbook.json`. Nicht in öffentliche Tests kopieren.

Die Tabelle verwendet zwei Kopfzeilen, eine Namens-/Familien-Spalte, `Anz.` und Markierungsspalten `beides`, `thaali`, `rezeption`. Sie enthält Familien/Gruppen und Einzelpersonen. X-Markierungen sind **keine nachgewiesenen Zusagen**; die übergeordnete Bezeichnung `Prio` macht selbst den Versand einer Einladung ungewiss.

Implementierung:

1. XLSX im Browser lesen, Tabellenblatt/Kopfzeile und Spalten zuordnen, klare Vorschau vor jeder Speicherung. Benutzer kann Veranstaltungszuordnung kontrollieren; `beides` darf nicht automatisch das Standesamt einschließen.
2. Eine Familie mit Anzahl 5 darf nicht als eine Person gezählt oder in fünf erfundene Namen zerlegt werden. Gruppen mit `partySize` und neutralem Typ modellieren; bekannte Einzelpersonen bleiben bearbeitbar. Bestehende Gäste ohne neues Feld zählen weiterhin als eine Person.
3. Gäste-/Zusagenzählung, Tabellen und Editor entsprechend ergänzen. Vorläufige Zuordnung als `Vorgesehen` o. ä. abbilden, getrennt von `Eingeladen`, `Zugesagt`, `Abgesagt`. Leere Zuordnungen bleiben offen.
4. Dubletten in Datei und Bestand anzeigen, standardmäßig überspringen, Namen allein nicht als sicheren Identitätsbeweis behandeln. Keine bestehenden Gäste überschreiben. Wiederholung desselben Imports idempotent behandeln.
5. Sammelimport serverseitig validieren und transaktional ausführen, damit keine halbe Liste entsteht. Kleine Zahl von Anfragen statt einer Anfrage pro Gast. Auth/CSRF und Versionskonflikte erhalten.
6. Neue Bibliothek wurde primär dokumentiert geprüft und exakt gepinnt: `catamphetamine/read-excel-file` `9.3.13`. Aktuelle Browser-API mit Array aus Tabellenblattobjekten implementiert und im Browser getestet.
7. Nur synthetische Fixtures committen. Die echte Datei zusätzlich in einer ignorierten lokalen Diagnose gegen die Vorschau prüfen. Bei unklarer Bedeutung keine persönlichen Rückmeldungen erfinden. Der Import soll morgens konkret nutzbar sein; keine weitere Rückfrage an den Nutzer.

### 2. Deutliche UI-/UX-Überarbeitung

Designrichtung: eine hochwertige persönliche Planungswerkstatt mit großzügiger Typografie, klarer Priorität pro Bildschirm, ruhigem Papier-/Salbei-Farbraum mit stärkeren Kontrasten und einer besser für Mobilgeräte geeigneten Navigation. Sichtbar mehr Veränderung als einzelne Abstände oder Animationen. Keine beliebigen Glasflächen oder Dekoration ohne Bedienvorteil.

| Before | After | Warum |
| --- | --- | --- |
| Kleine, dichte Textflächen, zahlreiche gleich gewichtete Panels | Klarer Seitenfokus, besser lesbare Texte, starke Gesamtpreise und große Touch-Ziele | Weniger Suchaufwand, nutzbar auf dem Handy |
| Navigation nur im Arbeitsspeicher; Neuladen führt zur Übersicht | Verlinkbare Bereiche mit URL-Zustand und funktionierender Zurück-Navigation | Orientierung beim gemeinsamen Planen |
| Lange Angebotsprüfung mit kleinen Textareas | Kurzer Hauptablauf, größerer Leistungsumfang, nachvollziehbare Fortschrittsanzeige und verlässliches Original | Upload soll Arbeit abnehmen |
| Ungespeicherte Korrekturen können beim Schließen verloren gehen | Verständliche Entwurfs-/Wiederaufnahmefunktion mit Kontotrennung und ohne ungeprüftes Speichern | Vertrauen und Fehlertoleranz |
| Breite Tabelle ist auf dem Handy mühsam | Mobile lesbare Angebotsübersicht, Desktop weiterhin nebeneinander | Einfacher Vergleich von Gesamtpreis und Leistungen |

Vorhandenen Apple-Design-Skill und die recherchierten Vercel Web Interface Guidelines anwenden. Reduzierte Bewegung, Tastaturfokus, Kontrast, lange Texte, leere Zustände, Fehler und kleine Bildschirme prüfen. Keine neue schwere Animationsbibliothek ohne konkreten Nutzen.

### 3. Umfangreiche, belegte Vorauswahl und Inspiration

- Nur tamilisch ausgerichtete Foto-/Video-, Deko-, Catering- und bei Bedarf weitere Dienstleister. Musik ist laut Brief bereits organisiert; Styling und Catering organisieren sie selbst, aber Angebote sollen trotzdem planbar sein.
- Locations für sitzendes Dinner mit Tanzfläche und Buffet für 180–220 Personen prüfen, nicht nur Stehkapazität oder Gesamtfläche. Externes Catering, Regenalternative, Auf-/Abbauzeiten, Veranstaltungsschluss und eventuelle Zusatzgebühren offenlegen.
- Eigene Websites und Portfolios verwenden; Verzeichnisse nur zur Entdeckung. Keine frei erfundenen Preise, Bewertungen, Kontakte oder Verfügbarkeiten. Öffentliches Paket ist noch kein persönliches Angebot.
- Auswahl in der App als erkennbare recherchierte Vorschläge anbieten, mit Quellen, Prüfdatum, offenen Fragen und bewusstem Übernehmen in die eigene Planung. Persönliche Liste nicht still auffüllen.
- Kurze optionale kulturelle Planungsbausteine; keine verbindliche religiöse Vorlage.
- Erste Quellen und Prüfergebnisse in `docs/research/2026-10-29-initial-research.md`.

### 4. Stabiler Abschluss und Pitch

Jede abgeschlossene Änderung passend testen, korrigieren, committen/pushen und erst dann deployen. Nach erfolgreicher Prüfung nicht ohne neuen Anlass endlos dieselben Tests wiederholen. Gegen 08:30 den Umfang stabilisieren und einen kurzen, anschaulichen Pitch vorbereiten: Vorher/Nachher, Live-Demo, einfache Nutzerreise, recherchierte Shortlist und die nächsten Entscheidungen des Paars.

## Prüfung und Deployment: wichtige Schutzregeln

- `npm test` baut die lokale Version und verwendet isolierte Testdatenbanken. Die bestehenden Tests prüften zuletzt 16 Node-Tests und 6 Browserabläufe erfolgreich.
- `npm run build:cloud` schreibt nach `dist-cloud`; `npm run build` nach `dist`. Niemals die lokale SQLite-App mit einem Cloud-Build in `dist` ersetzen.
- **`tests/cloud/app.spec.ts` keinesfalls gegen die echte Produktion ausführen.** Diese Suite erwartet absichtlich eine leere synthetische Datenbank aus der Zeit vor der Migration. Echte Daten dürfen niemals für Fixture-Tests gelöscht werden.
- Cloud-Änderungen möglichst mit einem lokalen Testadapter und isolierter Datenbank prüfen. Produktive Smoke-Tests sind lesend bzw. anonym; für zusätzliche Tests keine Testkonten dauerhaft in der echten Planung hinterlassen.
- Kein Supabase-Service-Role-Key im Client oder Vercel-Bundle. Er wird nur in der Supabase Edge-Runtime verwendet. `.wedding-cloud`, `.wedding-data`, `.env*`, Backups und XLSX-Inhalte sind ignoriert und dürfen nie hochgeladen werden.
- Für Datenbankschemaänderungen vorhandene Struktur prüfen, sichere Migration und RLS/Service-only-Funktionen erhalten. Supabase-Skill beachten.
- GitHub-Anbindung fehlt bei Vercel. Connector kann geprüfte lokale Source-Dateien via `upload_file` (Base64 + SHA1 + Byte-Länge) und `create_deployment` ausliefern. Bisheriges Manifest: `src/**`, `api/**`, Root-Dateien `package.json`, `package-lock.json`, `tsconfig.json`, `index.html`, `vercel.json`, ggf. `vite.config.ts`, und `scripts/prepare-browser-ocr.mjs`. Für neu hinzugefügte Worker/Public-Assets passend erweitern. Niemals pauschal den Workspace hochladen.
- `create_deployment`: bestehende Projekt-/Team-ID, `target=production`, `framework=vite`, `npm run build:cloud`, `dist-cloud`, `npm ci`, Node 24. Geprüften Commit als Metadaten angeben. Uploads in begrenzten Gruppen ausführen; `exec_command` kann Session-IDs statt fertigem Dateiinhalt liefern, dann mit `write_stdin` vollständig auslesen.
- Supabase-Funktion `wedding-api` benötigt `cloud/index.ts`, `cloud/handler.mjs`, `cloud/deno.json` sowie importierte `server/validation.mjs`, `server/extract.mjs` und gegebenenfalls neue Shared-Dateien. Eigene Sessionprüfung rechtfertigt `verify_jwt=false`; nicht versehentlich öffentliche Setup-Routen aktivieren.
- Nach Veröffentlichung READY und korrekten Commit prüfen. Öffentliche Startseite und `/api/auth/status` müssen funktionieren, `/api/state` ohne Cookie muss 401 liefern. Betroffene UI funktional auf Desktop und Handy prüfen. Nur tatsächlich Getestetes behaupten.

## Fortschritt

- [x] Nachtarbeit und 09:00-Pitch eingerichtet, Datum vom Nutzer bestätigt.
- [x] Automationsprompts auf große UI-/UX-Überarbeitung und ausschließlich tamilische Dienstleister aktualisiert.
- [x] Lokalen Apple-Design-Skill und Skill Scout gelesen; GitHub-Kandidaten und Primärquellen gesichtet.
- [x] Neue Excel-Datei nur lesend analysiert, private Diagnose ignoriert abgelegt.
- [x] Excel-Import, Gruppen-/Personenzählung und Vorschau implementiert/getestet/deployt. Commit `fae6df9`, Vercel READY `dpl_BJgWwC8CuRSqYmQECgqV8ZEEU1Dv`, Supabase Edge v3. 20 Node-Tests, bisherige 6 Browserabläufe und zusätzlicher vollständiger XLSX-Importablauf erfolgreich. Echte XLSX nur lesend gegen Parser geprüft. Neue SQL-RPC in einer zurückgerollten Transaktion auf Idempotenz und richtige Personenzahl geprüft; keine Testgäste produktiv hinterlassen. Produktiver Anonymenschutz 401 bestätigt.
- [x] Sichtbare Atelier-UI-/UX-Überarbeitung implementiert/getestet/deployt. Commit `c7ed3a7`, READY `dpl_2mhMeMmj8UswY386tziqQnkdZ7WK`. Acht Browserabläufe und danach zwei gezielte Mobil-/Navigationstests erfolgreich, Screenshots visuell geprüft.
- [x] Recherchierte Vorauswahl in App nutzbar und belegt: 14 Vorschläge, acht tamilisch ausgerichtete Dienstleister, sechs Locations. Commit `b60b72f`, Vercel READY `dpl_889wsoxXCqLGp4PK4rV8WKDfcUKQ`. Elf Browserabläufe erfolgreich. Produktiver Source-Bundle mit Recherche-/Entwurfscode geprüft, Startseite 200, Auth-Status 200/paidApiCalls=false, private State-Route anonym 401.
- [ ] Pitch mit konkreter Demo vorbereitet.

Zum Fortsetzen zuerst tatsächlichen Git-/Dateistand prüfen; diese Liste nach jedem Arbeitszyklus mit Commit, Tests und Deploymentnachweis aktualisieren.

Dritter Arbeitsabschnitt abgeschlossen: Angebotsentwürfe tab-/kontogetrennt in `sessionStorage`, Wiederaufnahme nach Schließen/Neuladen, keine automatische Bestätigung. Bei gesperrtem Browser-Speicher Schließ-/Neuladeverlust abgefangen; Storage-Fehler verwandeln erfolgreiche API-Speicherung nicht in einen Fehler. Neue Seite `Entdecken` mit 14 quellenbelegten Vorschlägen in `src/discoveries.ts`, Kategorie-/Regions-/Merkenfiltern, explizitem Kontakt-Speichern, kopierbarem Anfragetext ohne Versand. Oben genannter Commit/Deployment veröffentlicht.

Vierter Arbeitsabschnitt veröffentlicht: neue Angebots-Kartenübersicht mit großen Gesamtpreisen, Foto-/Videoumfang, Team, Stunden, Lieferzeiten und Fundstellen; auf kleinen Bildschirmen voreingestellt. Umschalten zu „Nebeneinander“ für die Vergleichstabelle. Dieselben Bearbeitungs-/Favorit-/Buchungsaktionen werden gemeinsam gerendert. Alle gefilterten Angebote sind in der Kartenübersicht verfügbar; maximal vier in der Tabelle. Übersichtsseite weist auf Recherche hin. Nach dem Anmelden bleiben verlinkte Bereiche erhalten. Lokaler und Cloud-Build erfolgreich; zwei neue Browserabläufe für mobile Karten und Login-Link erfolgreich, danach Desktop-/Mobilbereiche, Texterkennung und Karten erneut erfolgreich. Screenshots geprüft. Commit `53aef8d`, READY `dpl_CzWkQ3ukusp1VQBFoqZyHYFvGRoy`, Produktivbundle enthält Karten und Login-Link-Erhaltung, Startseite 200/Authstatus 200/State anonym 401.

Fünfter Arbeitsabschnitt veröffentlicht: Gleichzeitige Angebotsbearbeitung mit Drei-Wege-Zusammenführung zwischen Ausgangsstand, eigenem Entwurf und aktueller gemeinsamer Fassung. Verschiedene Felder bleiben erhalten; konkurrierende Feldwerte erfordern Auswahl. Bestätigungscheckbox wird nach Übernahme zurückgesetzt; Zusammenführen allein schreibt nichts. Unterschiedliche Originale werden nicht vermischt, stattdessen gemeinsame Fassung übernehmen oder den eigenen Entwurf als separates geprüftes Angebot weiterführen. Baseline wird mit Tabentwurf gespeichert. Auch ein echter 409-Wettlauf während des Speicherns wird aufgefangen. 23 Node-Tests und vollständige 15 Browserabläufe erfolgreich, einschließlich beider paralleler Testkonten, Originaltrennung, Entwürfen, OCR und XLSX. Lokaler und Cloud-Build erfolgreich. Commit `56b4ddc`, READY `dpl_7ux7R7m5DeMfjZc312Wxq5FURfu3`, produktiver Bundle enthält Zusammenführung, Startseite 200/State anonym 401. Separater anonymer In-App-Prüftab zeigte korrekt die Anmeldung und keine Browserwarnungen/-fehler. Keine echte Sitzung geöffnet oder Zugangsdaten benötigt.

Aktueller sechster Arbeitsabschnitt (noch uncommittet): 16 Recherchevorschläge, davon acht Locations. BOLLE Festsäle und Stadtgut Berlin-Buch mit Primärquellen ergänzt; Locationfilter für eigenen Caterer und ausdrücklich belegte Sitzbestuhlung. Allgemeine Personenkapazität wird nicht als Sitzplatzzahl für den Filter genutzt. Dekoration als eigene Kategorie. Sieben optionale Planungsimpulse unter Veranstaltungen, jeweils mit editierbarer Aufgaben-Vorbereitung und bewusster Speicherung, ohne vorgegebene Rituale, Zuständigkeiten oder Termine. Kultureller Quellenkontext klar als tamilisch-hinduistisches Beispiel in Singapur eingeordnet. Desktop-/Mobilbereiche und Recherchefilter erfolgreich getestet; Aufgaben-Vorbereitung auf Handy erfolgreich getestet und Screenshot geprüft. Ein Test suchte ein Select per Label-Volltext inklusive Optionen; auf die zugängliche Combobox-Rolle korrigiert. Dialogtitel für neue vorausgefüllte Einträge korrigiert. Lokaler und Cloud-Build erfolgreich. Nächster Schritt: committen/pushen/deployen und READY/Produktionsschutz prüfen.

Weitere sinnvolle Arbeit: optionale kulturelle Ablaufbausteine ohne Religionsannahmen; gezielte weitere Primärquellen für tamilische Dienstleister (keine erfundenen Verzeichnisprofile). Neue geprüfte Locations für nächsten Recherchezyklus: BOLLE Festsäle (eigene `bolle-events.com/eventlocation/festsaal/` nennt 400 Bankett / 510 Tafeln; eigene `/faq/` bestätigt cateringfreie Buchung samt Küche), Stadtgut Berlin-Buch (eigene `stadtgut-buch.de/die-scheune/` nennt 440 Bankett / 350 Gala, **Cateringpartnerbindung**; eigene `/agb/` nennt zusätzliche Sanitär-/Serviceanforderungen ab 200 Personen, daher schriftlich klären). Noch nicht in Appdaten eingepflegt. Recherche zu Styling ergab bisher vor allem unverifizierte Verzeichniseinträge, daher noch nicht als belegte Berliner Vorschläge übernommen. Keine Test- oder Beispieldaten in die echte Planung einfügen.
