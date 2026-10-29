import { useCallback, useEffect, useState } from "react";
import { cloudMode } from "./documents";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Buildings,
  CalendarBlank,
  Camera,
  Check,
  CheckCircle,
  Circle,
  Coins,
  Compass,
  DownloadSimple,
  FileText,
  Flower,
  Heart,
  House,
  Info,
  ListChecks,
  LockKey,
  MapPin,
  PencilSimple,
  Plus,
  Scales,
  SignOut,
  Trash,
  UploadSimple,
  Users,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import {
  api,
  ApiError,
  deleteRecord,
  getState,
  json,
  saveRecord,
  setCsrf,
} from "./api";
import type { Auth } from "./api";
import { dateText, money, price } from "./data";
import type {
  AppState,
  Cost,
  Kind,
  Offer,
  Section,
  Stored,
  User,
} from "./data";
import AccountGate from "./components/AccountGate";
import OfferReview from "./components/OfferReview";
import RecordEditor from "./components/RecordEditor";
import Team from "./components/Team";
import GuestImport from "./components/GuestImport";
import Dashboard from "./components/Dashboard";
import Discover from "./components/Discover";
import OfferCards from "./components/OfferCards";
import EventIdeas from "./components/EventIdeas";
import { currentSection, sectionHref } from "./navigation";
import { clearOfferDrafts } from "./offer-drafts";
import { attendanceValues, peopleCount } from "../shared/guests.mjs";
import {
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  Heading,
  Title,
} from "./components/ui";

const navigation: { label: Section; icon: Icon }[] = [
  { label: "Übersicht", icon: House },
  { label: "Dienstleister", icon: Scales },
  { label: "Entdecken", icon: Compass },
  { label: "Gäste", icon: Users },
  { label: "Budget", icon: Wallet },
  { label: "Aufgaben", icon: ListChecks },
  { label: "Veranstaltungen", icon: CalendarBlank },
  { label: "Dokumente", icon: FileText },
  { label: "Gemeinsam", icon: Heart },
];
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Auth>("/auth/me")
      .then((data) => {
        setCsrf(data.csrf);
        setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    const expired = () => {
      setUser(null);
      setCsrf("");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  if (loading)
    return (
      <div className="account-page">
        <Flower size={40} />
        <p>Eure Planung wird geöffnet …</p>
      </div>
    );
  if (!user) return <AccountGate onLogin={setUser} />;
  return (
    <PlanningApp
      user={user}
      logout={async () => {
        try {
          await api("/auth/logout", { method: "POST" });
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) throw error;
        }
        clearOfferDrafts(user.id);
        setCsrf("");
        setUser(null);
      }}
    />
  );
}
function Stat({
  icon: IconComponent,
  label,
  value,
  detail,
}: {
  icon: Icon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        <IconComponent size={18} />
        <span>{label}</span>
      </div>
      <strong className={value === "Noch offen" ? "open-value" : ""}>
        {value}
      </strong>
      <p>{detail}</p>
    </div>
  );
}
function PlanningApp({
  user,
  logout,
}: {
  user: User;
  logout: () => Promise<void>;
}) {
  const [state, setState] = useState<AppState | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [section, setSection] = useState<Section>(currentSection);
  const [notice, setNoticeState] = useState<{
    text: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const notify = useCallback(
    (text: string, tone: "success" | "error" | "info" = "success") =>
      setNoticeState(text ? { text, tone } : null),
    [],
  );
  const [editor, setEditor] = useState<{
    kind: Exclude<Kind, "offers">;
    record?: Record<string, unknown> & Partial<Stored>;
  } | null>(null);
  const [editorActivity, setEditorActivity] = useState({
    dirty: false,
    saving: false,
  });
  const [review, setReview] = useState<{
    offer?: Offer;
    documentId?: string;
  } | null>(null);
  const [reviewUnsaved, setReviewUnsaved] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  useEffect(() => {
    if (!reviewSaving) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [reviewSaving]);
  const [booking, setBooking] = useState<Offer | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("Alle Kategorien");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [guestEvent, setGuestEvent] = useState("");
  const [guestResponse, setGuestResponse] = useState("Alle Rückmeldungen");
  const [scenarioGuests, setScenarioGuests] = useState(200);
  const [moreOfferDetails, setMoreOfferDetails] = useState(false);
  const [offerLayout, setOfferLayout] = useState<"cards" | "table" | null>(
    null,
  );
  const [smallScreen, setSmallScreen] = useState(
    () => matchMedia("(max-width: 700px)").matches,
  );
  const currentOfferLayout = offerLayout || (smallScreen ? "cards" : "table");
  const [guestImport, setGuestImport] = useState(false);
  useEffect(() => {
    const query = matchMedia("(max-width: 700px)");
    const update = () => setSmallScreen(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const update = () => {
      setSection(currentSection());
      setSearch("");
    };
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const data = await getState();
      setState(data);
      setConnectionError("");
    } catch (error) {
      setConnectionError((error as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(
      () => {
        if (!document.hidden) void refresh();
      },
      cloudMode ? 15000 : 5000,
    );
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice || notice.tone === "error") return;
    const timer = setTimeout(() => notify(""), 7000);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  const go = (value: Section) => {
    if (value !== currentSection())
      history.pushState({}, "", sectionHref(value));
    setSection(value);
    setSearch("");
    window.scrollTo({ top: 0 });
  };
  const edit = (kind: Exclude<Kind, "offers">, record?: object) => {
    setEditorActivity({ dirty: false, saving: false });
    setEditor({
      kind,
      record: record as (Record<string, unknown> & Partial<Stored>) | undefined,
    });
  };
  const saved = async () => {
    setEditor(null);
    setReview(null);
    notify("Dauerhaft gespeichert. Für euch beide verfügbar.");
    await refresh();
  };
  const signOut = async () => {
    try {
      await logout();
    } catch {
      notify(
        "Abmelden konnte nicht bestätigt werden. Bitte Verbindung prüfen und erneut versuchen.",
        "error",
      );
    }
  };
  const remove = async (kind: Kind, record: Stored) => {
    if (!window.confirm("Diesen Eintrag dauerhaft löschen?")) return;
    try {
      await deleteRecord(kind, record);
      notify("Eintrag gelöscht.");
    } catch (error) {
      notify((error as Error).message, "error");
    }
    await refresh();
  };
  const mutate = async (
    kind: Kind,
    data: Partial<Stored> & Record<string, unknown>,
  ) => {
    try {
      await saveRecord(kind, data);
      notify("Änderung gespeichert.");
    } catch (error) {
      notify((error as Error).message, "error");
    }
    await refresh();
  };
  if (!state)
    return (
      <div className="account-page">
        <Flower size={40} />
        <p>Gespeicherte Planung wird geladen …</p>
        <ErrorMessage message={connectionError} />
        <Button onClick={() => void refresh()}>Erneut versuchen</Button>
      </div>
    );
  const budget = state.settings.find((s) => s.id === "budget")!;
  const committedCosts = state.costs.filter((c) => c.stage === "Beauftragt");
  const committed = committedCosts.reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const paid = committedCosts.reduce((sum, c) => sum + (c.paid ?? 0), 0);
  const knownOpen = committedCosts.reduce(
    (sum, cost) =>
      cost.amount !== null && cost.paid !== null
        ? sum + cost.amount - cost.paid
        : sum,
    0,
  );
  const unknownBalances = committedCosts.filter(
    (cost) => cost.amount === null || cost.paid === null,
  ).length;
  const unknownCommitted = committedCosts.filter(
    (c) => c.amount === null,
  ).length;
  const hall = state.costs.find(
    (c) =>
      c.event === (state.events[0]?.name || "Standesamt") &&
      c.category === "Location" &&
      c.stage === "Beauftragt",
  );
  const activeTasks = [...state.tasks].sort(
    (a, b) => Number(a.done) - Number(b.done),
  );
  const drafts = state.documents.filter(
    (d) => !state.offers.some((o) => o.documentId === d.id),
  );
  const paymentCard = (
    <div className="payment-card panel">
      <div className="card-top">
        <div className="icon-box">
          <Buildings size={22} />
        </div>
        <Badge tone={hall ? "success" : ""}>
          {hall ? "Gebucht" : "Noch offen"}
        </Badge>
      </div>
      <h3>{hall?.label || "Saal fürs Standesamt"}</h3>
      <p>Die bekannte Saalzahlung, getrennt von eurem Gesamtbudget.</p>
      <div className="payment-number">
        {hall ? price(hall.amount) : "Nicht erfasst"}
        <span>vereinbarter Gesamtpreis</span>
      </div>
      {hall && (
        <>
          <progress
            className="actual-payment-progress"
            value={hall.paid ?? 0}
            max={hall.amount || 1}
            aria-label="Anteil der geleisteten Saalzahlung"
          />
          <div className="payment-split">
            <span>
              {hall.paid === null
                ? "Zahlungsstand unbekannt"
                : money(hall.paid) + " gezahlt"}
            </span>
            <span>
              {hall.amount === null || hall.paid === null
                ? "Restbetrag offen"
                : money(hall.amount - hall.paid) + " offen"}
            </span>
          </div>
          <div className="payment-foot">
            <CalendarBlank size={16} />
            <span>
              {hall.due
                ? "Fällig am " + dateText(hall.due)
                : "Zahlungsfrist noch offen"}
            </span>
            <button
              className="icon-button"
              aria-label="Saalkosten bearbeiten"
              onClick={() => edit("costs", hall)}
            >
              <PencilSimple size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
  const taskList = (compact = false) => (
    <div className="task-list">
      {(compact ? activeTasks.slice(0, 3) : activeTasks).map((task) => (
        <div key={task.id} className={`task ${task.done ? "done" : ""}`}>
          <button
            className="task-check"
            aria-label={`${task.title}: ${task.done ? "wieder öffnen" : "als erledigt markieren"}`}
            aria-pressed={task.done}
            onClick={() => void mutate("tasks", { ...task, done: !task.done })}
          >
            {task.done ? (
              <CheckCircle size={23} weight="fill" />
            ) : (
              <Circle size={23} />
            )}
          </button>
          <div>
            <strong>{task.title}</strong>
            <p>{task.detail}</p>
            <span className="task-meta">
              {state.members.find((m) => m.id === task.owner)?.name ||
                "Verantwortung offen"}{" "}
              · {task.due ? dateText(task.due) : "Termin offen"}
              {task.event && " · " + task.event}
            </span>
          </div>
          <Badge tone={task.priority === "Hoch" && !task.done ? "warm" : ""}>
            {task.done ? "Erledigt" : task.priority}
          </Badge>
          <button
            className="icon-button"
            aria-label={`${task.title} bearbeiten`}
            onClick={() => edit("tasks", task)}
          >
            <PencilSimple size={17} />
          </button>
          {!compact && (
            <button
              className="icon-button"
              aria-label={`${task.title} löschen`}
              onClick={() => void remove("tasks", task)}
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      ))}
      {!state.tasks.length && (
        <p className="empty-copy">
          Noch keine Aufgaben. Legt euren nächsten Schritt an.
        </p>
      )}
    </div>
  );
  const overview = (
    <Dashboard
      state={state}
      user={user}
      go={go}
      onUpload={() => setReview({})}
      onImport={() => {
        go("Gäste");
        setGuestImport(true);
      }}
      tasks={taskList(true)}
    />
  );
  const filteredOffers = state.offers.filter(
    (offer) =>
      (filter === "Alle Kategorien" || offer.category === filter) &&
      (!search || offer.name.toLowerCase().includes(search.toLowerCase())),
  );
  const compared =
    selected !== null
      ? filteredOffers
          .filter((offer) => selected.includes(offer.id))
          .slice(0, 4)
      : filteredOffers.slice(-3);
  const offerRows: [string, keyof Offer][] = [
    ["Gesamtpreis", "price"],
    ...(compared.some((offer) => !!offer.pricingNotes)
      ? ([["Preiseinheit & Kalkulationshinweise", "pricingNotes"]] as [
          string,
          keyof Offer,
        ][])
      : []),
    ["Fotografie", "photos"],
    ["Videografie", "video"],
    ["Team", "team"],
    ["Begleitung / Aufnahmezeit", "hours"],
    ["Lieferzeiten", "delivery"],
    ["Fahrt & Übernachtung", "extras"],
    ...(moreOfferDetails
      ? ([
          ["Termin laut Angebot", "eventDate"],
          ["Ort laut Angebot", "venue"],
          ["Gäste laut Angebot", "guestCount"],
          ["Fotografie-Teilpreis", "photoPrice"],
          ["Videografie-Teilpreis", "videoPrice"],
          ["Preisbasis", "basis"],
          ["Veranstaltungen", "events"],
          ["Paket / Fassung", "packageName"],
          ["Weitere enthaltene Leistungen", "included"],
          ["Ausdrücklich nicht enthalten", "excluded"],
          ["Optionale Leistungen", "optional"],
          ["Anzahlung", "deposit"],
          ["Restbetrag", "balance"],
          ["Zahlungsbedingungen", "paymentTerms"],
          ["Zusätzliche Stunden", "extraHours"],
          ["Gültigkeit", "validity"],
          ["Offene Fragen", "questions"],
          ["Eure Entscheidung", "decision"],
        ] as [string, keyof Offer][])
      : []),
  ];
  const offerActions = (offer: Offer) => (
    <div className="offer-actions">
      <Button secondary onClick={() => setReview({ offer })}>
        Original & Angaben
      </Button>
      {!state.costs.some((cost) => cost.offerId === offer.id) && (
        <button
          className="text-button"
          onClick={() => {
            setBooking(offer);
            setBookingError("");
          }}
        >
          Buchung bestätigen <Check size={15} />
        </button>
      )}
      {offer.status !== "Gebucht" && (
        <button
          className="text-button"
          onClick={() =>
            void mutate("offers", {
              ...offer,
              status: offer.status === "Favorit" ? "Geprüft" : "Favorit",
            })
          }
        >
          {offer.status === "Favorit"
            ? "Favorit aufheben"
            : "Als Favorit markieren"}
        </button>
      )}
      <button
        className="text-button delete-link"
        onClick={() => void remove("offers", offer)}
      >
        Angebot löschen
      </button>
    </div>
  );
  const comparison = (
    <>
      <Title
        title="Eure Dienstleister."
        description="Leistungen verstehen. Fragen klären. Mit gutem Gefühl entscheiden."
        action={
          <Button onClick={() => setReview({})}>
            <Plus size={17} /> Angebot hinzufügen
          </Button>
        }
      />
      <section
        className={`panel comparison-panel ${currentOfferLayout === "cards" ? "cards-layout" : ""}`}
      >
        <Heading
          title="Angebote im Vergleich"
          subtitle="Nur von euch geprüfte Angaben. Unterschiedlicher Umfang bleibt sichtbar."
          action={
            <Button secondary onClick={() => edit("providers")}>
              <Plus size={16} /> Dienstleister
            </Button>
          }
        />
        <div className="table-toolbar">
          <label>
            Kategorie
            <select
              aria-label="Kategorie filtern"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setSelected(null);
              }}
            >
              <option>Alle Kategorien</option>
              {[...new Set(state.offers.map((o) => o.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Anbieter suchen
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name …"
            />
          </label>
        </div>
        {state.offers.length > 0 && (
          <div className="offer-view-switch" aria-label="Angebotsansicht">
            <span>So behaltet ihr den Überblick</span>
            <div>
              <button
                aria-pressed={currentOfferLayout === "cards"}
                onClick={() => setOfferLayout("cards")}
              >
                Kartenübersicht
              </button>
              <button
                aria-pressed={currentOfferLayout === "table"}
                onClick={() => setOfferLayout("table")}
              >
                Nebeneinander
              </button>
            </div>
          </div>
        )}
        {filteredOffers.length > 0 && currentOfferLayout === "table" && (
          <div
            className="offer-selection"
            aria-label="Angebote für Vergleich auswählen"
          >
            {filteredOffers.map((offer) => (
              <label key={offer.id}>
                <input
                  type="checkbox"
                  checked={compared.some((c) => c.id === offer.id)}
                  onChange={(e) => {
                    const ids = compared.map((c) => c.id);
                    if (e.target.checked && ids.length >= 4) {
                      notify(
                        "Bitte höchstens vier Angebote gleichzeitig auswählen.",
                        "info",
                      );
                      return;
                    }
                    setSelected(
                      e.target.checked
                        ? [...ids, offer.id]
                        : ids.filter((id) => id !== offer.id),
                    );
                  }}
                />
                <span>
                  {offer.name} · {offer.packageName || offer.category}
                </span>
              </label>
            ))}
          </div>
        )}
        {currentOfferLayout === "cards" && filteredOffers.length > 0 ? (
          <OfferCards offers={filteredOffers} actions={offerActions} />
        ) : compared.length ? (
          <div className="table-scroll">
            <table className="live-comparison">
              <caption className="sr-only">
                Vergleich eurer bestätigten Angebote
              </caption>
              <thead>
                <tr>
                  <th>Das ist euch wichtig</th>
                  {compared.map((offer) => (
                    <th key={offer.id}>
                      <span className="provider-avatar">
                        <Camera />
                      </span>
                      <strong>{offer.name}</strong>
                      <span className="table-sub">
                        {state.providers.find((p) => p.id === offer.providerId)
                          ?.name || "Nicht zugeordnet"}{" "}
                        · Fassung{" "}
                        {state.offers
                          .filter(
                            (o) =>
                              (o.providerId &&
                                o.providerId === offer.providerId) ||
                              (!o.providerId && o.name === offer.name),
                          )
                          .findIndex((o) => o.id === offer.id) + 1}
                      </span>
                      <Badge tone={offer.status === "Gebucht" ? "success" : ""}>
                        {offer.status}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerRows.map(([label, key]) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    {compared.map((offer) => (
                      <td
                        key={offer.id}
                        className={key === "price" ? "price-cell" : ""}
                      >
                        {[
                          "price",
                          "photoPrice",
                          "videoPrice",
                          "deposit",
                          "balance",
                        ].includes(key)
                          ? price(
                              (offer[key] ?? null) as number | null,
                              offer.currency,
                            )
                          : key === "events"
                            ? offer.events.join(" + ") || "Nicht angegeben"
                            : String(offer[key] || "Nicht angegeben")}
                        {key === "price" && (
                          <span className="table-sub">
                            {offer.basis === "Nicht angegeben"
                              ? "Netto/Brutto offen"
                              : offer.basis}
                          </span>
                        )}
                        {offer.evidence[key]?.length ? (
                          <span className="table-sub">
                            Quelle: S.{" "}
                            {offer.evidence[key]
                              .map((e) => e.page)
                              .filter((v, i, list) => list.indexOf(v) === i)
                              .join(", ")}
                          </span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Prüfen & entscheiden</th>
                  {compared.map((offer) => (
                    <td key={offer.id}>{offerActions(offer)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Scales size={50} weight="thin" />
            <h2>
              {filteredOffers.length > 0
                ? "Wählt eure Angebote für den Vergleich."
                : search || filter !== "Alle Kategorien"
                  ? "Keine passenden Angebote."
                  : "Eure Angebote kommen hier zusammen."}
            </h2>
            <p>
              {filteredOffers.length > 0
                ? "Oben bis zu vier Angebote auswählen oder zur Kartenübersicht wechseln."
                : "PDF, Screenshot oder Text hinzufügen. Die App liest den Inhalt lokal, zeigt Fundstellen und übernimmt erst eure bestätigten Angaben."}
            </p>
            {!filteredOffers.length && (
              <Button secondary onClick={() => setReview({})}>
                Erstes Angebot hinzufügen <ArrowRight size={17} />
              </Button>
            )}
          </div>
        )}
        {compared.length > 0 && currentOfferLayout === "table" && (
          <button
            className="text-button compare-details-toggle"
            aria-expanded={moreOfferDetails}
            onClick={() => setMoreOfferDetails(!moreOfferDetails)}
          >
            {moreOfferDetails
              ? "Zusätzliche Details ausblenden"
              : "Weitere Angebotsdetails anzeigen"}{" "}
            <ArrowRight size={15} />
          </button>
        )}
        <div className="comparison-foot">
          <WarningCircle size={18} />
          <p>
            Fehlende Angaben bleiben unbekannt. Ein Paketpreis kann
            unvollständig sein. Angebote werden erst nach ausdrücklicher
            Buchungsbestätigung als beauftragte Kosten erfasst.
          </p>
        </div>
      </section>
      <section className="panel provider-list">
        <Heading
          title="Eure Kontakte"
          subtitle="Dienstleister, offene Gespräche und nächste Schritte."
          action={
            <Button secondary onClick={() => edit("providers")}>
              <Plus size={16} /> Dienstleister anlegen
            </Button>
          }
        />
        {state.providers.length ? (
          state.providers.map((provider) => (
            <div className="contact-row" key={provider.id}>
              <div className="icon-box">
                <Buildings size={20} />
              </div>
              <div>
                <strong>{provider.name}</strong>
                <p>
                  {provider.category} ·{" "}
                  {provider.event || "Veranstaltung offen"} · {provider.status}
                </p>
                {provider.website && (
                  <a href={provider.website} target="_blank" rel="noreferrer">
                    Website öffnen <ArrowUpRight size={13} />
                  </a>
                )}
                <p>{provider.notes}</p>
                {provider.nextAction && (
                  <p>Nächste Aktion: {provider.nextAction}</p>
                )}
              </div>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`${provider.name} bearbeiten`}
                  onClick={() => edit("providers", provider)}
                >
                  <PencilSimple />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${provider.name} löschen`}
                  onClick={() => void remove("providers", provider)}
                >
                  <Trash />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-copy">
            Noch keine Namen oder Kontakte erfasst. Eure Foto- und
            Videogespräche laufen bereits.
          </p>
        )}
      </section>
    </>
  );
  const guests = state.guests.filter(
    (g) =>
      (!search ||
        `${g.name} ${g.household}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!guestEvent ||
        guestResponse === "Alle Rückmeldungen" ||
        (g.attendance[guestEvent] || "Nicht angegeben") === guestResponse),
  );
  const guestsView = (
    <>
      <Title
        title="Eure Lieblingsmenschen."
        description="Personen und Haushalte zusammenhalten. Für jede Feier separat einladen und Rückmeldungen erfassen."
        action={
          <div className="heading-actions">
            <Button secondary onClick={() => setGuestImport(true)}>
              <UploadSimple size={17} /> Excel importieren
            </Button>
            <Button onClick={() => edit("guests")}>
              <Plus size={17} /> Gast hinzufügen
            </Button>
          </div>
        }
      />
      <div className="guest-summary">
        {state.events.map((event) => (
          <div className="panel" key={event.id}>
            <h3>{event.name}</h3>
            <strong>
              {peopleCount(
                state.guests.filter(
                  (g) => g.attendance[event.id] === "Zugesagt",
                ),
              )}{" "}
              erfasste Zusagen
            </strong>
            <p>
              Plan:{" "}
              {event.guests === null
                ? "noch offen"
                : event.guests + " Personen"}{" "}
              ·{" "}
              {peopleCount(
                state.guests.filter(
                  (g) => g.attendance[event.id] === "Vorgesehen",
                ),
              )}{" "}
              vorgesehen · separat je Feier
            </p>
          </div>
        ))}
      </div>
      <section className="panel data-panel">
        <div className="table-toolbar">
          <label>
            Person oder Haushalt suchen
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Veranstaltung
            <select
              value={guestEvent}
              onChange={(e) => setGuestEvent(e.target.value)}
            >
              <option value="">Alle Feiern</option>
              {state.events.map((event) => (
                <option value={event.id} key={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rückmeldung
            <select
              value={guestResponse}
              onChange={(e) => setGuestResponse(e.target.value)}
            >
              <option>Alle Rückmeldungen</option>
              {attendanceValues.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="list-table">
            <caption className="sr-only">
              Gäste und Rückmeldungen je Veranstaltung
            </caption>
            <thead>
              <tr>
                <th>Name & Haushalt</th>
                {state.events.map((event) => (
                  <th key={event.id}>{event.name}</th>
                ))}
                <th>Essen & Hinweise</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <th>
                    <strong>{guest.name}</strong>
                    <span className="guest-count">
                      {guest.partySize ?? 1}{" "}
                      {(guest.partySize ?? 1) === 1 ? "Person" : "Personen"}
                    </span>
                    <p>
                      {guest.household || "Haushalt offen"} · {guest.type}
                      {guest.table && " · Tisch " + guest.table}
                    </p>
                  </th>
                  {state.events.map((event) => (
                    <td key={event.id}>
                      {guest.attendance[event.id] || "Nicht angegeben"}
                    </td>
                  ))}
                  <td>
                    {guest.dietary || "Nicht angegeben"}
                    {guest.notes && <p>{guest.notes}</p>}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`${guest.name} bearbeiten`}
                      onClick={() => edit("guests", guest)}
                    >
                      <PencilSimple />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${guest.name} löschen`}
                      onClick={() => void remove("guests", guest)}
                    >
                      <Trash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!guests.length && (
          <p className="empty-copy padded">
            Noch keine passenden Gäste erfasst. Die Planungsgröße von 180–220
            Personen ist keine bestätigte Gästeliste.
          </p>
        )}
      </section>
    </>
  );
  const scenario =
    budget.fixed !== null && budget.perGuest !== null
      ? committed + budget.fixed + scenarioGuests * budget.perGuest
      : null;
  const budgetView = (
    <>
      <Title
        title="Ein gutes Gefühl fürs Budget."
        description="Planungswerte, unverbindliche Angebote, beauftragte Kosten und Zahlungen bleiben getrennt."
        action={
          <Button onClick={() => edit("costs")}>
            <Plus size={17} /> Kosten erfassen
          </Button>
        }
      />
      <div className="stats-grid">
        <Stat
          icon={Wallet}
          label="Zielbudget"
          value={budget.target === null ? "Noch offen" : money(budget.target)}
          detail={
            budget.limit === null
              ? "Obergrenze offen"
              : "Obergrenze " + money(budget.limit)
          }
        />
        <Stat
          icon={CheckCircle}
          label="Bekannt beauftragt"
          value={money(committed)}
          detail={
            unknownCommitted
              ? `${unknownCommitted} beauftragte Beträge noch offen`
              : "Nur verbindlich erfasste Kosten"
          }
        />
        <Stat
          icon={Coins}
          label="Bekannt gezahlt"
          value={money(paid)}
          detail="Zahlungen zu beauftragten Kosten"
        />
        <Stat
          icon={CalendarBlank}
          label="Bekannt offen"
          value={money(knownOpen)}
          detail={
            unknownBalances
              ? "Weitere offene Beträge noch unbekannt"
              : "Beauftragt abzüglich gezahlt"
          }
        />
      </div>
      <div className="budget-grid">
        {paymentCard}
        <section className="panel scenario">
          <Heading
            title="Was wäre, wenn …"
            subtitle="Gespeicherte Planungsannahmen, keine Gesamtkostenprognose."
            action={
              <button
                className="text-button"
                onClick={() => edit("settings", budget)}
              >
                Werte bearbeiten <PencilSimple size={15} />
              </button>
            }
          />
          <div
            className="segmented"
            role="group"
            aria-label="Szenario Gästezahl"
          >
            {[180, 200, 220].map((n) => (
              <button
                key={n}
                aria-pressed={scenarioGuests === n}
                onClick={() => setScenarioGuests(n)}
              >
                {n} Gäste
              </button>
            ))}
          </div>
          <p className="scenario-assumption">
            {scenarioGuests} Gäste sind eine ausdrückliche Planungsannahme. Eure
            gespeicherte Basisannahme: {budget.guests}.
          </p>
          <p>
            Bekannt beauftragt {money(committed)} + weitere feste Kosten{" "}
            {price(budget.fixed)} + {scenarioGuests} × {price(budget.perGuest)}{" "}
            pro Gast.
          </p>
          <div className="scenario-result">
            <span>Rechenmodell · beauftragte Kosten einmal enthalten</span>
            <strong>
              {scenario === null ? "Noch unvollständig" : money(scenario)}
            </strong>
          </div>
          <small>
            Weitere Fixkosten müssen zusätzlich zur bereits erfassten
            Beauftragung eingegeben werden. Unbekannte Kosten sind nicht
            enthalten.
          </small>
        </section>
      </div>
      <section className="panel data-panel">
        <Heading
          title="Kosten & Zahlungen"
          subtitle="Beträge in EUR. Gemeinsame Kosten für mehrere Feiern einmal erfassen."
        />
        <div className="table-scroll">
          <table className="list-table">
            <caption className="sr-only">
              Gespeicherte Kosten und Zahlungen
            </caption>
            <thead>
              <tr>
                <th>Kostenposition</th>
                <th>Status</th>
                <th>Gesamt</th>
                <th>Gezahlt</th>
                <th>Frist</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {state.costs.map((cost) => (
                <tr key={cost.id}>
                  <th>
                    {cost.label}
                    <p>{cost.event || "Veranstaltung offen"}</p>
                  </th>
                  <td>
                    <Badge tone={cost.stage === "Beauftragt" ? "success" : ""}>
                      {cost.stage}
                    </Badge>
                  </td>
                  <td>{price(cost.amount)}</td>
                  <td>{price(cost.paid)}</td>
                  <td>{dateText(cost.due)}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`${cost.label} bearbeiten`}
                      onClick={() => edit("costs", cost)}
                    >
                      <PencilSimple />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${cost.label} löschen`}
                      onClick={() => void remove("costs", cost)}
                    >
                      <Trash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="inline-note">
        <Info />
        <span>
          Unbestätigte Angebotskosten erhöhen diese Beauftragung nicht. Beträge
          für Musik, Styling und Catering bleiben unbekannt, bis ihr sie
          ausdrücklich erfasst.
        </span>
      </div>
    </>
  );
  const eventsView = (
    <>
      <Title
        title="Drei Feiern. Eure Geschichte."
        description="Eigene Termine, Gästegrößen und Abläufe. Rituale und Traditionen ergänzt ihr selbst."
      />
      <div className="event-cards">
        {state.events.map((event, index) => (
          <section className="panel event-detail" key={event.id}>
            <div className="card-top">
              <span className="event-no">0{index + 1}</span>
              <Badge tone={event.status === "Saal gebucht" ? "success" : ""}>
                {event.status}
              </Badge>
            </div>
            <h2>{event.name}</h2>
            <div className="event-facts">
              <div>
                <CalendarBlank />
                <span>
                  Wann<strong>{dateText(event.date)}</strong>
                </span>
              </div>
              <div>
                <MapPin />
                <span>
                  Wo
                  <strong>
                    {event.location || "Ort / Adresse noch offen"}
                  </strong>
                </span>
              </div>
              <div>
                <Users />
                <span>
                  Wer
                  <strong>
                    {event.guests === null
                      ? "Gästezahl noch offen"
                      : `${event.guests} Personen geplant`}
                  </strong>
                </span>
              </div>
            </div>
            {event.traditions && (
              <div className="event-notes">
                <h3>Eure Traditionen</h3>
                <p>{event.traditions}</p>
              </div>
            )}
            {event.notes && (
              <div className="event-notes">
                <h3>Ablauf & Notizen</h3>
                <p>{event.notes}</p>
              </div>
            )}
            <Button secondary onClick={() => edit("events", event)}>
              Planung bearbeiten <PencilSimple size={15} />
            </Button>
          </section>
        ))}
      </div>
      <div className="inline-note">
        <Info />
        180–220 Personen sind für die größte Feier geplant. Die Einzelzahlen und
        ihre Zuordnung bleiben offen, bis ihr sie eintragt.
      </div>
      <EventIdeas
        events={state.events}
        tasks={state.tasks}
        onPrepare={(task) => edit("tasks", task)}
      />
    </>
  );
  const documentsView = (
    <>
      <Title
        title="Alles am richtigen Platz."
        description="Originale bleiben privat gespeichert und sind für beide Konten verfügbar."
        action={
          <Button onClick={() => setReview({})}>
            <UploadSimple size={17} /> Angebot hinzufügen
          </Button>
        }
      />
      <section className="panel documents-panel">
        <Heading
          title="Eure Unterlagen"
          subtitle="Neue Auswertungen erscheinen nach wenigen Sekunden automatisch."
        />
        {state.documents.map((doc) => (
          <div className="document-row" key={doc.id}>
            <FileText size={25} />
            <div>
              <strong>{doc.name}</strong>
              <p>
                {Math.ceil(doc.size / 1024)} KB · {doc.progress}
              </p>
              {doc.error && <p className="field-error">{doc.error}</p>}
            </div>
            <Badge tone={doc.status === "complete" ? "success" : "warm"}>
              {doc.status === "complete"
                ? "Prüfbereit"
                : doc.status === "error"
                  ? "Manuell prüfen"
                  : "In Auswertung"}
            </Badge>
            <div className="row-actions">
              <Button
                secondary
                onClick={() =>
                  setReview({
                    offer: state.offers.find((o) => o.documentId === doc.id),
                    documentId: doc.id,
                  })
                }
              >
                Prüfen
              </Button>
              <a
                className="icon-button"
                aria-label={`${doc.name} herunterladen`}
                href={`/api/documents/${doc.id}/file?download=1`}
              >
                <DownloadSimple size={20} />
              </a>
              <button
                className="icon-button"
                aria-label={`${doc.name} löschen`}
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Originaldatei und Auswertung dauerhaft löschen?",
                    )
                  )
                    return;
                  try {
                    await api(`/documents/${doc.id}`, { method: "DELETE" });
                    notify("Dokument gelöscht.");
                    await refresh();
                  } catch (error) {
                    notify((error as Error).message, "error");
                  }
                }}
              >
                <Trash size={18} />
              </button>
            </div>
          </div>
        ))}
        {!state.documents.length && (
          <div className="empty-state">
            <FileText size={50} weight="thin" />
            <h2>Eure Unterlagen kommen hier zusammen.</h2>
            <p>
              PDF-Angebote, Bilder und Text lokal auswerten. Word- oder
              E-Mail-Dateien bitte als PDF exportieren oder ihren Text einfügen.
            </p>
            <Button secondary onClick={() => setReview({})}>
              Erstes Angebot hinzufügen <ArrowRight />
            </Button>
          </div>
        )}
      </section>
    </>
  );
  let content: ReactNode = overview;
  if (section === "Dienstleister") content = comparison;
  if (section === "Entdecken")
    content = (
      <Discover
        providers={state.providers}
        events={state.events}
        onSaved={refresh}
      />
    );
  if (section === "Gäste") content = guestsView;
  if (section === "Budget") content = budgetView;
  if (section === "Aufgaben")
    content = (
      <>
        <Title
          title="Ein Schritt nach dem anderen."
          description="Aufgaben zuordnen, Termine festlegen und den Fortschritt gemeinsam nachhalten."
          action={
            <Button onClick={() => edit("tasks")}>
              <Plus size={17} /> Aufgabe anlegen
            </Button>
          }
        />
        <section className="panel tasks-panel">{taskList()}</section>
      </>
    );
  if (section === "Veranstaltungen") content = eventsView;
  if (section === "Dokumente") content = documentsView;
  if (section === "Gemeinsam")
    content = <Team state={state} user={user} logout={signOut} />;
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Zum Inhalt
      </a>
      <div className="workspace">
        <aside className="sidebar">
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              go("Übersicht");
            }}
          >
            <div className="brand-icon">
              <Flower size={29} weight="thin" />
            </div>
            <span>
              Wedding <em>SS</em>
              <small>UNSERE HOCHZEIT</small>
            </span>
          </a>
          <div className="project-card">
            <span className="monogram">
              S<span>&</span>S
            </span>
            <div>
              <strong>Unser großes Ja.</strong>
              <small>2027 · Berlin & Brandenburg</small>
            </div>
          </div>
          <span className="nav-label">UNSERE PLANUNG</span>
          <nav aria-label="Hauptnavigation">
            {navigation.map(({ label, icon: IconComponent }) => (
              <a
                className={section === label ? "active" : ""}
                href={sectionHref(label)}
                aria-current={section === label ? "page" : undefined}
                key={label}
                onClick={(event) => {
                  if (
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey &&
                    event.button === 0
                  ) {
                    event.preventDefault();
                    go(label);
                  }
                }}
              >
                <IconComponent
                  size={20}
                  weight={section === label ? "fill" : "regular"}
                />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <Flower size={30} weight="thin" />
            <p>
              Ein Tag voller Liebe.
              <br />
              Ein Plan, der sich gut anfühlt.
            </p>
            <button className="text-button" onClick={signOut}>
              <SignOut size={15} /> Abmelden
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="workspace-header">
            <div className="breadcrumb">
              Wedding SS <span>/</span>
              <strong>{section}</strong>
            </div>
            <div className="header-end">
              <span className="region">
                <MapPin size={15} /> Berlin & Brandenburg
              </span>
              <span className="header-year">2027</span>
              <button
                className="couple-avatar"
                aria-label="Gemeinsame Nutzung und Konto öffnen"
                onClick={() => go("Gemeinsam")}
              >
                {user.name.slice(0, 2).toUpperCase()}
              </button>
            </div>
          </header>
          <div
            className={`session-notice ${connectionError ? "offline" : ""}`}
            role="status"
          >
            {connectionError ? (
              <WarningCircle size={15} />
            ) : (
              <LockKey size={15} />
            )}
            <span>
              {connectionError
                ? `Keine Verbindung: ${connectionError} Änderungen erst nach bestätigtem Speichern übernehmen.`
                : cloudMode
                  ? "Privat in der Cloud gespeichert · Für euch beide erreichbar · Keine kostenpflichtige KI"
                  : "Privat auf eurem Rechner gespeichert · Für euch beide synchronisiert · Keine kostenpflichtigen APIs"}
            </span>
            {connectionError && (
              <button className="text-button" onClick={() => void refresh()}>
                Erneut verbinden
              </button>
            )}
          </div>
          <main id="main" className="main-content">
            {state?.cloudMove && (
              <div className="session-notice" role="status">
                {state.cloudMove.complete ? (
                  <span>
                    Eure Planung ist jetzt online.{" "}
                    <a href={state.cloudMove.siteUrl}>
                      Hier gemeinsam weiterplanen
                    </a>
                    . Diese lokale Sicherung ist schreibgeschützt.
                  </span>
                ) : (
                  <span>
                    Eure Planung wird sicher online übernommen. Bitte kurz
                    warten; diese lokale Fassung ist vorübergehend
                    schreibgeschützt.
                  </span>
                )}
              </div>
            )}
            {content}
            <footer className="page-footer">
              <span>
                Wedding SS <Heart size={12} /> Gemeinsam Richtung 2027.
              </span>
              <button onClick={() => go("Gemeinsam")}>
                Gemeinsamer Zugang & Datenexport <ArrowUpRight size={13} />
              </button>
            </footer>
          </main>
        </div>
      </div>
      {notice && (
        <div
          className={`toast ${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.tone === "error" ? (
            <WarningCircle size={20} />
          ) : notice.tone === "info" ? (
            <Info size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          <span>{notice.text}</span>
          <button aria-label="Hinweis schließen" onClick={() => notify("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {editor && (
        <Dialog
          title={
            editor.kind === "settings"
              ? "Budget & Planungsannahmen"
              : editor.kind === "events"
                ? "Eure Veranstaltung"
                : editor.record?.id
                  ? "Eintrag bearbeiten"
                  : "Neuen Eintrag anlegen"
          }
          onClose={() => {
            if (editorActivity.saving) return;
            if (
              editorActivity.dirty &&
              !window.confirm("Ungespeicherte Änderungen verwerfen?")
            )
              return;
            setEditor(null);
            setEditorActivity({ dirty: false, saving: false });
          }}
        >
          <RecordEditor
            kind={editor.kind}
            record={editor.record}
            state={state}
            onSaved={() => void saved()}
            onStatusChange={setEditorActivity}
          />
        </Dialog>
      )}
      {guestImport && (
        <Dialog
          title="Gästeliste aus Excel übernehmen"
          wide
          onClose={() => setGuestImport(false)}
        >
          <GuestImport
            guests={state.guests}
            events={state.events}
            onSaved={(message) => {
              setGuestImport(false);
              void refresh();
              notify(message);
            }}
          />
        </Dialog>
      )}
      {review && (
        <Dialog
          title="Original und erkannte Angaben prüfen"
          wide
          onClose={() => {
            if (reviewSaving) return;
            if (
              reviewUnsaved &&
              !window.confirm(
                "Der Browser konnte diesen Entwurf nicht sichern. Änderungen beim Schließen verwerfen?",
              )
            )
              return;
            setReview(null);
          }}
        >
          {reviewSaving && (
            <p className="inline-note" role="status">
              Geprüftes Angebot wird gespeichert. Bitte kurz warten.
            </p>
          )}
          <OfferReview
            userId={user.id}
            onUnsavedChange={setReviewUnsaved}
            onSavingChange={setReviewSaving}
            offer={review.offer}
            latestOffer={state.offers.find(
              (offer) => offer.id === review.offer?.id,
            )}
            initialDocument={review.documentId}
            providers={state.providers}
            events={state.events}
            onSaved={() => {
              void saved();
              go("Dienstleister");
            }}
          />
        </Dialog>
      )}
      {booking && (
        <Dialog
          title="Buchung ausdrücklich bestätigen"
          onClose={() => setBooking(null)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBookingError("");
              setBusy(true);
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await api(`/offers/${booking.id}/book`, {
                  method: "POST",
                  body: json({
                    amount: Number(data.amount),
                    paid: Number(data.paid),
                    due: data.due,
                    version: booking.version,
                  }),
                });
                setBooking(null);
                await refresh();
                notify("Buchung einmal im Budget erfasst.");
              } catch (error) {
                setBookingError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h3>{booking.name}</h3>
            <p>
              Prüft den tatsächlich vereinbarten Gesamtpreis inklusive
              notwendiger Zusatzkosten. Dieser ausdrücklich bestätigte Betrag
              wird einmal als beauftragt im Budget erfasst.
            </p>
            <label>
              Verbindlicher Gesamtbetrag in EUR
              <input
                name="amount"
                required
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                defaultValue={
                  booking.currency === "EUR" && booking.basis === "Brutto"
                    ? (booking.price ?? "")
                    : ""
                }
              />
            </label>
            <label>
              Bereits gezahlt in EUR (0 ausdrücklich eintragen)
              <input name="paid" required type="number" min="0" step="0.01" />
            </label>
            <label>
              Zahlungsfrist
              <input name="due" type="date" />
            </label>
            <label className="confirmation">
              <input type="checkbox" required />
              <span>
                Ich bestätige die verbindliche Buchung und die Beträge in EUR.
                Fehlende Zusatzkosten habe ich geklärt.
              </span>
            </label>
            <ErrorMessage message={bookingError} />
            <Button disabled={busy} type="submit">
              Buchung im Budget speichern
            </Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
