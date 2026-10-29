import { useState } from "react";
import {
  ArrowUpRight,
  BookmarkSimple,
  Check,
  Copy,
  MapPin,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react";
import type { Provider, WeddingEvent } from "../data";
import { dateText } from "../data";
import { saveRecord } from "../api";
import { discoveries, researchDate } from "../discoveries";
import type { Discovery } from "../discoveries";
import { Badge, Button, Dialog, ErrorMessage } from "./ui";

const filters = [
  "Alle",
  "Location",
  "Foto & Video",
  "Catering",
  "Dekoration",
  "Outfits & Styling",
];
function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
function matches(candidate: Discovery, provider: Provider) {
  return (
    candidate.name.toLocaleLowerCase("de") ===
      provider.name.toLocaleLowerCase("de") ||
    (!!host(provider.website) &&
      candidate.sources.some(
        (source) => host(source.url) === host(provider.website),
      ))
  );
}
export default function Discover({
  providers,
  events,
  onSaved,
}: {
  providers: Provider[];
  events: WeddingEvent[];
  onSaved: () => Promise<void>;
}) {
  const [filter, setFilter] = useState("Alle"),
    [search, setSearch] = useState("");
  const [local, setLocal] = useState(false),
    [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Discovery | null>(null);
  const [externalCatering, setExternalCatering] = useState(false);
  const [minimumSeats, setMinimumSeats] = useState(0);
  const [saving, setSaving] = useState(""),
    [savedHere, setSavedHere] = useState<string[]>([]);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const saved = (item: Discovery) =>
    savedHere.includes(item.id) ||
    providers.some((provider) => matches(item, provider));
  const visible = discoveries.filter(
    (item) =>
      (filter === "Alle" || item.category === filter) &&
      (!local || item.local) &&
      (!savedOnly || saved(item)) &&
      (filter !== "Location" ||
        ((!externalCatering || item.catering === "frei") &&
          (!minimumSeats || (item.dinnerSeats ?? 0) >= minimumSeats))) &&
      `${item.name} ${item.region} ${item.category} ${item.headline} ${item.summary}`
        .toLocaleLowerCase("de")
        .includes(search.toLocaleLowerCase("de")),
  );
  async function remember(item: Discovery) {
    if (saved(item) || saving) return;
    setSaving(item.id);
    setError("");
    const data: Partial<Provider> = {
      name: item.name,
      category: item.category,
      website: item.sources[0].url,
      region: item.region,
      status: "Gefunden",
      event: "",
      nextAction: item.questions[0],
      notes: `Recherchierter Vorschlag vom ${researchDate}.\n${item.summary}\n${item.facts.map(([key, value]) => `${key}: ${value}`).join("\n")}\n${item.attention || ""}\nOffene Fragen:\n${item.questions.join("\n")}\nQuellen:\n${item.sources.map((source) => source.url).join("\n")}`,
    };
    try {
      await saveRecord("providers", data);
      setSavedHere((previous) => [...previous, item.id]);
      setNotice(
        `${item.name} ist jetzt unter „Eure Kontakte“ für euch beide gemerkt.`,
      );
      await onSaved();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving("");
    }
  }
  const rememberButton = (item: Discovery) => (
    <Button
      secondary
      onClick={() => void remember(item)}
      disabled={saved(item) || !!saving}
    >
      {saved(item) ? <Check size={17} /> : <BookmarkSimple size={17} />}
      {saved(item)
        ? "Gemerkt"
        : saving === item.id
          ? "Wird gemerkt …"
          : "Gemeinsam merken"}
    </Button>
  );
  return (
    <div className="discover-page">
      <header className="discover-hero">
        <div>
          <p className="atelier-kicker">
            <Sparkle size={17} /> IDEEN, DIE ZU EUCH PASSEN
          </p>
          <h1>
            Hier könnte eure
            <br />
            <em>Geschichte weitergehen.</em>
          </h1>
          <p>
            Tamilische Dienstleister und Orte in Berlin & Brandenburg. Mit
            nachvollziehbaren Quellen und den Fragen, die vor einer Entscheidung
            zählen.
          </p>
        </div>
        <div className="discover-research-note">
          <strong>{discoveries.length}</strong>
          <span>recherchierte Vorschläge</span>
          <small>
            Quellen gesichtet am {researchDate}
            <br />
            Preise und Termine individuell bestätigen.
          </small>
        </div>
      </header>
      <div className="discover-guidance">
        <span>
          <BookmarkSimple size={20} />
        </span>
        <p>
          <strong>Erst entdecken. Dann gemeinsam entscheiden.</strong> Gemerkte
          Vorschläge landen als Kontakt in eurer Planung. Ein persönliches
          Angebot oder eine Buchung entsteht daraus erst durch eure weiteren
          Schritte.
        </p>
      </div>
      <section className="discover-controls" aria-label="Vorschläge filtern">
        <div className="discover-categories" aria-label="Kategorien">
          {filters.map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}
              {value !== "Alle" && (
                <span>
                  {discoveries.filter((item) => item.category === value).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="discover-search-row">
          <label className="discover-search">
            <MagnifyingGlass size={19} />
            <span className="sr-only">Vorschläge durchsuchen</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, Region oder Leistung …"
            />
          </label>
          <label className="discover-check">
            <input
              type="checkbox"
              checked={local}
              onChange={(event) => setLocal(event.target.checked)}
            />
            Berlin & Brandenburg
          </label>
          <label className="discover-check">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(event) => setSavedOnly(event.target.checked)}
            />
            Nur gemerkte
          </label>
        </div>
        {filter === "Location" && (
          <div className="discover-venue-filters">
            <label className="discover-check">
              <input
                type="checkbox"
                checked={externalCatering}
                onChange={(event) => setExternalCatering(event.target.checked)}
              />
              Eigener Caterer laut Quelle möglich
            </label>
            <label>
              Sitzplätze laut Quelle
              <select
                value={minimumSeats}
                onChange={(event) =>
                  setMinimumSeats(Number(event.target.value))
                }
              >
                <option value={0}>Keine Mindestzahl</option>
                {[180, 200, 220, 250].map((count) => (
                  <option value={count} key={count}>
                    Mindestens {count}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Maximale Bestuhlung laut Website. Der Platzbedarf für Tanzfläche,
              Buffet und eure Ausstattung muss separat bestätigt werden.
            </p>
          </div>
        )}
      </section>
      <ErrorMessage message={error} />
      {notice && (
        <p className="discover-notice" role="status">
          <Check size={18} />
          {notice}
        </p>
      )}
      <p className="discover-result-count" role="status">
        {visible.length} {visible.length === 1 ? "Vorschlag" : "Vorschläge"}
        {local && " in Berlin & Brandenburg"}
      </p>
      <div className="discover-grid">
        {visible.map((item) => (
          <article
            className="discover-card"
            key={item.id}
            aria-label={item.name}
          >
            <div className="discover-card-top">
              <Badge>{item.category}</Badge>
              <small>
                <MapPin size={14} />
                {item.region}
              </small>
            </div>
            <h2>{item.name}</h2>
            <p className="discover-headline">{item.headline}</p>
            <p className="discover-summary">{item.summary}</p>
            <dl>
              {item.facts.slice(0, 3).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {item.attention && (
              <p className="discover-attention">{item.attention}</p>
            )}
            <div className="discover-card-bottom">
              <button
                className="atelier-inline-link"
                onClick={() => {
                  setError("");
                  setSelected(item);
                }}
              >
                Details & Fragen <ArrowUpRight size={16} />
              </button>
              {rememberButton(item)}
            </div>
            <a
              className="discover-source"
              href={item.sources[0].url}
              target="_blank"
              rel="noreferrer"
            >
              Quelle: {host(item.sources[0].url)} <ArrowUpRight size={13} />
              <span className="sr-only"> (öffnet neuen Tab)</span>
            </a>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="discover-empty">
          <MagnifyingGlass size={30} />
          <h2>Noch kein Treffer.</h2>
          <p>Probiert eine andere Kategorie oder hebt einen Filter auf.</p>
          <Button
            secondary
            onClick={() => {
              setSearch("");
              setFilter("Alle");
              setLocal(false);
              setSavedOnly(false);
              setExternalCatering(false);
              setMinimumSeats(0);
            }}
          >
            Alle Vorschläge zeigen
          </Button>
        </div>
      )}
      <section className="discover-method">
        <h2>Wie diese Auswahl entstanden ist.</h2>
        <p>
          Die tamilische Ausrichtung wird durch eigene Anbieterangaben oder
          eigene Arbeitsproben belegt. Bei Catering ist die ausgewiesene
          tamilische Küche entscheidend. Locations sind kulturell unabhängig. Es
          gibt keine erfundenen Bewertungen, Preisnoten oder bestätigten
          Verfügbarkeiten.
        </p>
        <p>
          Für die größte Feier dienten 180–220 Personen als Suchrahmen. Eure
          tatsächliche Personenzahl und ein Bestuhlungsplan mit Tanzfläche und
          Buffet entscheiden über die Eignung. Die Vorschläge ändern eure
          Veranstaltungs- und Budgetzahlen nicht.
        </p>
      </section>
      {selected && (
        <Dialog title={selected.name} wide onClose={() => setSelected(null)}>
          <div className="discovery-detail">
            <Badge>
              {selected.category} · {selected.region}
            </Badge>
            <h3>{selected.headline}</h3>
            <p>{selected.summary}</p>
            <dl>
              {selected.facts.map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {selected.attention && (
              <p className="discover-attention">{selected.attention}</p>
            )}
            <h3>Diese Fragen bringen euch weiter.</h3>
            <ul>
              {selected.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
            <div className="discovery-sources">
              <h3>Quellen & Einordnung</h3>
              <p>{selected.proof}</p>
              {selected.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title} <ArrowUpRight size={15} />
                  <span className="sr-only"> (öffnet neuen Tab)</span>
                </a>
              ))}
              <small>
                Gesichtet am {researchDate}. Öffentliche Angaben sind noch kein
                persönliches Angebot.
              </small>
            </div>
            <InquiryDraft key={selected.id} item={selected} events={events} />
            <ErrorMessage message={error} />
            {rememberButton(selected)}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function inquiryText(item: Discovery, event?: WeddingEvent) {
  return `Hallo ${item.name},\n\nwir planen unsere Hochzeit${event ? ` (${event.name})` : ""}${event?.date ? ` am ${dateText(event.date)}` : " – der genaue Termin ist noch abzustimmen"}${event?.guests ? ` mit voraussichtlich ${event.guests} Gästen` : ""}.\n\n${item.category === "Location" ? "Wir interessieren uns für eure Location und möchten mit einem tamilischen Caterer feiern." : "Wir interessieren uns für eure Leistungen für unsere Feier in Berlin/Brandenburg."}\n\nKönnt ihr uns bitte Verfügbarkeit, vollständigen Leistungsumfang, Bruttopreis und Zahlungsbedingungen nennen? Besonders interessieren uns:\n${item.questions.map((question) => `• ${question}`).join("\n")}\n\nVielen Dank!`;
}
function InquiryDraft({
  item,
  events,
}: {
  item: Discovery;
  events: WeddingEvent[];
}) {
  const [eventId, setEventId] = useState("");
  const [text, setText] = useState(() => inquiryText(item));
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState("");
  return (
    <details className="inquiry-draft">
      <summary>Anfragetext vorbereiten</summary>
      <p>
        Passt den Text an und kopiert ihn bei Bedarf. Hier wird keine Nachricht
        verschickt.
      </p>
      <label>
        Veranstaltung für den Entwurf
        <select
          value={eventId}
          onChange={(change) => {
            const id = change.target.value;
            if (
              text !==
                inquiryText(
                  item,
                  events.find((value) => value.id === eventId),
                ) &&
              !window.confirm(
                "Den bearbeiteten Anfragetext mit der gewählten Veranstaltung neu erstellen?",
              )
            )
              return;
            setEventId(id);
            setText(
              inquiryText(
                item,
                events.find((value) => value.id === id),
              ),
            );
            setCopied(false);
            setCopyError("");
          }}
        >
          <option value="">Noch nicht zuordnen</option>
          {events.map((value) => (
            <option key={value.id} value={value.id}>
              {value.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Anfragetext
        <textarea
          rows={11}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setCopied(false);
          }}
        />
      </label>
      <Button
        secondary
        onClick={async () => {
          setCopyError("");
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setCopyError("Bitte den Text markieren und manuell kopieren.");
          }
        }}
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
        {copied ? "Text kopiert" : "Text kopieren"}
      </Button>
      <ErrorMessage message={copyError} />
    </details>
  );
}
