import { useMemo, useState } from "react";
import { FileXls, UploadSimple, CheckCircle } from "@phosphor-icons/react";
import { api, json } from "../api";
import { peopleCount } from "../../shared/guests.mjs";
import {
  guessMapping,
  proposeGuests,
  validateXlsxArchive,
} from "../guest-import";
import type { ImportMapping } from "../guest-import";
import type { Guest, WeddingEvent } from "../data";
import { Button, ErrorMessage } from "./ui";
type Sheet = { sheet: string; data: unknown[][] };
export default function GuestImport({
  guests,
  events,
  onSaved,
}: {
  guests: Guest[];
  events: WeddingEvent[];
  onSaved: (message: string) => void;
}) {
  const [sheets, setSheets] = useState<Sheet[]>([]),
    [sheetIndex, setSheetIndex] = useState(0),
    [filename, setFilename] = useState(""),
    [mapping, setMapping] = useState<ImportMapping | null>(null),
    [headers, setHeaders] = useState<string[]>([]),
    [excluded, setExcluded] = useState<Set<number>>(new Set()),
    [allowedDuplicates, setAllowedDuplicates] = useState<Set<number>>(
      new Set(),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [batchId, setBatchId] = useState("");
  const sheet = sheets[sheetIndex];
  const proposals = useMemo(
    () =>
      sheet && mapping
        ? proposeGuests(
            sheet.data,
            mapping,
            events,
            guests,
            `${filename} · ${sheet.sheet}`,
          )
        : [],
    [sheet, mapping, events, guests, filename],
  );
  const included = (row: (typeof proposals)[number]) =>
    !row.errors.length &&
    !excluded.has(row.sourceRow) &&
    (!row.duplicate || allowedDuplicates.has(row.sourceRow));
  const selected = proposals.filter(included);
  const duplicates = proposals.filter((row) => row.duplicate).length;
  function chooseSheet(value: number, all = sheets) {
    setSheetIndex(value);
    const guess = guessMapping(all[value].data, events);
    setMapping(guess.mapping);
    setHeaders(guess.headers);
    setExcluded(new Set());
    setAllowedDuplicates(new Set());
    setBatchId(crypto.randomUUID());
  }
  async function read(file?: File) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx"))
        throw new Error(
          "Bitte als Excel-Arbeitsmappe (.xlsx) speichern. Ältere .xls-Dateien werden nicht unterstützt.",
        );
      validateXlsxArchive(await file.arrayBuffer());
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const result = await readXlsxFile(file);
      if (
        !result.length ||
        result.some(
          (s) => s.data.length > 2000 || s.data.some((row) => row.length > 50),
        )
      )
        throw new Error(
          "Maximal 2.000 Zeilen und 50 Spalten je Tabellenblatt. Bitte die Datei auf die Gästeliste reduzieren.",
        );
      setFilename(file.name);
      setSheets(result);
      chooseSheet(0, result);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function column(
    key: Exclude<keyof ImportMapping, "events" | "startRow">,
    label: string,
    required = false,
  ) {
    return (
      <label>
        {label}
        <select
          value={mapping?.[key] ?? -1}
          onChange={(event) =>
            setMapping((previous) =>
              previous
                ? { ...previous, [key]: Number(event.target.value) }
                : previous,
            )
          }
        >
          {!required && <option value={-1}>Nicht zuordnen</option>}
          {headers.map((header, index) => (
            <option key={index} value={index}>
              {String.fromCharCode(65 + index)} · {header}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="guest-import form-stack">
      <p className="import-intro">
        Familien bleiben als Gruppen erhalten. Ihre Personenzahl zählt für jede
        zugeordnete Feier. Markierungen wie „x“ bedeuten zunächst „Vorgesehen“.
      </p>
      <label className="dropzone">
        <UploadSimple size={27} />
        <strong>
          {busy
            ? "Gästeliste wird gelesen …"
            : filename || "Excel-Gästeliste auswählen"}
        </strong>
        <span>.xlsx · bis 2 MB · Vorschau vor dem Speichern</span>
        <input
          aria-label="Excel-Gästeliste auswählen"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          onChange={(event) => void read(event.target.files?.[0])}
        />
      </label>
      <ErrorMessage message={error} />
      {mapping && sheet && (
        <>
          <div className="form-grid">
            <label>
              Tabellenblatt
              <select
                value={sheetIndex}
                onChange={(event) => chooseSheet(Number(event.target.value))}
              >
                {sheets.map((s, index) => (
                  <option key={index} value={index}>
                    {s.sheet}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Erste Datenzeile
              <input
                aria-label="Erste Datenzeile"
                type="number"
                min={1}
                max={sheet.data.length}
                value={mapping.startRow}
                onChange={(event) =>
                  setMapping({
                    ...mapping,
                    startRow: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
            </label>
          </div>
          <details className="further-offer-fields">
            <summary>Spaltenzuordnung prüfen</summary>
            <div className="form-stack">
              <div className="form-grid">
                {column("name", "Name / Familie", true)}
                {column("lastName", "Nachname (optional)")}
                {column("count", "Personenzahl")}
                {column("household", "Haushalt / Gruppe")}
                {column("dietary", "Essen / Allergien")}
                {column("notes", "Hinweise")}
              </div>
            </div>
          </details>
          <section className="import-event-mapping">
            <h3>Welche Spalte gehört zu welcher Feier?</h3>
            <label>
              Weitere Veranstaltungsspalte zuordnen
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value !== "")
                    setMapping({
                      ...mapping,
                      events: { ...mapping.events, [event.target.value]: [] },
                    });
                }}
              >
                <option value="">Spalte wählen …</option>
                {headers.map(
                  (header, index) =>
                    index !== mapping.name &&
                    index !== mapping.count &&
                    !(index in mapping.events) && (
                      <option key={index} value={index}>
                        {String.fromCharCode(65 + index)} · {header}
                      </option>
                    ),
                )}
              </select>
            </label>
            <p>
              „Beides“ kann zwei Feiern umfassen. Wählt hier ausdrücklich aus,
              welche gemeint sind. Eine Zuordnung ist keine Zusage.
            </p>
            {Object.keys(mapping.events).length ? (
              Object.entries(mapping.events).map(([column, ids]) => (
                <fieldset key={column}>
                  <legend>
                    Spalte {String.fromCharCode(65 + Number(column))}:{" "}
                    {headers[Number(column)]}
                  </legend>
                  {events.map((event) => (
                    <label key={event.id}>
                      <input
                        type="checkbox"
                        checked={ids.includes(event.id)}
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            events: {
                              ...mapping.events,
                              [column]: e.target.checked
                                ? [...ids, event.id]
                                : ids.filter((id) => id !== event.id),
                            },
                          })
                        }
                      />
                      {event.name}
                    </label>
                  ))}
                </fieldset>
              ))
            ) : (
              <p>
                Keine Veranstaltungsspalten erkannt. Die Zuordnung bleibt offen
                und lässt sich später je Gast ergänzen.
              </p>
            )}
          </section>
          <div className="import-summary" aria-live="polite">
            <div>
              <FileXls size={20} />
              <strong>{selected.length}</strong>
              <span>Einträge ausgewählt</span>
            </div>
            <div>
              <CheckCircle size={20} />
              <strong>{peopleCount(selected.map((row) => row.guest))}</strong>
              <span>Personen insgesamt</span>
            </div>
            <div>
              <strong>{duplicates}</strong>
              <span>Namensgleichheiten zur Prüfung</span>
            </div>
          </div>
          {proposals.length > 500 && (
            <ErrorMessage message="Maximal 500 Einträge pro Import. Bitte die Liste aufteilen." />
          )}
          <div className="table-scroll import-preview">
            <table className="list-table">
              <caption>Importvorschau · {filename}</caption>
              <thead>
                <tr>
                  <th>Übernehmen</th>
                  <th>Name / Familie</th>
                  <th>Personen</th>
                  {events.map((event) => (
                    <th key={event.id}>{event.name}</th>
                  ))}
                  <th>Prüfung</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((row) => (
                  <tr key={row.sourceRow}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Zeile ${row.sourceRow}: ${row.guest.name} übernehmen`}
                        checked={included(row)}
                        disabled={!!row.errors.length}
                        onChange={(event) => {
                          setExcluded((previous) => {
                            const next = new Set(previous);
                            event.target.checked
                              ? next.delete(row.sourceRow)
                              : next.add(row.sourceRow);
                            return next;
                          });
                          if (row.duplicate)
                            setAllowedDuplicates((previous) => {
                              const next = new Set(previous);
                              event.target.checked
                                ? next.add(row.sourceRow)
                                : next.delete(row.sourceRow);
                              return next;
                            });
                        }}
                      />
                    </td>
                    <th>
                      {row.guest.name || "Name fehlt"}
                      <small>Excel-Zeile {row.sourceRow}</small>
                    </th>
                    <td>{row.guest.partySize}</td>
                    {events.map((event) => (
                      <td key={event.id}>{row.guest.attendance[event.id]}</td>
                    ))}
                    <td>
                      {row.duplicate && (
                        <p>
                          Namensgleichheit: standardmäßig ausgelassen. Nur
                          bewusst als weitere Person/Gruppe übernehmen.
                        </p>
                      )}
                      {row.errors.map((message) => (
                        <p className="field-error" key={message}>
                          {message}
                        </p>
                      ))}
                      {row.warnings.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!proposals.length && (
            <p>
              Keine Datenzeilen gefunden. Bitte Tabellenblatt und
              Spaltenzuordnung prüfen.
            </p>
          )}
          <p className="privacy-note">
            Die Excel-Datei wird auf deinem Gerät gelesen. Erst beim Bestätigen
            werden die ausgewählten Gäste privat gespeichert. Vorhandene
            Einträge werden nicht überschrieben.
          </p>
          <Button
            disabled={busy || !selected.length || proposals.length > 500}
            onClick={async () => {
              setError("");
              setBusy(true);
              try {
                const result = await api<{
                  created: number;
                  skipped: number;
                  people: number;
                }>("/guests/import", {
                  method: "POST",
                  body: json({
                    batchId,
                    rows: selected.map((row) => ({
                      sourceRow: row.sourceRow,
                      guest: row.guest,
                      allowDuplicate: allowedDuplicates.has(row.sourceRow),
                    })),
                  }),
                });
                onSaved(
                  `${result.created} Einträge mit ${result.people} Personen importiert${result.skipped ? ` · ${result.skipped} bereits vorhandene Einträge ausgelassen` : ""}.`,
                );
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Gäste werden gespeichert …"
              : `${selected.length} Einträge mit ${peopleCount(selected.map((row) => row.guest))} Personen importieren`}
          </Button>
        </>
      )}
    </div>
  );
}
