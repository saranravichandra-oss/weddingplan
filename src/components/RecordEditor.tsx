import { useState } from "react";
import type { FormEvent } from "react";
import { saveRecord } from "../api";
import { categories } from "../data";
import type { AppState, Kind, Stored } from "../data";
import { Button, ErrorMessage } from "./ui";
export default function RecordEditor({
  kind,
  record,
  state,
  onSaved,
}: {
  kind: Exclude<Kind, "offers">;
  record?: Record<string, unknown> & Partial<Stored>;
  state: AppState;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const value = (key: string, fallback: string | number = "") =>
    String(record?.[key] ?? fallback);
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label key={key}>
      {label}
      <input
        name={key}
        type={type}
        required={required}
        defaultValue={value(key)}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? (key === "guests" ? "1" : "0.01") : undefined}
        maxLength={type === "text" ? 200 : undefined}
      />
    </label>
  );
  const area = (key: string, label: string) => (
    <label key={key}>
      {label}
      <textarea
        name={key}
        defaultValue={value(key)}
        rows={3}
        maxLength={4000}
      />
    </label>
  );
  const select = (
    key: string,
    label: string,
    options: string[],
    fallback = "",
  ) => (
    <label key={key}>
      {label}
      <select name={key} defaultValue={value(key, fallback)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "Noch offen"}
          </option>
        ))}
      </select>
    </label>
  );
  const eventSelect = select("event", "Veranstaltung", [
    "",
    ...state.events.map((e) => e.name),
    "Mehrere Veranstaltungen",
  ]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const numeric = (key: string) =>
      fields[key] === "" || fields[key] === undefined
        ? null
        : Number(fields[key]);
    const data: Record<string, unknown> = { ...record, ...fields };
    if (kind === "tasks") data.done = record?.done || false;
    if (kind === "costs") {
      data.amount = numeric("amount");
      data.paid = numeric("paid");
      data.offerId = record?.offerId || null;
    }
    if (kind === "events") data.guests = numeric("guests");
    if (kind === "settings") {
      for (const key of ["target", "limit", "fixed", "perGuest"])
        data[key] = numeric(key);
      data.guests = numeric("guests") ?? 200;
    }
    if (kind === "guests") {
      data.attendance = Object.fromEntries(
        state.events.map((event) => [
          event.id,
          fields["attendance-" + event.id] || "Nicht eingeladen",
        ]),
      );
    }
    try {
      await saveRecord(kind, data);
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      {kind === "providers" && (
        <>
          {field("name", "Name", "text", true)}
          {select("category", "Kategorie", categories, "Foto & Video")}
          {eventSelect}
          {field("website", "Website", "url")}
          {field("email", "E-Mail", "email")}
          {field("phone", "Telefon")}
          {field("region", "Region / Einsatzgebiet")}
          {select(
            "status",
            "Status",
            [
              "Gefunden",
              "Angefragt",
              "Im Gespräch",
              "Angebot erhalten",
              "Favorit",
              "Gebucht",
              "Abgesagt",
            ],
            "Gefunden",
          )}
          {field("nextAction", "Nächste Aktion")}
          {area("notes", "Eindruck, Portfolio & Notizen")}
        </>
      )}
      {kind === "tasks" && (
        <>
          {field("title", "Aufgabe", "text", true)}
          {area("detail", "Beschreibung")}
          {select(
            "priority",
            "Priorität",
            ["Hoch", "Normal", "Niedrig"],
            "Normal",
          )}
          <label>
            Verantwortlich
            <select name="owner" defaultValue={value("owner")}>
              <option value="">Noch offen</option>
              {state.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          {field("due", "Termin", "date")}
          {eventSelect}
          {field("category", "Kategorie")}
        </>
      )}
      {kind === "costs" && (
        <>
          {field("label", "Kostenposition", "text", true)}
          {select("category", "Kategorie", ["", ...categories])}
          {eventSelect}
          {select(
            "stage",
            "Kostenstatus",
            ["Geschätzt", "Angebot", "Beauftragt"],
            "Geschätzt",
          )}
          <p>
            Nur „Beauftragt“ zählt zum gebuchten Budget. Gemeinsame Kosten für
            mehrere Feiern hier einmal erfassen.
          </p>
          {field("amount", "Gesamtbetrag in EUR (leer = unbekannt)", "number")}
          {field("paid", "Bereits gezahlt in EUR (leer = unbekannt)", "number")}
          {field("due", "Zahlungsfrist", "date")}
          {area("notes", "Leistungsumfang & Zahlungsnotizen")}
        </>
      )}
      {kind === "events" && (
        <>
          {field("name", "Veranstaltung", "text", true)}
          {field("date", "Datum", "date")}
          {field("location", "Ort / Adresse")}
          {field("guests", "Geplante Gäste (leer = offen)", "number")}
          {field("status", "Planungsstatus")}
          {area("traditions", "Eure Rituale und Traditionen")}
          {area("notes", "Ablauf & Notizen")}
        </>
      )}
      {kind === "settings" && (
        <>
          <p>
            Alle Beträge sind Planungswerte in EUR. Unbekannte Beträge bleiben
            leer.
          </p>
          {field("target", "Zielbudget", "number")}
          {field("limit", "Obergrenze", "number")}
          {field("guests", "Gäste als Planungsannahme", "number", true)}
          {field("fixed", "Weitere feste Kosten für das Szenario", "number")}
          {field("perGuest", "Kosten pro Gast für das Szenario", "number")}
        </>
      )}
      {kind === "guests" && (
        <>
          {field("name", "Name", "text", true)}
          {field("household", "Haushalt")}
          {select(
            "type",
            "Person",
            ["Erwachsen", "Kind", "Begleitung"],
            "Erwachsen",
          )}
          {state.events.map((event) => (
            <label key={event.id}>
              {event.name}: Einladung & Rückmeldung
              <select
                name={"attendance-" + event.id}
                defaultValue={
                  (record?.attendance as Record<string, string>)?.[event.id] ||
                  "Nicht eingeladen"
                }
              >
                {["Nicht eingeladen", "Eingeladen", "Zugesagt", "Abgesagt"].map(
                  (option) => (
                    <option key={option}>{option}</option>
                  ),
                )}
              </select>
            </label>
          ))}
          {area("dietary", "Essen & Unverträglichkeiten")}
          {field("table", "Tisch (optional)")}
          {area("notes", "Weitere Hinweise")}
        </>
      )}
      <ErrorMessage message={error} />
      <Button type="submit" disabled={busy}>
        {busy ? "Wird gespeichert …" : "Dauerhaft speichern"}
      </Button>
      <small>
        Änderungen sind für beide Konten sichtbar. Bei gleichzeitiger
        Bearbeitung werdet ihr auf Konflikte hingewiesen.
      </small>
    </form>
  );
}
