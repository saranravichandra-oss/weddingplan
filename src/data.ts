export type Variant = 'a' | 'b' | 'c';
export type Section = 'Übersicht' | 'Dienstleister' | 'Gäste' | 'Budget' | 'Aufgaben' | 'Veranstaltungen' | 'Dokumente';
export const variants = {
  a: { title: 'Alles im Blick', description: 'Ein ruhiger Überblick für eure tägliche Planung.' },
  b: { title: 'Vergleich im Fokus', description: 'Angebote und offene Fragen direkt nebeneinander.' },
  c: { title: 'Unsere Feiern', description: 'Jede Feier hat ihren eigenen Platz.' },
};
export const events = ['Standesamt', 'Tamilische Zeremonie', 'Reception'];
export const initialTasks = [
  { id: 1, title: 'Foto- und Videoangebote vergleichen', detail: 'Vorliegende Angebote übertragen und Leistungsumfang prüfen', category: 'Foto & Video', priority: 'Als Nächstes', done: false },
  { id: 2, title: 'Budgetrahmen gemeinsam festlegen', detail: 'Zielbudget und Obergrenze sind noch offen', category: 'Budget', priority: 'Entscheidung', done: false },
  { id: 3, title: 'Details zum gebuchten Saal ergänzen', detail: 'Name, Adresse, Termin und Zahlungsfrist fehlen noch', category: 'Standesamt', priority: 'Ergänzen', done: false },
  { id: 4, title: 'Gäste je Veranstaltung planen', detail: '180–220 Gäste bei der größten Feier als Ausgangspunkt', category: 'Gäste', priority: 'Planung', done: false },
];
export type Offer = {
  id: string; name: string; category: string; event: string; price: number | null;
  basis: string; hours: string; team: string; photos: string; video: string;
  extras: string; deposit: string; delivery: string; source: string; demo: boolean;
};
export const demoOffers: Offer[] = [
  { id: 'demo-1', name: 'Demo-Studio A', category: 'Foto & Video', event: 'Reception', price: 3200, basis: 'Brutto', hours: '10 Stunden', team: '1 Foto · 1 Video', photos: '500 bearbeitete Bilder', video: 'Highlightfilm, 5 Minuten', extras: 'Fahrtkosten nicht angegeben', deposit: '30 % · 960 €', delivery: '8–10 Wochen', source: 'Demo-Angebot A · Seite 1', demo: true },
  { id: 'demo-2', name: 'Demo-Studio B', category: 'Foto & Video', event: 'Reception', price: 2800, basis: 'Nicht angegeben', hours: '8 Stunden', team: '1 Foto · 1 Video', photos: 'Nicht angegeben', video: 'Highlightfilm, Länge offen', extras: 'Anfahrt 150 € · Zusatzstunde 200 €', deposit: 'Nicht angegeben', delivery: 'Nicht angegeben', source: 'Demo-Angebot B · Seite 1', demo: true },
  { id: 'demo-3', name: 'Demo-Studio C', category: 'Foto & Video', event: 'Standesamt + Reception', price: 3900, basis: 'Brutto', hours: '12 Stunden gesamt', team: '2 Foto · Video nicht enthalten', photos: '700 bearbeitete Bilder', video: 'Ausdrücklich nicht enthalten', extras: 'Anfahrt enthalten · Album optional 250 €', deposit: '500 €', delivery: '6–8 Wochen', source: 'Demo-Angebot C · Seite 1', demo: true },
];
export const money = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
