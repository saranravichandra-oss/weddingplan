import type { Offer } from "./data";
export type MergeChoice = "mine" | "shared";
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
const metadata = new Set([
  "id",
  "version",
  "updatedAt",
  "updatedBy",
  "evidence",
  "manualFields",
]);

// Three-way merge: unrelated edits survive; competing edits require a choice.
export function mergeOffer(
  base: Partial<Offer> | undefined,
  mine: Partial<Offer>,
  shared: Offer,
  choices: Record<string, MergeChoice> = {},
) {
  const merged = { ...shared };
  const conflicts: { key: keyof Offer; mine: unknown; shared: unknown }[] = [];
  const evidence = { ...shared.evidence };
  const manualFields = new Set(shared.manualFields);
  for (const key of new Set([...Object.keys(shared), ...Object.keys(mine)])) {
    if (metadata.has(key)) continue;
    const field = key as keyof Offer;
    const localValue = mine[field],
      remoteValue = shared[field];
    let origin: MergeChoice = "shared";
    if (same(localValue, remoteValue)) origin = "shared";
    else if (base && same(localValue, base[field])) origin = "shared";
    else if (base && same(remoteValue, base[field])) origin = "mine";
    else {
      conflicts.push({ key: field, mine: localValue, shared: remoteValue });
      origin = choices[key] || "shared";
    }
    if (origin === "mine") {
      (merged as unknown as Record<string, unknown>)[key] = localValue;
      if (mine.evidence?.[key]) evidence[key] = mine.evidence[key];
      else delete evidence[key];
      if (mine.manualFields?.includes(key)) manualFields.add(key);
      else manualFields.delete(key);
    }
  }
  merged.evidence = evidence;
  merged.manualFields = [...manualFields];
  return {
    merged,
    conflicts,
    unresolved: conflicts.some((field) => !choices[field.key]),
  };
}

export const offerLabels: Partial<Record<keyof Offer, string>> = {
  name: "Anbieter",
  providerId: "Kontakt",
  category: "Kategorie",
  events: "Veranstaltungen",
  price: "Gesamtpreis",
  currency: "Währung",
  basis: "Preisbasis",
  pricingNotes: "Preiseinheit & Kalkulationshinweise",
  hours: "Begleitung / Aufnahmezeit",
  team: "Team",
  photos: "Fotografie",
  video: "Videografie",
  delivery: "Lieferzeiten",
  deposit: "Anzahlung",
  balance: "Restbetrag",
  paymentTerms: "Zahlungsbedingungen",
  extras: "Fahrt & Übernachtung",
  included: "Enthaltene Leistungen",
  excluded: "Nicht enthalten",
  optional: "Optionale Extras",
  questions: "Offene Fragen",
  contact: "Kontaktangaben",
  offerDate: "Angebotsdatum",
  validity: "Gültigkeit",
  extraHours: "Zusätzliche Stunden",
  packageName: "Paket",
  source: "Quellenangabe",
  eventDate: "Veranstaltungstermin",
  venue: "Veranstaltungsort",
  guestCount: "Gästezahl",
  photoPrice: "Fotografie-Teilpreis",
  videoPrice: "Videografie-Teilpreis",
  status: "Status",
  decision: "Eure Einschätzung",
  confirmed: "Geprüft",
};
