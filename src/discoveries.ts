export type Discovery = {
  id: string;
  name: string;
  category: "Foto & Video" | "Catering" | "Dekoration" | "Location";
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
      ["Preis", "Angebot offen"],
    ],
    attention:
      "Die beworbene Kapazität des Haupthauses enthält noch keinen bestätigten Dinnerplan mit Tanzfläche.",
    questions: [
      "Wie sitzen 220 Gäste wetterfest mit Tanzfläche und Buffet?",
      "Ist externes tamilisches Catering möglich?",
      "Was kosten Zelt, Technik, Transport und Übernachtungen zusätzlich?",
    ],
    sources: [
      {
        title: "Eigene Hochzeitsseite",
        url: "https://mq-ranch.de/hochzeitslocations/hochzeitslocation-in-berlin-und-brandenburg/",
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
];
