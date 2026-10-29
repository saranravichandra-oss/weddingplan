import type { Stored } from "./data";
export type PlanningRecord = Record<string, unknown> & Partial<Stored>;
export type RecordChoice = "mine" | "shared";
const metadata = new Set([
  "id",
  "version",
  "updatedAt",
  "updatedBy",
  "importBatch",
  "offerId",
]);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
function flat(record: PlanningRecord) {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (metadata.has(key)) continue;
    if (key === "attendance") {
      for (const [event, answer] of Object.entries(
        (value || {}) as Record<string, unknown>,
      ))
        fields[`attendance-${event}`] = answer;
    } else fields[key] = value;
  }
  return fields;
}

// Attendance is merged per stable celebration ID, never as one replaceable object.
export function mergeRecord(
  base: PlanningRecord,
  mine: PlanningRecord,
  shared: PlanningRecord,
  choices: Record<string, RecordChoice> = {},
) {
  const original = flat(base),
    local = flat(mine),
    remote = flat(shared);
  const merged = { ...shared };
  if (shared.attendance)
    merged.attendance = { ...(shared.attendance as object) };
  const conflicts: { key: string; mine: unknown; shared: unknown }[] = [];
  for (const key of new Set([
    ...Object.keys(original),
    ...Object.keys(local),
    ...Object.keys(remote),
  ])) {
    let origin: RecordChoice = "shared";
    if (same(local[key], remote[key]) || same(local[key], original[key]))
      origin = "shared";
    else if (same(remote[key], original[key])) origin = "mine";
    else {
      conflicts.push({ key, mine: local[key], shared: remote[key] });
      origin = choices[key] || "shared";
    }
    if (origin !== "mine") continue;
    const target = key.startsWith("attendance-")
      ? ((merged.attendance ||= {}) as Record<string, unknown>)
      : merged;
    const name = key.startsWith("attendance-") ? key.slice(11) : key;
    if (local[key] === undefined) delete target[name];
    else target[name] = local[key];
  }
  return {
    merged,
    conflicts,
    unresolved: conflicts.some(({ key }) => !choices[key]),
  };
}

export const recordLabels: Record<string, string> = {
  name: "Name",
  category: "Kategorie",
  event: "Veranstaltung",
  website: "Website",
  email: "E-Mail",
  phone: "Telefon",
  region: "Region / Einsatzgebiet",
  notes: "Notizen",
  status: "Status",
  nextAction: "Nächste Aktion",
  title: "Aufgabe",
  detail: "Beschreibung",
  priority: "Priorität",
  done: "Erledigt",
  owner: "Verantwortlich",
  due: "Termin",
  label: "Kostenposition",
  stage: "Kostenstatus",
  amount: "Gesamtbetrag",
  paid: "Bereits gezahlt",
  date: "Datum",
  location: "Ort / Adresse",
  guests: "Gästezahl",
  traditions: "Eure Rituale und Traditionen",
  target: "Zielbudget",
  limit: "Obergrenze",
  fixed: "Weitere feste Kosten",
  perGuest: "Kosten pro Gast",
  partySize: "Anzahl Personen",
  household: "Haushalt",
  type: "Person",
  dietary: "Essen & Unverträglichkeiten",
  table: "Tisch",
};
