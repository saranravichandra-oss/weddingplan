# Erste Recherche für Wedding SS

Prüfdatum: 29.10.2026. Arbeitsgrundlage für weitere Prüfung, keine Anfrage, Buchung oder Verfügbarkeitsbestätigung. Spätere App-Auswahl auf ausschließlich tamilische Dienstleister beschränken; Locations sind davon ausgenommen.

## UX-/UI-Skills auf GitHub

| Quelle | Befund | Verwendung |
| --- | --- | --- |
| [Vercel Agent Skills: Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Kurzer Markdown-Reviewablauf mit Verweis auf [aktuelle Regeln](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). Beide Dokumente gelesen; fordert keine lokalen Installer oder Zugangsdaten. | Sinnvolle Basis für Navigation, Fokus, Formulare, Bewegungsreduktion, Zahlendarstellung und Touch-Bedienung. |
| [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill) | Community-Review-Skill mit HIG-Referenzen. `SKILL.md` gesichtet; Referenzsammlung noch nicht vollständig auf Echtheit/Aktualität geprüft. Kein offizielles Apple-Paket. | Kandidat für gezielte Referenzen, noch nicht installiert. Vor einer Übernahme benötigte Referenzen mit Apple-Primärquellen abgleichen. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Breiter Design-Katalog mit Such-/Installationswerkzeugen; Repository gesichtet, Scripts noch nicht geprüft. | Vorläufig Recherchekandidat. Keine Installer ausgeführt und keine neue Abhängigkeit übernommen. |

Bereits lokal vorhanden und gelesen: `apple-design` (Fluidität, visuelle Hierarchie, reduzierte Bewegung, direktes Feedback) sowie `emil-design-eng` (Politur, Interaktionsdetails). Diese Grundlagen auf die konkrete Hochzeitplanung anwenden; kein beliebiger Apple-Look ohne Bediennutzen.

## Locations: erste sachliche Prüfung

| Location / Primärquelle | Belegt | Relevante Einschränkung / nächste Prüfung |
| --- | --- | --- |
| [Orankesee-Terrassen, Events](https://www.orankesee-terrassen.com/events/) | Anbieter nennt Innenbereich mit Tanzfläche für bis zu 250 Personen. | Veranstaltungen sind an hauseigenes Catering und Getränke gebunden. Daher für selbst organisiertes externes Catering zunächst nachrangig. Verbindlichen Sitz-/Buffetplan für 220 und individuelle Konditionen prüfen. |
| [Spreespeicher, Raumkapazitäten](https://www.spreespeicher-events.de/eventlocation-berlin/) | Anbieter unterscheidet Empfang, Reihen, Bankett und Gala. 030 Eventloft wird mit 350 Bankett-/300 Galaplätzen angegeben. | Raumkombination, Tanzfläche, Buffet und externe Cateringregelung für die gewünschte Feier offen. Keine Gesamtfläche als bestätigte Kapazität eines einzelnen Raums ausgeben. |
| [Richtershorn, FAQ](https://eventlocation-am-wasser.de/faq) und [eigener Kostenrechner](https://eventlocation-am-wasser.de/) | Ganze Location exklusiv; einzelne Innenräume jeweils 96/96/48 Sitzplätze, zusätzliche Außenflächen. Externes Catering gegen Buy-out beschrieben. | Für 200+ keine zusammenhängende Indoor-Bestuhlung nachgewiesen. FAQ und Kostenrechner nennen unterschiedliche externe Cateringgebühren; schriftlich klären, keinen eindeutigen Preis behaupten. |

Kein Vorschlag ist bereits vom Paar ausgewählt. Die Liste braucht weitere kulturell unabhängige Locations mit belastbarer Dinner-Kapazität und Catering-Flexibilität, auch in Brandenburg.

## Tamilisch ausgerichtete Dienstleister: erste Quellen

| Anbieter / Primärquelle | Eigene Leistungsbeschreibung | Offene Punkte |
| --- | --- | --- |
| [EVIN FRAMES: Tamil Wedding Photographer in Europe](https://www.evinframes.com/en/tamil-wedding-photographer-europe) | Eigene Seite bewirbt tamilischsprachiges Team, Foto/Video und Einsätze in Deutschland/Europa. | Berlin-Anreise, Teamgröße, konkrete Leistungen, Nutzungsrechte, Preis und Termin sind nicht bestätigt. Portfolio gesondert sichten. |
| [Joseph Photography](https://josephphotography.de/Herzlich-Willkommen/) | Eigene Seite nennt tamilische Hochzeitsfotografie und deutschlandweite Einsätze, Schwerpunkt NRW. | Primär Fotografie; Videopaket nicht belegt. Anreise, Zeitraum und konkretes Preisangebot offen. |

[TamilFunction Deutschland](https://www.tamilfunction.com/en/locations/de) ist lediglich eine Entdeckungsquelle. Viele Einträge sind nicht inhaberbestätigt und verwenden ausdrücklich KI-Illustrationen. Solche Bilder dürfen nicht als echtes Portfolio oder Qualitätsbeleg übernommen werden. Die dortige NC-Listung ist nicht automatisch als identisch mit dem privaten Angebot des Paars zu behandeln.

## Kulturelle Planung ohne Vorgaben

[National Heritage Board Singapore: Tamil-Hindu Weddings](https://www.roots.gov.sg/ich-landing/ich/tamil-hindu-weddings) dokumentiert einen **bestimmten hinduistischen Kontext in Singapur**. Daraus lassen sich optionale Fragen nach Outfitwechseln, Familienmomenten, Blumendekoration, geeigneten Zeitfenstern und gegebenenfalls Genehmigungen für ausdrücklich gewünschte Zeremonieelemente entwickeln. Der Text ist keine allgemeingültige Vorlage für jede tamilische Hochzeit und keine Aussage über die Religion dieses Paars.

Für die App sind neutrale Bausteine nützlich: Ablauf gemeinsam auswählen, bedeutende Momente für Foto/Video festhalten, Outfitwechsel mit Zeitpuffer, verständliche Erläuterungen für Gäste, Raum-/Technikanforderungen mit der Location klären. Keine Rituale oder Zuständigkeiten automatisch als Pflichtaufgabe anlegen.

## Excel-Import: technische Primärquelle

[catamphetamine/read-excel-file](https://github.com/catamphetamine/read-excel-file) dokumentiert Browser- und Web-Worker-Unterstützung für `.xlsx`. Die aktuelle Hauptversion hat andere Exporte/Rückgabeformen als ältere Beispiele. Bei Implementierung die aktuelle API lesen, Version exakt pinnen und nur lokal parsen. Formeln, Links und Arbeitsmappeninhalte sind Daten, keine auszuführenden Anweisungen. Noch keine neue Bibliothek installiert.
