import { useEffect, useState } from "react";
import { Check, FileText, Info, UploadSimple } from "@phosphor-icons/react";
import { api, json, saveRecord } from "../api";
import { categories, emptyOffer } from "../data";
import type { Document, Offer, Provider, WeddingEvent } from "../data";
import { Badge, Button, ErrorMessage } from "./ui";

export default function OfferReview({
  offer,
  initialDocument,
  providers,
  events,
  onSaved,
}: {
  offer?: Offer;
  initialDocument?: string;
  providers: Provider[];
  events: WeddingEvent[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<Offer>>(() => ({
    ...emptyOffer,
    ...offer,
  }));
  const [documentId, setDocumentId] = useState(
    initialDocument || offer?.documentId || "",
  );
  const [doc, setDoc] = useState<Document | null>(null);
  const [applied, setApplied] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [mode, setMode] = useState("file");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [corrected, setCorrected] = useState<string[]>(
    offer?.manualFields || [],
  );
  const [selectedQuote, setSelectedQuote] = useState("");
  useEffect(() => {
    if (!documentId) return;
    let active = true;
    const load = () =>
      api<Document>(`/documents/${documentId}`)
        .then((value) => {
          if (active) setDoc(value);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void load();
    const timer = setInterval(load, 1800);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [documentId]);
  useEffect(() => {
    if (!doc?.analysis || applied === documentId) return;
    if (!offer || offer.documentId !== documentId) {
      setDraft((previous) => ({
        ...emptyOffer,
        ...doc.analysis!.fields,
        id: previous.id,
        version: previous.version,
        providerId: previous.providerId || null,
        documentId,
        evidence: doc.analysis!.evidence,
        source: doc.name,
        confirmed: true,
      }));
      setCorrected([]);
    }
    setApplied(documentId);
  }, [doc, documentId, applied, offer]);
  function set<K extends keyof Offer>(key: K, value: Offer[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setCorrected((previous) =>
      previous.includes(key) ? previous : [...previous, key],
    );
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("Maximal 15 MB pro Datei.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await api<{ id: string }>("/documents", {
        method: "POST",
        body,
      });
      setDoc(null);
      setDocumentId(response.id);
      setPageNumber(1);
      setDraft((previous) => ({
        ...emptyOffer,
        providerId: previous.providerId || null,
        documentId: response.id,
      }));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const sources = doc?.analysis?.evidence || draft.evidence || {};
  const source = (key: keyof Offer) =>
    sources[key]?.length ? (
      <details className="field-source">
        <summary>
          {corrected.includes(key)
            ? "Manuell angepasst · ursprüngliche Fundstelle"
            : "Fundstelle im Original"}
        </summary>
        {sources[key].map((item, index) => (
          <button
            type="button"
            key={index}
            onClick={() => {
              setPageNumber(item.page);
              setSelectedQuote(item.quote);
            }}
          >
            <strong>Seite {item.page}</strong> · {item.quote}
          </button>
        ))}
      </details>
    ) : (
      <small className="unknown-source">
        {doc?.analysis
          ? "Keine eindeutige Fundstelle. Manuell ergänzen oder offenlassen."
          : "Manuelle Angabe"}
      </small>
    );
  const input = (key: keyof Offer, label: string, type = "text") => (
    <label key={key}>
      {label}
      <input
        aria-label={label}
        type={type}
        value={String(draft[key] ?? "")}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        maxLength={type === "text" ? 4000 : undefined}
        placeholder="Nicht angegeben"
        onChange={(e) =>
          set(
            key,
            (type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value) as never,
          )
        }
      />
      {source(key)}
    </label>
  );
  const area = (key: keyof Offer, label: string) => (
    <label key={key}>
      {label}
      <textarea
        aria-label={label}
        value={String(draft[key] || "")}
        rows={3}
        maxLength={4000}
        placeholder="Nicht angegeben"
        onChange={(e) => set(key, e.target.value as never)}
      />
      {source(key)}
    </label>
  );
  const currentPage = doc?.analysis?.pages.find(
    (page) => page.page === pageNumber,
  );
  return (
    <>
      <div className="review-notice">
        <Info size={19} />
        <span>
          <strong>Echte lokale Auswertung, keine kostenpflichtige KI.</strong>{" "}
          PDF-Text und OCR werden auf eurem Rechner verarbeitet. Regeln schlagen
          Angaben vor; ihr bestätigt sie vor der Übernahme.
        </span>
      </div>
      <ErrorMessage message={error} />
      <div className="review-layout">
        <section className="original-pane">
          <div className="pane-title">
            <FileText size={18} />
            <strong>Euer Original</strong>
            <Badge>Privat gespeichert</Badge>
          </div>
          <div className="segmented">
            <button
              aria-pressed={mode === "file"}
              onClick={() => setMode("file")}
            >
              Datei hochladen
            </button>
            <button
              aria-pressed={mode === "text"}
              onClick={() => setMode("text")}
            >
              Text einfügen
            </button>
          </div>
          {mode === "file" ? (
            <label
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void upload(e.dataTransfer.files[0]);
              }}
            >
              <UploadSimple size={29} />
              <strong>
                {busy
                  ? "Wird gespeichert …"
                  : "PDF, Screenshot oder Textdatei hinzufügen"}
              </strong>
              <span>Datei auswählen oder hier ablegen</span>
              <small>
                PDF, PNG, JPG, WebP, UTF-8-TXT · max. 15 MB · PDF bis 20 Seiten
              </small>
              <input
                disabled={busy}
                type="file"
                aria-label="Angebotsdatei auswählen"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="form-stack">
              <label>
                Angebotstext
                <textarea
                  rows={9}
                  value={text}
                  maxLength={200000}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <Button
                secondary
                disabled={busy || !text.trim()}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await api<{ id: string }>(
                      "/documents/text",
                      { method: "POST", body: json({ text }) },
                    );
                    setDoc(null);
                    setDocumentId(result.id);
                    setDraft((previous) => ({
                      ...emptyOffer,
                      providerId: previous.providerId || null,
                      documentId: result.id,
                    }));
                  } catch (error) {
                    setError((error as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Text speichern und auswerten
              </Button>
            </div>
          )}
          {doc && (
            <div className="document-analysis-state" role="status">
              <Badge tone={doc.status === "complete" ? "success" : "warm"}>
                {doc.progress}
              </Badge>
              <strong>{doc.name}</strong>
              {doc.error && (
                <>
                  <ErrorMessage message={doc.error} />
                  <Button
                    secondary
                    onClick={() =>
                      void api(`/documents/${documentId}/retry`, {
                        method: "POST",
                      }).catch((e) => setError(e.message))
                    }
                  >
                    Auswertung erneut versuchen
                  </Button>
                </>
              )}
            </div>
          )}
          {documentId &&
            doc &&
            (doc.mime === "application/pdf" ? (
              <iframe
                className="file-preview"
                title="Gespeichertes PDF-Original"
                src={`/api/documents/${documentId}/file#page=${pageNumber}`}
              />
            ) : doc.mime.startsWith("image/") ? (
              <img
                className="file-preview"
                alt="Gespeichertes Originalangebot"
                src={`/api/documents/${documentId}/file`}
              />
            ) : null)}
          {doc?.analysis && (
            <>
              <div className="page-selector">
                <label>
                  Erkannte Seite
                  <select
                    value={pageNumber}
                    onChange={(e) => setPageNumber(Number(e.target.value))}
                  >
                    {doc.analysis.pages.map((p) => (
                      <option key={p.page} value={p.page}>
                        Seite {p.page} · {p.method}
                        {p.confidence === undefined
                          ? ""
                          : ` · OCR ${Math.round(p.confidence)} %`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <pre className="document-text">
                {currentPage?.text.split("\n").map((line, i) => (
                  <span key={i}>
                    {line === selectedQuote ? <mark>{line}</mark> : line}
                    {"\n"}
                  </span>
                ))}
              </pre>
              <div className="analysis-warnings">
                {doc.analysis.warnings.map((warning, i) => (
                  <p key={i}>• {warning}</p>
                ))}
              </div>
            </>
          )}
          <small className="privacy-note">
            Das Original bleibt für beide Konten verfügbar. Keine
            Dokumentinhalte werden an OpenAI oder andere Auswertungsdienste
            übertragen. Lokale OCR kann Zeichen und Tabellen falsch lesen;
            Fundstellen bitte prüfen.
          </small>
        </section>
        <form
          className="review-form form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              await saveRecord("offers", {
                ...draft,
                documentId: documentId || null,
                evidence: sources,
                manualFields: corrected,
                confirmed: true,
              });
              onSaved();
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="pane-title">
            <Check size={18} />
            <strong>Angaben prüfen und bestätigen</strong>
          </div>
          <label>
            Anbieter
            <input
              aria-label="Anbieter"
              required
              maxLength={200}
              value={draft.name || ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Name aus dem Original"
            />
            {source("name")}
          </label>
          <label>
            Mit Dienstleister verknüpfen
            <select
              value={draft.providerId || ""}
              onChange={(e) => set("providerId", e.target.value || null)}
            >
              <option value="">Noch nicht zugeordnet</option>
              {providers.map((provider) => (
                <option value={provider.id} key={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <small>
              Mehrere Angebote desselben Dienstleisters bleiben so zusammen.
            </small>
          </label>
          <div className="form-grid">
            <label>
              Kategorie
              <select
                value={draft.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {input("packageName", "Paket / Fassung")}
          </div>
          <fieldset className="event-checkboxes">
            <legend>Abgedeckte Veranstaltungen</legend>
            {events.map((event) => (
              <label key={event.id}>
                <input
                  type="checkbox"
                  checked={draft.events?.includes(event.name) || false}
                  onChange={(e) =>
                    set(
                      "events",
                      e.target.checked
                        ? [...(draft.events || []), event.name]
                        : (draft.events || []).filter((n) => n !== event.name),
                    )
                  }
                />
                {event.name}
              </label>
            ))}
            {source("events")}
          </fieldset>
          <div className="form-grid">
            {input("price", "Paketgesamtpreis", "number")}
            <label>
              Währung
              <select
                value={draft.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {["Nicht angegeben", "EUR", "USD", "GBP"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {source("currency")}
            </label>
          </div>
          <label>
            Preisbasis
            <select
              value={draft.basis}
              onChange={(e) => set("basis", e.target.value)}
            >
              <option>Nicht angegeben</option>
              <option>Brutto</option>
              <option>Netto</option>
            </select>
            {source("basis")}
          </label>
          <div className="form-grid">
            {input("deposit", "Anzahlung", "number")}
            {input("balance", "Restbetrag", "number")}
          </div>
          {input("offerDate", "Angebotsdatum")}
          {input("validity", "Gültigkeit")}
          {area("included", "Enthaltene Leistungen")}
          {area("excluded", "Ausdrücklich nicht enthalten")}
          {area("optional", "Optionale Zusatzleistungen & Preise")}
          {area("extras", "Fahrt, Übernachtung & Nebenkosten")}
          {area("paymentTerms", "Zahlungsbedingungen")}
          {input("hours", "Dauer der Begleitung")}
          {input("team", "Foto-/Videografen")}
          {input("photos", "Bearbeitete Bilder, Galerie & Album")}
          {input("video", "Filmarten und Filmlängen")}
          {input("extraHours", "Zusätzliche Stunden")}
          {input("delivery", "Lieferzeit")}
          {area("contact", "Kontaktangaben")}
          {area("questions", "Offene Fragen")}
          {input("source", "Weitere Quellenangabe")}
          {area("decision", "Eure Einschätzung & Entscheidung")}
          <label className="confirmation">
            <input type="checkbox" required />
            <span>
              Ich habe Original und Angaben geprüft. Fehlendes bleibt offen.
              Optionale Extras wurden nicht zum Paketpreis addiert.
            </span>
          </label>
          <Button
            type="submit"
            disabled={
              busy ||
              (!!documentId && !doc) ||
              doc?.status === "running" ||
              doc?.status === "queued"
            }
          >
            {busy
              ? "Wird gespeichert …"
              : "Bestätigt in den Vergleich übernehmen"}
          </Button>
          <small>
            Speichert das geprüfte Angebot. Eine Buchung wird erst separat
            bestätigt.
          </small>
        </form>
      </div>
    </>
  );
}
