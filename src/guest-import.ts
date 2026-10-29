import { guestKey } from "../shared/guests.mjs";
import type { Guest, WeddingEvent } from "./data";
export type ImportMapping = {
  name: number;
  lastName: number;
  count: number;
  household: number;
  dietary: number;
  notes: number;
  startRow: number;
  events: Record<number, string[]>;
};
export type GuestProposal = {
  sourceRow: number;
  guest: Omit<Guest, "id" | "version" | "updatedAt" | "updatedBy">;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
};
const norm = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const words = {
  name: /^(gasteliste|name|gast|gaste|vorname|vollstandiger name|name familie|familie|haushalt)$/,
  count:
    /^(anz|anzahl|personen|personenzahl|anzahl personen|gastezahl|anz gaste)$/,
  lastName: /^(nachname|familienname)$/,
  household: /^(haushalt|gruppe|familie)$/,
  dietary: /^(essen|essenswunsche|ernahrung|allergien)$/,
  notes: /^(notizen|hinweise|bemerkungen)$/,
};
export function guessMapping(
  rows: unknown[][],
  events: WeddingEvent[],
): { mapping: ImportMapping; headers: string[] } {
  let header = 0,
    best = -1;
  rows.slice(0, 12).forEach((row, index) => {
    const score = row.reduce<number>(
      (sum, cell) =>
        sum +
        Object.values(words).filter((pattern) => pattern.test(norm(cell)))
          .length,
      0,
    );
    if (score > best) {
      best = score;
      header = index;
    }
  });
  const width = Math.min(
    50,
    Math.max(0, ...rows.slice(0, 12).map((row) => row.length)),
  );
  const headers = Array.from({ length: width }, (_, column) =>
    String(rows[header]?.[column] ?? `Spalte ${column + 1}`),
  );
  // Some guest lists have a second header row with event labels under "Prio".
  const eventLabel =
    /(beides|beide|both|thaali|tamil|tradition|reception|rezeption|standesamt)/;
  rows[header + 1]?.forEach((cell, column) => {
    if (eventLabel.test(norm(cell))) headers[column] = String(cell);
  });
  const find = (pattern: RegExp) =>
    headers.findIndex((label) => pattern.test(norm(label)));
  const mapping: ImportMapping = {
    name: find(words.name),
    lastName: find(words.lastName),
    count: find(words.count),
    household: find(words.household),
    dietary: find(words.dietary),
    notes: find(words.notes),
    startRow: header + 2,
    events: {},
  };
  if (mapping.name < 0) mapping.name = 0;
  if (mapping.household === mapping.name) mapping.household = -1;
  const ceremony = events.find((event) => /tamil|tradition/i.test(event.name));
  const reception = events.find((event) =>
    /reception|rezeption/i.test(event.name),
  );
  const civil = events.find((event) => /standesamt/i.test(event.name));
  headers.forEach((label, column) => {
    const text = norm(label);
    if (/beides|beide|both/.test(text))
      mapping.events[column] = [ceremony?.id, reception?.id].filter(
        Boolean,
      ) as string[];
    else if (/thaali|tamil|tradition/.test(text))
      mapping.events[column] = ceremony ? [ceremony.id] : [];
    else if (/reception|rezeption/.test(text))
      mapping.events[column] = reception ? [reception.id] : [];
    else if (/standesamt/.test(text))
      mapping.events[column] = civil ? [civil.id] : [];
  });
  const first = rows.findIndex(
    (row, index) =>
      index > header &&
      String(row[mapping.name] ?? "").trim() &&
      !words.name.test(norm(row[mapping.name])) &&
      (mapping.count < 0 ||
        typeof row[mapping.count] === "number" ||
        /^\d+$/.test(String(row[mapping.count] ?? ""))),
  );
  if (first >= 0) mapping.startRow = first + 1;
  return { mapping, headers };
}
export function proposeGuests(
  rows: unknown[][],
  mapping: ImportMapping,
  events: WeddingEvent[],
  existing: Guest[],
  source: string,
): GuestProposal[] {
  const seen = new Set(existing.map((guest) => guestKey(guest.name)));
  const read = (row: unknown[], column: number) =>
    column < 0 ? "" : String(row[column] ?? "").trim();
  const result: GuestProposal[] = [];
  for (
    let index = Math.max(0, mapping.startRow - 1);
    index < rows.length;
    index++
  ) {
    const row = rows[index];
    if (
      !row.some(
        (value) => value !== null && value !== undefined && value !== "",
      )
    )
      continue;
    const name = [read(row, mapping.name), read(row, mapping.lastName)]
      .filter(Boolean)
      .join(" ");
    if (/^(summe|gesamt|total)\s*:?$/i.test(name)) continue;
    const errors: string[] = [],
      warnings: string[] = [];
    if (!name) errors.push("Name fehlt.");
    else if (name.length > 200) errors.push("Name ist länger als 200 Zeichen.");
    const count = mapping.count < 0 ? 1 : Number(read(row, mapping.count));
    if (!Number.isInteger(count) || count < 1 || count > 1000)
      errors.push("Personenzahl muss eine ganze Zahl von 1 bis 1.000 sein.");
    const attendance: Record<string, string> = Object.fromEntries(
      events.map((event) => [event.id, "Nicht angegeben"]),
    );
    const unmapped: string[] = [];
    for (const [column, ids] of Object.entries(mapping.events)) {
      const value = norm(read(row, Number(column)));
      if (!value) continue;
      const status = /^(zugesagt|confirmed|bestatigt)$/.test(value)
        ? "Zugesagt"
        : /^(abgesagt|declined)$/.test(value)
          ? "Abgesagt"
          : /^eingeladen$/.test(value)
            ? "Eingeladen"
            : /^(x|ja|yes|1|true|vorgesehen|geplant)$/.test(value)
              ? "Vorgesehen"
              : null;
      if (!status) {
        warnings.push(
          `Unklare Markierung in Spalte ${Number(column) + 1}: ${read(row, Number(column))}`,
        );
        continue;
      }
      if (!ids.length) unmapped.push(String(Number(column) + 1));
      for (const id of ids) {
        if (!events.some((event) => event.id === id)) {
          errors.push("Eine gewählte Veranstaltung existiert nicht mehr.");
          continue;
        }
        if (attendance[id] !== "Nicht angegeben" && attendance[id] !== status)
          errors.push("Widersprüchliche Rückmeldungen für dieselbe Feier.");
        else attendance[id] = status;
      }
    }
    if (unmapped.length)
      warnings.push(
        `Markierte Spalte ${unmapped.join(", ")} ist keiner Feier zugeordnet.`,
      );
    if (Object.values(attendance).every((value) => value === "Nicht angegeben"))
      warnings.push("Noch keiner Feier zugeordnet.");
    const duplicate = seen.has(guestKey(name));
    seen.add(guestKey(name));
    const notes = [
      read(row, mapping.notes),
      `Import: ${source} · Zeile ${index + 1}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (notes.length > 4000)
      errors.push("Hinweise sind länger als 4.000 Zeichen.");
    const household = read(row, mapping.household) || (count > 1 ? name : "");
    if (household.length > 200)
      errors.push("Haushalt ist länger als 200 Zeichen.");
    const dietary = read(row, mapping.dietary);
    if (dietary.length > 4000)
      errors.push("Essenshinweise sind länger als 4.000 Zeichen.");
    result.push({
      sourceRow: index + 1,
      guest: {
        name,
        household,
        partySize: Number.isInteger(count) && count > 0 ? count : 1,
        type: count > 1 ? "Gruppe" : "Nicht angegeben",
        dietary,
        notes,
        attendance,
        table: "",
      },
      errors,
      warnings,
      duplicate,
    });
  }
  return result;
}
// Inspect the ZIP directory before decompression to bound untrusted XLSX input.
export function validateXlsxArchive(buffer: ArrayBuffer) {
  if (buffer.byteLength > 2 * 1024 * 1024)
    throw new Error(
      "Maximal 2 MB pro Gästeliste. Bitte eine kleinere XLSX-Datei verwenden.",
    );
  const view = new DataView(buffer);
  let end = -1;
  for (
    let i = buffer.byteLength - 22;
    i >= Math.max(0, buffer.byteLength - 65557);
    i--
  )
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0)
    throw new Error(
      "Keine gültige XLSX-Datei. Bitte in Excel als .xlsx speichern.",
    );
  const entries = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    size = 0;
  if (entries > 2000)
    throw new Error(
      "Die Arbeitsmappe enthält zu viele Bestandteile. Bitte auf die Gästeliste reduzieren.",
    );
  for (let entry = 0; entry < entries; entry++) {
    if (
      offset + 46 > buffer.byteLength ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      throw new Error(
        "Die XLSX-Datei ist beschädigt oder wird nicht unterstützt.",
      );
    if (view.getUint16(offset + 8, true) & 1)
      throw new Error(
        "Passwortgeschützte Dateien bitte ohne Dateipasswort als Kopie speichern.",
      );
    size += view.getUint32(offset + 24, true);
    if (size > 25 * 1024 * 1024)
      throw new Error(
        "Die entpackte Arbeitsmappe ist zu groß. Bitte nur das benötigte Tabellenblatt exportieren.",
      );
    offset +=
      46 +
      view.getUint16(offset + 28, true) +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
}
