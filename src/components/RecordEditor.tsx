import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, getState, saveRecord } from "../api";
import { mergeRecord, recordLabels } from "../record-conflicts";
import type { PlanningRecord, RecordChoice } from "../record-conflicts";
import { categories } from "../data";
import type { AppState, Kind, Stored } from "../data";
import { Button, ErrorMessage } from "./ui";
import { attendanceValues } from "../../shared/guests.mjs";
export default function RecordEditor({
  kind,
  record,
  state,
  onSaved,
  onStatusChange,
}: {
  kind: Exclude<Kind, "offers">;
  record?: Record<string, unknown> & Partial<Stored>;
  state: AppState;
  onSaved: () => void;
  onStatusChange: (status: { dirty: boolean; saving: boolean }) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [displayRecord, setDisplayRecord] = useState(record);
  const baseline = useRef(record);
  const pendingBaseline = useRef<PlanningRecord | null>(null);
  const [revision, setRevision] = useState(0);
  const [conflict, setConflict] = useState<{
    mine: PlanningRecord;
    shared: PlanningRecord;
  } | null>(null);
  const [choices, setChoices] = useState<Record<string, RecordChoice>>({});
  const locked = busy || !!conflict;
  const merge =
    conflict && baseline.current
      ? mergeRecord(baseline.current, conflict.mine, conflict.shared, choices)
      : null;
  const form = useRef<HTMLFormElement>(null);
  const conflictRegion = useRef<HTMLElement>(null);
  const initial = useRef("");
  useEffect(() => {
    if (conflict) conflictRegion.current?.focus();
  }, [conflict]);
  useLayoutEffect(() => {
    if (!form.current) return;
    const entries = [...new FormData(form.current)];
    const nextBase = pendingBaseline.current;
    initial.current = JSON.stringify(
      nextBase
        ? entries.map(([key]) => [
            key,
            key.startsWith("attendance-")
              ? (nextBase.attendance as Record<string, string> | undefined)?.[
                  key.slice(11)
                ] || "Nicht eingeladen"
              : String(nextBase[key] ?? (key === "partySize" ? 1 : "")),
          ])
        : entries,
    );
    pendingBaseline.current = null;
    setDirty(JSON.stringify(entries) !== initial.current);
    if (nextBase)
      form.current
        .querySelector<HTMLElement>("input, select, textarea")
        ?.focus();
  }, [revision]);
  useEffect(
    () => onStatusChange({ dirty, saving: busy }),
    [dirty, busy, onStatusChange],
  );
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  const value = (key: string, fallback: string | number = "") =>
    String(displayRecord?.[key] ?? fallback);
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
        disabled={locked}
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
        disabled={locked}
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
      <select name={key} disabled={locked} defaultValue={value(key, fallback)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "Noch offen"}
          </option>
        ))}
      </select>
    </label>
  );
  const eventOptions = [
    "",
    ...state.events.map((e) => e.name),
    "Mehrere Veranstaltungen",
  ];
  if (value("event") && !eventOptions.includes(value("event")))
    eventOptions.push(value("event"));
  const eventSelect = select("event", "Veranstaltung", eventOptions);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) return;
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const numeric = (key: string) =>
      fields[key] === "" || fields[key] === undefined
        ? null
        : Number(fields[key]);
    const data: PlanningRecord = { ...baseline.current, ...fields };
    if (kind === "tasks") data.done = baseline.current?.done || false;
    if (kind === "costs") {
      data.amount = numeric("amount");
      data.paid = numeric("paid");
      data.offerId = baseline.current?.offerId || null;
    }
    if (kind === "events") data.guests = numeric("guests");
    if (kind === "settings") {
      for (const key of ["target", "limit", "fixed", "perGuest"])
        data[key] = numeric(key);
      data.guests = numeric("guests") ?? 200;
    }
    if (kind === "guests") {
      data.partySize = numeric("partySize") ?? 1;
      data.attendance = Object.fromEntries(
        state.events.map((event) => [
          event.id,
          fields["attendance-" + event.id] || "Nicht eingeladen",
        ]),
      );
    }
    try {
      await saveRecord(kind, data);
      setDirty(false);
      onStatusChange({ dirty: false, saving: false });
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && data.id) {
        try {
          const latest = await getState();
          const shared = latest[kind].find((row) => row.id === data.id) as
            PlanningRecord | undefined;
          if (!shared)
            setError(
              "Dieser Eintrag wurde inzwischen gelöscht. Deine Eingaben bleiben hier erhalten; der Eintrag wird nicht neu angelegt.",
            );
          else if (shared.version !== baseline.current?.version) {
            setConflict({ mine: data, shared });
            setChoices({});
          } else setError(error.message);
        } catch {
          setError(
            "Die gemeinsame Fassung konnte nicht geladen werden. Deine Eingaben bleiben erhalten. Bitte Verbindung prüfen und erneut speichern.",
          );
        }
      } else setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      key={revision}
      ref={form}
      className="form-stack"
      onSubmit={submit}
      aria-busy={busy}
      onChange={() => {
        if (locked) return;
        if (form.current)
          setDirty(
            JSON.stringify([...new FormData(form.current)]) !== initial.current,
          );
      }}
    >
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
            <select
              name="owner"
              disabled={locked}
              defaultValue={value("owner")}
            >
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
          <small>
            Beim Umbenennen bleiben zugeordnete Aufgaben, Dienstleister,
            Angebote und Kosten verbunden. Gästerückmeldungen bleiben bei
            derselben Feier.
          </small>
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
          <label>
            Anzahl Personen
            <input
              name="partySize"
              disabled={locked}
              type="number"
              min={1}
              max={1000}
              step={1}
              required
              defaultValue={value("partySize", 1)}
            />
            <small>
              Eine Familie kann als Gruppe erfasst werden. Die Anzahl zählt für
              die jeweilige Rückmeldung der ganzen Gruppe.
            </small>
          </label>
          {select(
            "type",
            "Person",
            ["Erwachsen", "Kind", "Begleitung", "Gruppe", "Nicht angegeben"],
            "Erwachsen",
          )}
          {state.events.map((event) => (
            <label key={event.id}>
              {event.name}: Einladung & Rückmeldung
              <select
                name={"attendance-" + event.id}
                disabled={locked}
                defaultValue={
                  (displayRecord?.attendance as Record<string, string>)?.[
                    event.id
                  ] || "Nicht eingeladen"
                }
              >
                {attendanceValues.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
          {area("dietary", "Essen & Unverträglichkeiten")}
          {field("table", "Tisch (optional)")}
          {area("notes", "Weitere Hinweise")}
        </>
      )}
      <ErrorMessage message={error} />
      {conflict && merge && (
        <section
          ref={conflictRegion}
          tabIndex={-1}
          className="offer-conflict"
          aria-label="Gemeinsame Änderungen prüfen"
        >
          <h3>Ihr habt beide weitergeplant.</h3>
          <p>
            Deine Eingaben bleiben erhalten. Verschiedene Angaben werden
            zusammengeführt; bei derselben Angabe wählt ihr einen Wert. Erst
            danach speichert ihr die geprüfte Fassung.
          </p>
          {merge.conflicts.map((field) => (
            <fieldset key={field.key}>
              <legend>
                {field.key.startsWith("attendance-")
                  ? `${state.events.find((event) => event.id === field.key.slice(11))?.name || "Feier"}: Einladung & Rückmeldung`
                  : recordLabels[field.key] || field.key}
              </legend>
              {(["mine", "shared"] as const).map((choice) => (
                <label key={choice}>
                  <input
                    type="radio"
                    name={`conflict-${field.key}`}
                    checked={choices[field.key] === choice}
                    onChange={() =>
                      setChoices((previous) => ({
                        ...previous,
                        [field.key]: choice,
                      }))
                    }
                  />
                  <span>
                    <strong>
                      {choice === "mine"
                        ? "Meine Eingabe"
                        : "Gemeinsamer Stand"}
                    </strong>
                    {field.key === "owner"
                      ? state.members.find(
                          (member) => member.id === field[choice],
                        )?.name || "Noch offen"
                      : typeof field[choice] === "boolean"
                        ? field[choice]
                          ? "Ja"
                          : "Nein"
                        : String(field[choice] ?? "Noch offen") || "Noch offen"}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
          {!merge.conflicts.length && (
            <p>
              Ihr habt unterschiedliche Angaben geändert. Beide Änderungen
              passen zusammen.
            </p>
          )}
          <div className="offer-conflict-actions">
            <Button
              disabled={merge.unresolved}
              onClick={() => {
                baseline.current = conflict.shared;
                pendingBaseline.current = conflict.shared;
                setDisplayRecord(merge.merged);
                setConflict(null);
                setChoices({});
                setRevision((value) => value + 1);
              }}
            >
              Zusammengeführte Fassung prüfen
            </Button>
            <Button
              secondary
              onClick={() => {
                setConflict(null);
                setChoices({});
              }}
            >
              Eigene Eingaben weiter bearbeiten
            </Button>
          </div>
          <small>
            Noch nichts gespeichert. Weitere gemeinsame Änderungen werden beim
            Speichern erneut geprüft.
          </small>
        </section>
      )}
      {dirty && (
        <small role="status">
          Noch nicht gespeichert. Erst „Dauerhaft speichern“ übernimmt eure
          Änderungen.
        </small>
      )}
      <Button type="submit" disabled={locked}>
        {busy ? "Wird gespeichert …" : "Dauerhaft speichern"}
      </Button>
      <small>
        Änderungen sind für beide Konten sichtbar. Bei gleichzeitiger
        Bearbeitung werdet ihr auf Konflikte hingewiesen.
      </small>
    </form>
  );
}
