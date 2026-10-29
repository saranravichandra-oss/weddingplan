export type Discovery = {
  id: string;
  name: string;
  category:
    | "Foto & Video"
    | "Catering"
    | "Dekoration"
    | "Outfits & Styling"
    | "Location";
  region: string;
  local: boolean;
  headline: string;
  summary: string;
  proof: string;
  facts: [string, string][];
  questions: string[];
  attention?: string;
  catering?: "frei" | "gebunden" | "offen";
  dinnerSeats?: number;
  sources: { title: string; url: string }[];
};

// Editorial research, separate from the couple's records. No inferred availability.
export const researchDate = "29.10.2026";
export const discoveries: Discovery[] = [
  {
    id: "kalyani",
    name: "Kalyani’s Kitchen",
    category: "Catering",
    region: "Berlin · Mitte",
    local: true,
    headline: "Chettinad aus Berlin.",
    summary:
      "Eine lokale Anlaufstelle für tamilisch geprägte Küche und Familienfeiern. Die Größe eurer Feier muss individuell abgestimmt werden.",
    proof:
      "Eigene Website: Wurzeln in Karaikudi, Tamil Nadu, und Chettinad-Küche; Catering für Veranstaltungen.",
    facts: [
      ["Küche", "Chettinad / Tamil Nadu"],
      ["Preis", "Individuelles Angebot offen"],
      ["Standort", "Alte Jakobstraße 87, Berlin"],
    ],
    questions: [
      "Können 180–220 Personen vor Ort versorgt werden?",
      "Sind Servicepersonal, Geschirr, Warmhaltung und Lieferung enthalten?",
      "Welche vegetarischen Menüs und Probiertermine sind möglich?",
    ],
    sources: [
      {
        title: "Küche & Catering · eigene Website",
        url: "https://www.kalyaniskitchen.de/",
      },
    ],
  },
  {
    id: "the-south",
    name: "THE SOUTH indian kitchen",
    category: "Catering",
    region: "Berlin · Moabit",
    local: true,
    headline: "Tamil-Nadu-Wurzeln. Öffentliche Menüpakete.",
    summary:
      "Catering mit vegetarischen und gemischten Menüs; das größere Paket nennt eine Live-Dosa-Station. Hochzeitsgröße und Ablauf sind noch abzustimmen.",
    proof: "Eigene Website nennt Tamil-Nadu-Wurzeln und Chettinad-Küche.",
    facts: [
      ["Classic", "14,90 € / Person · ab 15"],
      ["Smart", "19,90 € / Person · ab 15"],
      ["Luxury", "27,90 € / Person · ab 20"],
      ["Preisbasis", "Öffentlich, inkl. MwSt.; Endangebot offen"],
    ],
    attention:
      "Menüpreise sind kein vollständiges Hochzeitsangebot. Lieferung, Personal, Ausstattung und Kapazität für 180–220 Personen sind nicht bestätigt.",
    questions: [
      "Ist die Versorgung von 180–220 Gästen möglich?",
      "Welche Kosten kommen für Anfahrt, Service, Equipment und Aufbau hinzu?",
      "Welche Zutaten und getrennten Zubereitungen sind bei Allergien möglich?",
    ],
    sources: [
      {
        title: "Cateringpakete · eigene Website",
        url: "https://www.thesouthindiankitchen.de/catering",
      },
      {
        title: "Tamil-Nadu-Wurzeln",
        url: "https://www.thesouthindiankitchen.de/",
      },
    ],
  },
  {
    id: "anjappar",
    name: "Anjappar Berlin",
    category: "Catering",
    region: "Berlin · Mitte",
    local: true,
    headline: "Chettinad-Küche für euren Festtag.",
    summary:
      "Berliner Restaurant der aus Chennai stammenden Chettinad-Marke. Die Kontaktseite nennt Catering und Hochzeiten ausdrücklich.",
    proof:
      "Eigene Darstellung der Chettinad-Küche aus Tamil Nadu; keine Aussage über die persönliche Herkunft einzelner Mitarbeitender.",
    facts: [
      ["Küche", "Chettinad"],
      ["Standort", "Zimmerstraße 92, Berlin"],
      ["Preis", "Angebot offen"],
    ],
    questions: [
      "Ist externes Hochzeitscatering für 180–220 Personen möglich?",
      "Welche Menü-, Personal- und Lieferleistungen werden angeboten?",
      "Welche vegetarischen Varianten und Probekosten gibt es?",
    ],
    sources: [
      { title: "Restaurant & Küche", url: "https://anjappar-berlin.de/en/" },
      {
        title: "Catering & Hochzeiten",
        url: "https://anjappar-berlin.de/kontakt/",
      },
    ],
  },
  {
    id: "evin",
    name: "EVIN FRAMES",
    category: "Foto & Video",
    region: "Europa · Einsatz in Deutschland",
    local: false,
    headline: "Foto und Film mit tamilischsprachigem Team.",
    summary:
      "Gemeinsame Foto-, Video- und Drohnenbegleitung für tamilische Hochzeiten. Deutschland wird im europäischen Einsatzgebiet genannt.",
    proof:
      "Eigene Seite für tamilische Hochzeiten in Europa; tamilischsprachiges Team ausdrücklich genannt.",
    facts: [
      ["Leistungen", "Foto, Video, Drohne"],
      ["Einsatzgebiet", "Europa, einschließlich Deutschland"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    questions: [
      "Welche Anreise- und Übernachtungskosten fallen für Berlin an?",
      "Wie viele Foto- und Videografen begleiten welche Stunden?",
      "Welche Bildzahlen, Filmlängen und Lieferzeiten werden zugesichert?",
    ],
    sources: [
      {
        title: "Tamilische Hochzeiten in Europa",
        url: "https://www.evinframes.com/en/tamil-wedding-photographer-europe",
      },
    ],
  },
  {
    id: "joseph",
    name: "Joseph Photography",
    category: "Foto & Video",
    region: "NRW · deutschlandweit",
    local: false,
    headline: "Tamilische Hochzeitsfotografie aus NRW.",
    summary:
      "Fotograf mit tamilischer Hochzeitsausrichtung und eigenem Portfolio. Deutschlandweiter Einsatz wird angeboten; eine Videoleistung ist hier nicht belegt.",
    proof:
      "Eigene Selbstdarstellung als tamilischer Hochzeitsfotograf; eigene tamilische Hochzeitsserien.",
    facts: [
      ["Belegt", "Fotografie"],
      ["Video", "Nicht angegeben"],
      ["Berlin", "Reisebedingungen offen"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    questions: [
      "Wie hoch sind Paket- und Reisekosten nach Berlin?",
      "Welche Stunden, bearbeiteten Bilder und Lieferzeiten sind enthalten?",
      "Wird Video selbst oder über einen Partner angeboten?",
    ],
    sources: [
      {
        title: "Leistungen & Selbstdarstellung",
        url: "https://www.josephphotography.de/",
      },
      {
        title: "Eigenes Portfolio",
        url: "https://www.josephphotography.de/Portfolio/",
      },
    ],
  },
  {
    id: "nila",
    name: "Nila Decoration",
    category: "Dekoration",
    region: "Düren · Berlin-Reise offen",
    local: false,
    headline: "Tamilische Festdekoration und Maalai.",
    summary:
      "Eigene Beiträge zeigen Maalai und Thaali-Design; die Website stellt auch einen tamilischen Hochzeitssaal in Düren vor.",
    proof:
      "Eigene Website nennt tamilische Hochzeiten und zeigt entsprechende Leistungen.",
    facts: [
      ["Ausgangspunkt", "Düren"],
      ["Leistungen", "Dekoration, Maalai, Thaali-Design"],
      ["Preis", "Angebot offen"],
    ],
    attention:
      "Die gesichteten Beiträge sind von Juni 2024. Aktuellen Betrieb und Berliner Einsatz zuerst bestätigen lassen.",
    questions: [
      "Wird die Ausstattung nach Berlin geliefert und aufgebaut?",
      "Welche Dekoration, Blumen, Technik und Abbauzeiten sind enthalten?",
      "Was kosten Transport und individuelle Anpassungen?",
    ],
    sources: [
      {
        title: "Eigene Beiträge & Kontakt",
        url: "https://www.niladecoration.de/aktuelles",
      },
    ],
  },
  {
    id: "thushi",
    name: "Thushi-Deko",
    category: "Dekoration",
    region: "Deutschland · Berlin-Einsatz offen",
    local: false,
    headline: "Manavarai und Festdekoration zum Abstimmen.",
    summary:
      "Tamilische Hochzeitsdekoration mit Manavarai, Baldachin, Pallakku und weiteren Mietartikeln. Welche Elemente zu euch passen, entscheidet ihr.",
    proof:
      "Eigene Website bezeichnet das Angebot als tamilische Dekoration und führt entsprechende Ausstattungen auf.",
    facts: [
      ["Leistungen", "Dekoration / Mietausstattung"],
      ["Berlin", "Liefergebiet offen"],
      ["Preis", "Angebot offen"],
    ],
    questions: [
      "Ist Lieferung und Aufbau in Berlin möglich?",
      "Welche Maße, Blumen und Mietdauern sind im Paket enthalten?",
      "Welche Transport-, Auf-/Abbau- und Schadenskosten entstehen?",
    ],
    sources: [
      {
        title: "Eigene Leistungsübersicht",
        url: "https://thusi-deko.jimdoweb.com/",
      },
    ],
  },
  {
    id: "amani",
    name: "Amani Events",
    category: "Dekoration",
    region: "Croydon · London · internationale Einsätze",
    local: false,
    headline: "Tamilische Hochzeitsgestaltung mit Deutschland-Erfahrung.",
    summary:
      "Die eigene Website nennt tamilische Hochzeiten, individuelle Gestaltung und Koordination. Dekorations- und Veranstaltungsausstattung wird auch zur Miete angeboten.",
    proof:
      "Eigene Selbstdarstellung: Arbeit für die tamilische Community seit 2010; frühere Einsätze in Deutschland ausdrücklich genannt.",
    facts: [
      ["Leistungen", "Gestaltung, Koordination und Mietausstattung"],
      ["Standort", "Croydon, London"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    attention:
      "Frühere Deutschland-Einsätze bestätigen keinen aktuellen Berlin-Termin. Transport, Team, Auf-/Abbau und vollständige Kosten sind offen.",
    questions: [
      "Sind Lieferung und Aufbau in Berlin zu unserem Termin möglich?",
      "Was kosten Ausstattung, Transport, Personal und Abbau insgesamt?",
      "Welche Entwürfe, Maße, Mietdauern und Ersatzlösungen gehören zum Paket?",
    ],
    sources: [
      {
        title: "Eigene Vorstellung · Tamil-Community und Deutschland-Einsätze",
        url: "https://amani.co.uk/about-us",
      },
      {
        title: "Hochzeitsgestaltung und Koordination",
        url: "https://amani.co.uk/wedding",
      },
      { title: "Eigene Mietausstattung", url: "https://amani.co.uk/hire" },
    ],
  },
  {
    id: "sakthys",
    name: "Event by Sakthys",
    category: "Dekoration",
    region: "Dortmund · Berlin-Einsatz offen",
    local: false,
    headline: "Tamilische Hochzeitsgestaltung aus Dortmund.",
    summary:
      "Eigene Hochzeitsbeispiele, individuelle Dekoration und Koordination. Einzelne Elemente können auch separat gemietet werden.",
    proof:
      "Die eigene Eventseite nennt tamilische Hochzeiten und zeigt eigene Gestaltungen. Die Kontaktseite bestätigt den Standort Dortmund.",
    facts: [
      ["Leistungen", "Dekoration, Koordination und Mietausstattung"],
      ["Standort", "Dortmund"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    attention:
      "Ein Berlin-Einsatz ist nicht bestätigt. Liefergebiet, Transport, Aufbau, Abbau und Gesamtpreis bleiben offen.",
    questions: [
      "Sind Lieferung und Aufbau in Berlin zu unserem Termin möglich?",
      "Welche Elemente sind verfügbar und wie viel Platz benötigen sie?",
      "Was kosten Miete, Transport, Personal, Abbau und Kaution insgesamt?",
    ],
    sources: [
      {
        title: "Eigene Eventleistungen und Hochzeitsbeispiele",
        url: "https://www.sakthys.com/event.html",
      },
      {
        title: "Eigener Standort und Kontakt",
        url: "https://www.sakthys.com/kontakt.html",
      },
    ],
  },
  {
    id: "sathya",
    name: "Sathya’s Tamilische Event Management",
    category: "Catering",
    region: "Warendorf · Berlin genannt",
    local: false,
    headline: "Tamilisches Catering mit genanntem Berlin-Einsatz.",
    summary:
      "Der Anbieter beschreibt tamilisches Catering für Hochzeiten und nennt Berlin im Einsatzgebiet. Ein Kandidat für eine erste schriftliche Klärung.",
    proof: "Eigene Cateringseite mit ausdrücklich tamilischer Ausrichtung.",
    facts: [
      ["Leistung", "Tamilisches Catering"],
      ["Berlin", "Auf der Website genannt"],
      ["Preis", "Angebot offen"],
    ],
    attention:
      "Die Website wirkt älter und trägt eine alte Fußzeile. Aktuellen Betrieb, Kapazität und Konditionen vor einer engeren Auswahl verifizieren.",
    questions: [
      "Ist der Cateringbetrieb aktuell und in Berlin verfügbar?",
      "Sind 180–220 Personen mit Personal und Ausstattung möglich?",
      "Welche Menü-, Reise- und Mindestumsatzkosten gelten?",
    ],
    sources: [
      {
        title: "Eigene Cateringseite",
        url: "https://www.sathyas.de/catering-service-city.php",
      },
    ],
  },
  {
    id: "nandys",
    name: "Nandy’s Catering",
    category: "Catering",
    region: "Hilden · NRW",
    local: false,
    headline: "Tamilische Menüs mit Service und Ausstattung.",
    summary:
      "Der Caterer nennt tamilische Gerichte und Hochzeitscatering ausdrücklich. Es gibt ein vegetarisches Beispielmenü und Catering-Equipment; Umfang und Berlin-Einsatz bleiben individuell offen.",
    proof:
      "Eigene Cateringseite mit tamilischer Küche und Verbindung zum eigenen Restaurant Nandy’s Tamil Foods.",
    facts: [
      ["Küche", "Tamilisch und international · vegetarische Menüoption"],
      ["Leistungen", "Essen, Getränke, Service und Ausstattung genannt"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    attention:
      "Sitz in Hilden. Lieferung nach Berlin, Kapazität für 180–220 Gäste, Reisekosten und enthaltenes Personal sind nicht bestätigt. Beispielmenüs sind keine fest gebuchten Pakete.",
    questions: [
      "Ist ein tamilisches Menü für 180–220 Gäste in Berlin möglich?",
      "Was umfasst der Endpreis einschließlich Anfahrt, Personal, Geschirr und Warmhaltung?",
      "Welche vegetarischen Varianten und getrennten Zubereitungen sind möglich?",
    ],
    sources: [
      {
        title: "Eigene Cateringseite · Menüs und Leistungen",
        url: "https://nandys.de/",
      },
    ],
  },
  {
    id: "vithya",
    name: "Vithya Hair and Makeup",
    category: "Outfits & Styling",
    region: "London · internationale Einsätze",
    local: false,
    headline: "Tamilische Brautstylistin mit internationalem Einsatz.",
    summary:
      "Die eigene Website nennt Braut-Make-up und Haare sowie weltweite Kundentermine. Ein Einsatz in Berlin ist individuell zu klären.",
    proof:
      "Eigene Biografie bezeichnet Vithya ausdrücklich als tamilische Make-up-Artistin und nennt London als Standort.",
    facts: [
      ["Leistung", "Braut-Make-up und Haare"],
      ["Standort", "London · weltweite Einsätze laut Website"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    attention:
      "Kein Berliner Standort. Termin, Reise- und Übernachtungskosten sind nicht bestätigt. Saree-Drapierung, Probetermin und mehrere Looks separat klären.",
    questions: [
      "Ist ein Einsatz in Berlin zu unserem Termin möglich?",
      "Was kosten Styling, Anreise und Übernachtung insgesamt?",
      "Sind Probetermin, Saree-Drapierung, Touch-ups und Lookwechsel enthalten?",
    ],
    sources: [
      {
        title: "Eigene Biografie · tamilische Ausrichtung und Einsatzgebiet",
        url: "https://vithyahairandmakeup.com/about/",
      },
      {
        title: "Eigene Kontaktseite · Buchungsanfragen",
        url: "https://vithyahairandmakeup.com/contact/",
      },
    ],
  },
  {
    id: "meistersaal",
    catering: "frei",
    dinnerSeats: 220,
    name: "Meistersaal",
    category: "Location",
    region: "Berlin · Kreuzberg",
    local: true,
    headline: "Historischer Saal. Externes Catering möglich.",
    summary:
      "220 Personen an Tafeln oder 150 in Gala-Bestuhlung laut eigener Raumseite. Ein eigener Caterer ist laut FAQ möglich; für Tanzfläche und Buffet braucht es einen konkreten Plan.",
    proof: "Eigene Raum-, FAQ- und Hochzeitsunterlagen.",
    facts: [
      ["Sitzend", "220 Tafel / 150 Gala"],
      ["Externes Catering", "Laut FAQ möglich"],
      ["Öffentliches Paket", "159 € brutto / Person, Basis 150 Gäste"],
      ["Paketumfang", "8 Stunden, Buffet, Getränke, Technik"],
    ],
    attention:
      "Die 159 € gelten für das veröffentlichte Paket bei 150 Gästen. Ein Paket mit eurem tamilischen Caterer und 180–220 Gästen muss neu kalkuliert werden.",
    questions: [
      "Wie viele Plätze bleiben mit Tanzfläche und Buffet?",
      "Welche Gebühren und Küchenbedingungen gelten für unseren Caterer?",
      "Welche Musik-, Ruhe- und Verlängerungsregeln gelten für unsere Feier?",
    ],
    sources: [
      {
        title: "Bestuhlung & Räume",
        url: "https://www.meistersaal-berlin.de/raeume/",
      },
      {
        title: "FAQ · externes Catering",
        url: "https://www.meistersaal-berlin.de/faq/fqs-meistersaal/",
      },
      {
        title: "Hochzeitspaket 2026 · PDF",
        url: "https://www.meistersaal-berlin.de/wp-content/uploads/2026/06/MS_Hochzeitspaket.pdf",
      },
    ],
  },
  {
    id: "spreespeicher",
    catering: "offen",
    dinnerSeats: 350,
    name: "Spreespeicher · 030 Eventloft",
    category: "Location",
    region: "Berlin · Friedrichshain",
    local: true,
    headline: "Großzügiger Raum direkt an der Spree.",
    summary:
      "Der 030 Eventloft wird mit 350 Plätzen im Bankett bzw. 300 bei Gala gelistet. Das macht ihn räumlich interessant; die Freigabe für euren Caterer bleibt offen.",
    proof: "Eigene Kapazitätstabelle für den konkreten Raum 030 Eventloft.",
    facts: [
      ["030 Eventloft", "350 Bankett / 300 Gala"],
      ["Externes Catering", "Nicht bestätigt"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    attention:
      "Die Zahlen gelten für diesen Raum. Kleinere Räume des Spreespeichers sind damit nicht automatisch für 220 Dinnergäste geeignet.",
    questions: [
      "Ist externes tamilisches Catering erlaubt und zu welchen Gebühren?",
      "Wie sieht der Plan für 220 Gäste mit Tanzfläche und Buffet aus?",
      "Welche Miet-, Getränke-, Personal- und Technikpakete sind verpflichtend?",
    ],
    sources: [
      {
        title: "Eigene Räume & Kapazitäten",
        url: "https://www.spreespeicher-events.de/eventlocation-berlin/",
      },
    ],
  },
  {
    id: "stober",
    catering: "offen",
    dinnerSeats: 360,
    name: "Landgut Stober",
    category: "Location",
    region: "Brandenburg · Groß Behnitz",
    local: true,
    headline: "Landgut am See mit Platz und Übernachtungen.",
    summary:
      "Die Berliner Kongressplattform führt Salon August mit 360 Bankettplätzen und Salon Conrad/Arnold/Ernst mit 340. Die eigene Website bietet Hochzeiten am See an.",
    proof:
      "Eigene Hochzeitsseite und Raumdaten der offiziellen visitBerlin-Kongressplattform.",
    facts: [
      ["Salon August", "360 Bankettplätze laut visitBerlin"],
      ["Übernachtung", "Hotel auf dem Gelände"],
      ["Externes Catering", "Nicht bestätigt"],
      ["Preis", "Angebot offen"],
    ],
    questions: [
      "Welcher Saal passt mit Tanzfläche und Buffet zu 180–220 Gästen?",
      "Ist ein externer tamilischer Caterer zugelassen?",
      "Welche Mindestumsätze, Zimmerkontingente und Shuttlewege entstehen?",
    ],
    sources: [
      {
        title: "Hochzeiten · Landgut Stober",
        url: "https://www.landgut-stober.de/romantisch-heiraten-am-see-berlin.html",
      },
      {
        title: "Raumdaten · visitBerlin",
        url: "https://convention.visitberlin.de/veranstaltungsplanung/berlin-convention-finder/veranstaltungsorte/landgut-stober",
      },
    ],
  },
  {
    id: "orankesee",
    catering: "gebunden",
    name: "Orankesee Terrassen",
    category: "Location",
    region: "Berlin · Alt-Hohenschönhausen",
    local: true,
    headline: "Am See mit Tanzfläche – und Hauscatering.",
    summary:
      "Die eigene Eventseite nennt innen bis zu 250 Personen mit Tanzfläche. Speisen und Getränke sind an das Haus gebunden; für euren Wunsch nach tamilischem Catering ist das ein entscheidender Prüfpunkt.",
    proof:
      "Eigene Eventseite mit Kapazität, Cateringbindung und veröffentlichten Preisbausteinen.",
    facts: [
      ["Innen", "Bis 250 mit Tanzfläche laut Anbieter"],
      ["Catering", "An Hausküche und Getränke gebunden"],
      ["Buffet", "Öffentlich 59,90 / 69,90 € pro Person"],
      ["Getränke", "Öffentlich 35 / 45 € pro Person"],
    ],
    attention:
      "Veröffentlichte Preisbausteine, kein Gesamtangebot. Eignung der Hausküche für euer gewünschtes tamilisches Menü ist offen.",
    questions: [
      "Kann die Hausküche ein passendes tamilisches Menü verbindlich anbieten?",
      "Welche Zusatzkosten und Zeiten gelten für unsere konkrete Feier?",
      "Wie sind 220 Sitzplätze, Buffet und Tanzfläche angeordnet?",
    ],
    sources: [
      {
        title: "Eigene Eventseite & Preisbausteine",
        url: "https://www.orankesee-terrassen.com/events/",
      },
    ],
  },
  {
    id: "richtershorn",
    catering: "frei",
    name: "Richtershorn am See",
    category: "Location",
    region: "Berlin · Köpenick",
    local: true,
    headline: "Wasserlage mit eigenem Caterer als Option.",
    summary:
      "Externes Catering wird gegen Gebühr angeboten. Die Innenplätze verteilen sich laut Website auf Räume mit 96, 96 und 48 Plätzen; ein gemeinsamer Innenraum für 220 ist damit nicht belegt.",
    proof:
      "Eigene Website und FAQ; Widerspruch zwischen veröffentlichten Cateringgebühren.",
    facts: [
      ["Innenräume", "96 / 96 / 48 Plätze, getrennt"],
      ["Terrasse", "50–300, Regendach genannt"],
      ["Externes Catering", "Möglich gegen Gebühr"],
    ],
    attention:
      "FAQ nennt 1.500 €, der Rechner 800 € für externes Catering. Gebühr und Regen-/Sitzkonzept schriftlich klären; kein gesicherter 220-Personen-Innensaal.",
    questions: [
      "Können alle Gäste gemeinsam wetterfest sitzen?",
      "Welche der widersprüchlichen Cateringgebühren gilt?",
      "Was umfassen Miete, Mindestumsätze, Reinigung und Musikzeiten?",
    ],
    sources: [
      {
        title: "Räume & eigener Preisrechner",
        url: "https://eventlocation-am-wasser.de/",
      },
      {
        title: "FAQ · Cateringbedingungen",
        url: "https://eventlocation-am-wasser.de/faq",
      },
    ],
  },
  {
    id: "mq-ranch",
    catering: "offen",
    name: "MQ-Ranch",
    category: "Location",
    region: "Brandenburg",
    local: true,
    headline: "Landhochzeit mit viel Außenraum.",
    summary:
      "Das Haupthaus wird für bis zu 200 Gäste angeboten; draußen bzw. mit Zelten sind größere Formate vorgesehen. Für 220 Gäste ist eine wetterfeste Gesamtlösung zu prüfen.",
    proof: "Eigene Hochzeitsseite mit Hauskapazität und Außenoptionen.",
    facts: [
      ["Haupthaus", "Bis 200 laut Website"],
      ["220 Gäste", "Innen nicht bestätigt"],
      ["Externes Catering", "Nicht bestätigt"],
      ["Öffentliche Miete", "3-Tage-Special: 7.800 € laut Mappe"],
      ["Hauptsaison Mai–Sept", "Mindestumsatz ab 16.000 € laut Website"],
    ],
    attention:
      "Die Mietmappe trägt Stand 16.02.2026. Miete und Mindestumsatz sind keine addierten Gesamtpreise; Anrechnung, MwSt. und aktuelle Konditionen ausdrücklich klären. Gästehäuser sind im Miet-Special ausgenommen. Ein Dinnerplan mit Tanzfläche für 220 ist weiterhin nicht bestätigt.",
    questions: [
      "Wie sitzen 220 Gäste wetterfest mit Tanzfläche und Buffet?",
      "Ist externes tamilisches Catering möglich?",
      "Welche Leistungen werden auf den Mindestumsatz angerechnet und wie gilt er bei externem Catering?",
      "Was kosten Zelt, Technik, Transport und Übernachtungen zusätzlich?",
    ],
    sources: [
      {
        title: "Eigene Hochzeitsseite",
        url: "https://mq-ranch.de/hochzeitslocations/hochzeitslocation-in-berlin-und-brandenburg/",
      },
      {
        title: "Eigene Bankettmappe · Stand 16.02.2026",
        url: "https://mq-ranch.de/wp-content/uploads/MQR_Hochzeiten.pdf",
      },
    ],
  },
  {
    id: "bolle",
    name: "BOLLE Festsäle",
    category: "Location",
    region: "Berlin · Moabit",
    local: true,
    catering: "frei",
    dinnerSeats: 400,
    headline: "Historischer Festsaal mit freier Catererwahl.",
    summary:
      "Der eigene Raumplan nennt 400 Bankettplätze im 800-m²-Festsaal. Die FAQ bestätigt cateringfreie Buchung und eine Küche für externe Caterer – eine interessante Kombination für eure Planung.",
    proof:
      "Eigene Raumtabelle und eigene FAQ bestätigen Bestuhlung und Cateringfreiheit.",
    facts: [
      ["Festsaal", "400 Bankett / 510 Tafeln"],
      ["Externes Catering", "Laut FAQ möglich, Küche vorhanden"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    questions: [
      "Welche Raumgröße und Kosten gelten für eine private Hochzeit mit 180–220 Gästen?",
      "Welche Küchen-, Personal- und Zusatzgebühren gelten für unseren Caterer?",
      "Wie werden Dinner, Tanzfläche, Buffet und Veranstaltungsende konkret geplant?",
    ],
    sources: [
      {
        title: "Festsaal · eigene Kapazitätstabelle",
        url: "https://bolle-events.com/eventlocation/festsaal/",
      },
      {
        title: "FAQ · freie Catererwahl",
        url: "https://bolle-events.com/faq/",
      },
    ],
  },
  {
    id: "stadtgut-buch",
    name: "Stadtgut Berlin-Buch",
    category: "Location",
    region: "Berlin · Buch",
    local: true,
    catering: "gebunden",
    dinnerSeats: 440,
    headline: "Große Scheune mit Garten – Catering gebunden.",
    summary:
      "Die beheizte, barrierefreie Scheune nennt 440 Bankett- bzw. 350 Galaplätze. Die Website bindet Catering an Kooperationspartner; ein eigener tamilischer Caterer ist daher nicht freigegeben.",
    proof:
      "Eigene Scheunenseite mit Bestuhlung, Cateringbindung und verlinkten Bedingungen.",
    facts: [
      ["Scheune", "440 Bankett / 350 Gala"],
      ["Catering", "An Kooperationspartner gebunden"],
      ["Preis", "Individuelles Angebot offen"],
    ],
    attention:
      "Die veröffentlichten Bedingungen nennen zusätzliche Sanitär-/Serviceanforderungen ab etwa 200 Gästen. Aktuelle Konditionen für eure Personenzahl schriftlich klären.",
    questions: [
      "Kann ein tamilischer Caterer ausdrücklich als Partner oder Ausnahme zugelassen werden?",
      "Welche zusätzlichen Sanitär-, Personal- und Reinigungskosten gelten für 220 Gäste?",
      "Welcher Sitzplan lässt Platz für Buffet, Tanzfläche und eure gewählten Zeremonieelemente?",
    ],
    sources: [
      {
        title: "Scheune · Räume & Cateringbindung",
        url: "https://stadtgut-buch.de/die-scheune/",
      },
      {
        title: "Veröffentlichte Bedingungen",
        url: "https://stadtgut-buch.de/agb/",
      },
    ],
  },
  {
    id: "alte-turnhalle",
    name: "Alte Turnhalle Berlin",
    category: "Location",
    region: "Berlin · Friedrichshain",
    local: true,
    catering: "frei",
    dinnerSeats: 250,
    headline: "Saal und Sommergarten mit eigener Catereroption.",
    summary:
      "Die eigene Hochzeitsseite nennt bis zu 250 Plätze an Tafeln im großen Saal. Externes Speisencatering ist gegen Gastroauslösung möglich; Getränke bleiben beim Haus.",
    proof: "Eigene Hochzeitsseite mit Bestuhlungszahlen und Catering-FAQ.",
    facts: [
      ["Großer Saal", "Max. 250 an Tafeln · knapp 280 m²"],
      ["Catering", "Extern gegen Gastroauslösung, keine Küchennutzung"],
      ["Feierzeit", "Bis 04:00; Wochenende frühestens ab 16:00"],
      ["Preis", "Miete und Gastroauslösung offen"],
    ],
    attention:
      "Das Haus bezeichnet 80–150 Gäste als ideal. Für 180–220 braucht ihr einen konkreten Sitzplan mit Buffet und Tanzfläche. Speisen müssen verzehrfertig angeliefert werden; ein tamilischer Caterer muss dies leisten können. Am Wochenende kein Aufbau am Vortag.",
    questions: [
      "Welcher Plan funktioniert für 180–220 Gäste an Tafeln mit Tanzfläche und Buffet?",
      "Was kosten Gastroauslösung, Getränke, Reinigung und Verlängerung insgesamt?",
      "Wie sind verzehrfertige Anlieferung, Warmhaltung und Aufbau ohne Küchennutzung möglich?",
    ],
    sources: [
      {
        title: "Hochzeiten · Räume, Zeiten & Catering-FAQ",
        url: "https://www.alte-turnhalle-berlin.de/hochzeit",
      },
    ],
  },
  {
    id: "villa-schuetzenhof",
    name: "Villa Schützenhof",
    category: "Location",
    region: "Berlin · Spandau",
    local: true,
    catering: "frei",
    headline: "Eigener Caterer und professionelle Küche.",
    summary:
      "Die Villa bestätigt freie Catererwahl und eine mietbare Produktionsküche. Der Königssaal liegt im ersten Obergeschoss; eine konkrete Dinnerbestuhlung für eure Gästezahl ist noch zu bestätigen.",
    proof:
      "Eigene Location-, Raum- und Mietküchenseiten bestätigen Catererwahl und Ausstattung.",
    facts: [
      ["Königssaal", "255 m² im Obergeschoss · Bühne vorhanden"],
      ["Eigener Caterer", "Laut Website möglich, Küche mietbar"],
      ["Küchenpreis", "950 € zzgl. MwSt. / 10 h exklusive Nutzung"],
      ["Gesamtpreis", "Raummiete, Personal und Feierangebot offen"],
    ],
    attention:
      "Der Küchenpreis ist ein einzelner veröffentlichter Mietbaustein, kein Hochzeitspaket. Die eigene Raumseite nennt keine genaue Dinnerplatzanzahl; daher nicht im Mindest-Sitzplatzfilter enthalten. Treppenlift, Buffetwege und Raumnutzung für 180–220 Gäste konkret klären.",
    questions: [
      "Wie viele Gäste sitzen im Königssaal gemeinsam mit Tanzfläche und Buffet?",
      "Welche Küche und Nebenkosten sind im individuellen Feierangebot enthalten?",
      "Wie funktionieren Anlieferung, Treppenlift, Auf-/Abbau und Veranstaltungsende?",
    ],
    sources: [
      {
        title: "Eigene Locationseite · kein verbindlicher Hauscaterer",
        url: "https://www.villa-schuetzenhof.de/mehr-infos/location/",
      },
      {
        title: "Raumübersicht · Königssaal und Zugang",
        url: "https://www.villa-schuetzenhof.de/mehr-infos/raumuebersicht/",
      },
      {
        title: "Mietküche · Ausstattung und öffentliche Preise",
        url: "https://www.villa-schuetzenhof.de/mehr-infos/mietkueche-villa-kueche/",
      },
    ],
  },
  {
    id: "stadthalle-falkensee",
    name: "Stadthalle Falkensee",
    category: "Location",
    region: "Brandenburg · Falkensee",
    local: true,
    catering: "frei",
    dinnerSeats: 748,
    headline: "Viel Platz und freie Catererwahl.",
    summary:
      "Ein eigener Bestuhlungsplan vom Juli 2025 zeigt maximal 748 Sitzplätze an Tischen in der gesamten Veranstaltungshalle. Freie Catererwahl und ein zubuchbarer Aufwärm-Cateringbereich sind dokumentiert.",
    proof:
      "Eigene Bestuhlungspläne und Mietkonditionen; Stadt-FAQ nennt die Halle auch für private Feiern.",
    facts: [
      ["Bestuhlung", "Max. 748 Tischplätze · Plan 01.07.2025"],
      ["Catering", "Freie Wahl · Aufwärmbereich zubuchbar"],
      ["Preis", "Aktuelles Angebot offen, Preistabelle Stand 2017"],
    ],
    attention:
      "Die volle Halle ist deutlich größer als eure Feier. Geeignete Teilfläche und Raumwirkung klären. Die veröffentlichte Preistabelle trägt Stand Mai 2017 und wird hier nicht als aktueller Preis übernommen. Betreuung, Reinigung und Möbelaufbau werden separat berechnet.",
    questions: [
      "Welche Teilfläche mit Tanzfläche und Buffet passt zu 180–220 Gästen?",
      "Was kosten aktuell Miete, Betreuung, Reinigung, Möbelaufbau und Technik zusammen?",
      "Welche Zeiten, genehmigten Tischpläne und Aufwärmmöglichkeiten gelten für eine private Hochzeit?",
    ],
    sources: [
      {
        title: "Eigene Bestuhlungsseite · Tischplan von 2025",
        url: "https://stadthalle-falkensee.de/veranstalter/bestuhlung",
      },
      {
        title: "Mietkonditionen · Cateringfreiheit und Preisstand",
        url: "https://stadthalle-falkensee.de/veranstalter/mietkonditionen/",
      },
      {
        title: "Stadt-FAQ · Räume für private Feiern",
        url: "https://www.falkensee.de/seite/552977/faq-h%C3%A4ufig-gestellte-fragen.html",
      },
    ],
  },
];
