import { useEffect, useState, useRef } from "react";
import { Check, FileText, Info, UploadSimple } from "@phosphor-icons/react";
import { api, json, saveRecord, getState, ApiError } from "../api";
import { analyzeDocument, cloudMode, uploadDocument } from "../documents";
import { categories, emptyOffer } from "../data";
import type { Document, Offer, Provider, WeddingEvent } from "../data";
import { Badge, Button, ErrorMessage } from "./ui";
import { mergeOffer, offerLabels } from "../offer-conflicts";
import type { MergeChoice } from "../offer-conflicts";
import {
  offerDraftKey,
  readOfferDraft,
  writeOfferDraft,
  clearOfferDrafts,
  forgetOfferDraft,
} from "../offer-drafts";

export default function OfferReview({
  userId,
  offer,
  latestOffer,
  initialDocument,
  providers,
  events,
  onSaved,
  onUnsavedChange,
}: {
  userId: string;
  offer?: Offer;
  latestOffer?: Offer;
  initialDocument?: string;
  providers: Provider[];
  events: WeddingEvent[];
  onSaved: () => void;
  onUnsavedChange: (unsaved: boolean) => void;
}) {
  const draftKey = offerDraftKey(userId, offer?.id || initialDocument || "new");
  const [cached] = useState(() => readOfferDraft(draftKey));
  const [baseOffer, setBaseOffer] = useState<Offer | undefined>(
    () =>
      cached?.baseOffer ||
      (cached && cached.draft.version !== offer?.version ? undefined : offer),
  );
  const [remoteOffer, setRemoteOffer] = useState<Offer | undefined>();
  const [mergeChoices, setMergeChoices] = useState<Record<string, MergeChoice>>(
    {},
  );
  const currentOffer =
    remoteOffer && (!latestOffer || remoteOffer.version > latestOffer.version)
      ? remoteOffer
      : latestOffer;
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(!!cached),
    [draftStored, setDraftStored] = useState(!!cached);
  const submitted = useRef(false);
  const [draft, setDraft] = useState<Partial<Offer>>(() => ({
    ...emptyOffer,
    ...offer,
    ...cached?.draft,
  }));
  const [documentId, setDocumentId] = useState(
    cached?.documentId || initialDocument || offer?.documentId || "",
  );
  const [doc, setDoc] = useState<Document | null>(null);
  const [applied, setApplied] = useState(cached?.applied || "");
  const [pageNumber, setPageNumber] = useState(1);
  const [mode, setMode] = useState(cached?.mode || "file");
  const [text, setText] = useState(cached?.text || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [corrected, setCorrected] = useState<string[]>(
    cached?.corrected || offer?.manualFields || [],
  );
  const [selectedQuote, setSelectedQuote] = useState("");
  const [localProgress, setLocalProgress] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!dirty || submitted.current) return;
    setDraftStored(
      writeOfferDraft(draftKey, {
        draft,
        documentId,
        corrected,
        mode,
        text,
        applied,
        savedAt: new Date().toISOString(),
        baseOffer,
      }),
    );
  }, [
    draftKey,
    draft,
    documentId,
    corrected,
    mode,
    text,
    applied,
    dirty,
    baseOffer,
  ]);
  useEffect(() => setMergeChoices({}), [currentOffer?.version]);
  useEffect(() => {
    onUnsavedChange(dirty && !draftStored);
    return () => onUnsavedChange(false);
  }, [dirty, draftStored, onUnsavedChange]);
  useEffect(() => {
    if (!dirty || draftStored) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, draftStored]);
  useEffect(() => {
    if (!cloudMode || !documentId || !doc?.mime || !doc.uploaded) return;
    let active = true,
      objectUrl = "";
    fetch(`/api/documents/${documentId}/file`, { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Original nicht erreichbar.");
        const data = await response.arrayBuffer();
        if (!active) return;
        objectUrl = URL.createObjectURL(new Blob([data], { type: doc.mime }));
        setPreview(objectUrl);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreview("");
    };
  }, [documentId, doc?.mime, doc?.uploaded]);
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
    const timer = setInterval(
      () => {
        if (
          !document.hidden &&
          doc?.status !== "complete" &&
          doc?.status !== "error"
        )
          void load();
      },
      cloudMode ? 3000 : 1800,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [documentId, doc?.status]);
  useEffect(() => {
    if (!doc?.analysis || applied === documentId) return;
    if (!offer || offer.documentId !== documentId) {
      setDraft((previous) => ({
        ...emptyOffer,
        ...doc.analysis!.fields,
        ...Object.fromEntries(
          corrected.map((key) => [key, previous[key as keyof Offer]]),
        ),
        id: previous.id,
        version: previous.version,
        providerId: previous.providerId || null,
        documentId,
        evidence: doc.analysis!.evidence,
        source: doc.name,
        confirmed: true,
      }));
    } else {
      // Reanalysis supplements empty fields; it never overwrites a correction.
      setDraft((previous) => {
        const next = { ...previous };
        for (const [key, value] of Object.entries(doc.analysis!.fields)) {
          if (corrected.includes(key)) continue;
          const existing = next[key as keyof Offer];
          if (
            existing === undefined ||
            existing === null ||
            existing === "" ||
            (Array.isArray(existing) && !existing.length)
          )
            (next as Record<string, unknown>)[key] = value;
        }
        return {
          ...next,
          evidence: { ...previous.evidence, ...doc.analysis!.evidence },
        };
      });
    }
    setApplied(documentId);
  }, [doc, documentId, applied, offer, corrected]);
  function set<K extends keyof Offer>(key: K, value: Offer[K]) {
    setDirty(true);
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
      const response = await uploadDocument(file, setLocalProgress);
      setDoc(null);
      setDirty(true);
      setCorrected([]);
      setApplied("");
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
  const stale = !!(
    draft.id &&
    currentOffer &&
    draft.version !== currentOffer.version
  );
  const differentSource = !!(
    stale && currentOffer?.documentId !== (documentId || null)
  );
  const merge =
    stale && currentOffer
      ? mergeOffer(
          baseOffer,
          {
            ...draft,
            documentId: documentId || null,
            evidence: sources,
            manualFields: corrected,
          },
          currentOffer,
          mergeChoices,
        )
      : null;
  function adopt(next: Partial<Offer>, baseline?: Offer) {
    if (next.documentId !== documentId) setDoc(null);
    setDraft(next);
    setBaseOffer(baseline);
    setCorrected(next.manualFields || []);
    setDocumentId(next.documentId || "");
    setApplied(next.documentId || "");
    setDirty(true);
    setMergeChoices({});
    setError("");
    if (confirmationRef.current) confirmationRef.current.checked = false;
  }
  const conflictValue = (key: keyof Offer, value: unknown) =>
    key === "providerId"
      ? providers.find((provider) => provider.id === value)?.name ||
        "Nicht zugeordnet"
      : value === null || value === undefined || value === ""
        ? "Nicht angegeben"
        : Array.isArray(value)
          ? value.join(" + ") || "Nicht angegeben"
          : String(value);
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
        disabled={busy}
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
        disabled={busy}
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
      {dirty && (
        <div className="offer-draft-notice" role="status">
          <span>
            {draftStored
              ? cached
                ? "Entwurf aus diesem Tab wiederhergestellt."
                : "Entwurf in diesem Tab gesichert."
              : "Entwurf ist noch ungespeichert; der Browser erlaubt gerade keine lokale Sicherung."}{" "}
            Noch nicht in den gemeinsamen Vergleich übernommen.
          </span>
          <button
            type="button"
            onClick={() => {
              submitted.current = true;
              forgetOfferDraft(draftKey);
              const original = currentOffer || offer;
              setDraft({ ...emptyOffer, ...original });
              setBaseOffer(original);
              setDoc(null);
              setDocumentId(original?.documentId || initialDocument || "");
              setCorrected(original?.manualFields || []);
              setApplied(original?.documentId || "");
              setText("");
              setDirty(false);
              setDraftStored(false);
              submitted.current = false;
            }}
          >
            Entwurf verwerfen
          </button>
        </div>
      )}
      <div className="review-notice">
        <Info size={19} />
        <span>
          <strong>Echte lokale Auswertung, keine kostenpflichtige KI.</strong>{" "}
          PDF-Text und OCR werden auf eurem Rechner verarbeitet. Regeln schlagen
          Angaben vor; ihr bestätigt sie vor der Übernahme.
        </span>
      </div>
      <ErrorMessage message={error} />
      {stale && currentOffer && merge && (
        <section
          className="offer-conflict"
          aria-label="Gemeinsame Änderungen prüfen"
        >
          <h3>Ihr habt beide weitergeplant.</h3>
          <p>
            Eine neuere gemeinsame Fassung ist vorhanden. Dein Entwurf bleibt
            erhalten.{" "}
            {differentSource
              ? "Die Fassungen verwenden unterschiedliche Originale. Wählt eine Fassung oder führt deinen Entwurf als eigenes Angebot weiter."
              : "Unterschiedliche Felder lassen sich zusammenführen. Bei derselben Angabe entscheidet ihr, welcher Wert gelten soll."}
          </p>
          {!differentSource &&
            merge.conflicts.map((field) => (
              <fieldset key={field.key}>
                <legend>{offerLabels[field.key] || field.key}</legend>
                {(["mine", "shared"] as const).map((choice) => (
                  <label key={choice}>
                    <input
                      type="radio"
                      name={`conflict-${field.key}`}
                      checked={mergeChoices[field.key] === choice}
                      onChange={() =>
                        setMergeChoices((previous) => ({
                          ...previous,
                          [field.key]: choice,
                        }))
                      }
                    />
                    <span>
                      <strong>
                        {choice === "mine"
                          ? "Mein Entwurf"
                          : "Gemeinsamer Stand"}
                      </strong>
                      {conflictValue(field.key, field[choice])}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          <div className="offer-conflict-actions">
            {!differentSource && (
              <Button
                disabled={merge.unresolved}
                onClick={() => adopt(merge.merged, currentOffer)}
              >
                Änderungen zusammenführen
              </Button>
            )}
            <Button secondary onClick={() => adopt(currentOffer, currentOffer)}>
              Gemeinsame Fassung verwenden
            </Button>
            {differentSource && (
              <Button
                secondary
                onClick={() => {
                  const next = {
                    ...draft,
                    documentId: documentId || null,
                    evidence: sources,
                    manualFields: corrected,
                    status: "Geprüft",
                  };
                  delete next.id;
                  delete next.version;
                  delete next.updatedAt;
                  delete next.updatedBy;
                  adopt(next);
                }}
              >
                Entwurf als eigenes Angebot weiterführen
              </Button>
            )}
          </div>
          <small>
            Danach Angaben erneut prüfen und bestätigen. Erst das Speichern
            aktualisiert euren gemeinsamen Vergleich.
          </small>
        </section>
      )}
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
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  void upload(file);
                }}
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
                  onChange={(e) => {
                    setText(e.target.value);
                    setDirty(true);
                  }}
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
                    setDirty(true);
                    setCorrected([]);
                    setApplied("");
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
              {localProgress && doc.status !== "complete" && (
                <small>{localProgress}</small>
              )}
              {(doc.error ||
                (cloudMode &&
                  doc.uploaded &&
                  doc.status === "running" &&
                  !localProgress)) && (
                <>
                  {doc.error && <ErrorMessage message={doc.error} />}
                  <Button
                    secondary
                    onClick={async () => {
                      try {
                        await api(`/documents/${documentId}/retry`, {
                          method: "POST",
                        });
                        setDoc((previous) =>
                          previous
                            ? {
                                ...previous,
                                status: "running",
                                error: undefined,
                                analysis: null,
                              }
                            : previous,
                        );
                        setApplied("");
                        if (cloudMode)
                          await analyzeDocument(
                            documentId,
                            undefined,
                            doc.mime,
                            setLocalProgress,
                          );
                      } catch (error) {
                        setError((error as Error).message);
                      }
                    }}
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
                src={
                  cloudMode
                    ? preview
                      ? `${preview}#page=${pageNumber}`
                      : undefined
                    : `/api/documents/${documentId}/file#page=${pageNumber}`
                }
              />
            ) : doc.mime.startsWith("image/") ? (
              <img
                className="file-preview"
                alt="Gespeichertes Originalangebot"
                src={
                  cloudMode
                    ? preview || undefined
                    : `/api/documents/${documentId}/file`
                }
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
                    {selectedQuote &&
                    selectedQuote.split("\n").includes(line) ? (
                      <mark>{line}</mark>
                    ) : (
                      line
                    )}
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
            {cloudMode
              ? "Texterkennung läuft auf deinem Gerät. Originale und erkannter Text werden für eure gemeinsame Planung privat gespeichert. Keine Übertragung an kostenpflichtige KI-Dienste."
              : "Das Original bleibt für beide Konten verfügbar. Keine Dokumentinhalte werden an OpenAI oder andere Auswertungsdienste übertragen."}{" "}
            Texterkennung kann Zeichen und Tabellen falsch lesen; Fundstellen
            bitte prüfen.
          </small>
        </section>
        <form
          inert={busy || undefined}
          aria-busy={busy}
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
              submitted.current = true;
              if (documentId) clearOfferDrafts(userId, documentId);
              forgetOfferDraft(draftKey);
              onSaved();
            } catch (error) {
              setError((error as Error).message);
              if (
                error instanceof ApiError &&
                error.status === 409 &&
                draft.id
              ) {
                try {
                  const state = await getState();
                  const fresh = state.offers.find(
                    (value) => value.id === draft.id,
                  );
                  if (fresh) setRemoteOffer(fresh);
                  else
                    setError(
                      "Dieses Angebot wurde inzwischen entfernt. Dein Entwurf ist weiterhin in diesem Tab vorhanden.",
                    );
                } catch {
                  /* The original error and tab draft remain available. */
                }
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="pane-title">
            <Check size={18} />
            <strong>Die wichtigsten Angaben</strong>
          </div>
          <label>
            Anbieter
            <input
              disabled={busy}
              aria-label="Anbieter"
              required
              maxLength={200}
              value={draft.name || ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Name aus dem Original"
            />
            {source("name")}
          </label>
          <div className="form-grid">
            {input("price", "Gesamtpreis", "number")}
            <label>
              Währung
              <select
                value={draft.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {["Nicht angegeben", "EUR", "USD", "GBP"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              {source("currency")}
            </label>
          </div>
          <div className="form-grid">
            {input("team", "Team")}
            {input("hours", "Begleitung / Aufnahmezeit")}
          </div>
          {draft.pricingNotes && (
            <div className="review-price-notes">
              <strong>Preiseinheit & Kalkulationshinweise</strong>
              <p>{draft.pricingNotes}</p>
              {source("pricingNotes")}
            </div>
          )}
          {area("photos", "Fotografie: Leistungsumfang")}
          {area("video", "Videografie: Leistungsumfang")}
          {area("delivery", "Bearbeitungs- und Lieferzeiten")}
          {area("extras", "Fahrt, Übernachtung & Nebenkosten")}
          <div className="form-grid">
            {input("eventDate", "Termin laut Angebot")}
            {input("venue", "Veranstaltungsort laut Angebot")}
          </div>
          {input("guestCount", "Gäste laut Angebot")}
          <details className="further-offer-fields">
            <summary>Weitere Angebotsdetails und offene Punkte</summary>
            <div className="form-stack">
              {area("pricingNotes", "Preiseinheit & Kalkulationshinweise")}
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
                  Mehrere Fassungen desselben Dienstleisters bleiben zusammen.
                </small>
              </label>
              <div className="form-grid">
                <label>
                  Kategorie
                  <select
                    value={draft.category}
                    onChange={(e) => set("category", e.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
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
                            : (draft.events || []).filter(
                                (name) => name !== event.name,
                              ),
                        )
                      }
                    />
                    {event.name}
                  </label>
                ))}
                {source("events")}
              </fieldset>
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
                {input("photoPrice", "Fotografie-Teilpreis", "number")}
                {input("videoPrice", "Videografie-Teilpreis", "number")}
              </div>
              <div className="form-grid">
                {input("deposit", "Anzahlung", "number")}
                {input("balance", "Restbetrag", "number")}
              </div>
              {input("offerDate", "Angebotsdatum")}
              {input("validity", "Gültigkeit")}
              {area("included", "Weitere enthaltene Leistungen")}
              {area("excluded", "Ausdrücklich nicht enthalten")}
              {area("optional", "Optionale Zusatzleistungen & Preise")}
              {area("paymentTerms", "Zahlungsbedingungen")}
              {input("extraHours", "Zusätzliche Stunden")}
              {area("contact", "Kontaktangaben")}
              {area("questions", "Offene Fragen")}
              {input("source", "Weitere Quellenangabe")}
              {area("decision", "Eure Einschätzung & Entscheidung")}
            </div>
          </details>
          <label className="confirmation">
            <input ref={confirmationRef} type="checkbox" required />
            <span>
              Ich habe Original und Angaben geprüft. Fehlendes bleibt offen.
              Optionale Extras wurden nicht zum Paketpreis addiert.
            </span>
          </label>
          <Button
            type="submit"
            disabled={
              busy ||
              stale ||
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
