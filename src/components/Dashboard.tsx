import {
  ArrowUpRight,
  ArrowRight,
  CalendarBlank,
  FileText,
  Heart,
  UploadSimple,
  Users,
  Wallet,
  CheckCircle,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { AppState, Section, User } from "../data";
import { money, dateText } from "../data";
import { peopleCount } from "../../shared/guests.mjs";
import { Button } from "./ui";
export default function Dashboard({
  state,
  user,
  go,
  onUpload,
  onImport,
  tasks,
}: {
  state: AppState;
  user: User;
  go: (section: Section) => void;
  onUpload: () => void;
  onImport: () => void;
  tasks: ReactNode;
}) {
  const committed = state.costs.filter((cost) => cost.stage === "Beauftragt");
  const amount = committed.reduce((sum, cost) => sum + (cost.amount ?? 0), 0);
  const paid = committed.reduce((sum, cost) => sum + (cost.paid ?? 0), 0);
  const unknown = committed.some(
    (cost) => cost.amount === null || cost.paid === null,
  );
  const budget = state.settings[0];
  const unreviewed = state.documents.filter(
    (doc) => !state.offers.some((offer) => offer.documentId === doc.id),
  );
  const openTasks = state.tasks.filter((task) => !task.done).length;
  const events = state.events;
  return (
    <div className="atelier-dashboard">
      <section className="atelier-hero">
        <div className="atelier-hero-copy">
          <p className="atelier-kicker">FÜR EUREN GROSSEN TAG</p>
          <h1>
            Ein großes Ja.
            <br />
            <em>Viele kleine Schritte.</em>
          </h1>
          <p className="atelier-intro">
            Schön, dass du da bist, {user.name.split(" ")[0]}. Hier findet alles
            zusammen: eure Menschen, eure Ideen und die Entscheidungen, die als
            Nächstes anstehen.
          </p>
          <div className="atelier-hero-actions">
            <Button onClick={onUpload}>
              <UploadSimple size={19} /> Angebot hinzufügen
            </Button>
            <button
              className="atelier-inline-link"
              onClick={() => go("Dienstleister")}
            >
              Zum Angebotsvergleich <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="atelier-seal" aria-hidden="true">
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="108" />
            <circle cx="120" cy="120" r="98" />
            {Array.from({ length: 8 }, (_, index) => (
              <ellipse
                key={index}
                cx="120"
                cy="88"
                rx="20"
                ry="34"
                transform={`rotate(${index * 45} 120 120)`}
              />
            ))}
            <circle cx="120" cy="120" r="13" />
          </svg>
          <span>
            S <i>&</i> S
          </span>
          <small>UNSER JA · 2027</small>
        </div>
      </section>
      <section className="atelier-event-rail" aria-label="Eure drei Feiern">
        {events.map((event, index) => (
          <button key={event.id} onClick={() => go("Veranstaltungen")}>
            <span className="atelier-event-index">0{index + 1}</span>
            <span>
              <strong>{event.name}</strong>
              <small>
                <CalendarBlank size={13} />
                {event.date
                  ? dateText(event.date)
                  : "Termin gemeinsam festlegen"}
              </small>
            </span>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </section>
      <div className="atelier-main-grid">
        <section className="atelier-focus">
          <div className="atelier-section-label">
            <span>EURE NÄCHSTE ENTSCHEIDUNG</span>
            <FileText size={20} />
          </div>
          <h2>
            {unreviewed.length
              ? `${unreviewed.length} ${unreviewed.length === 1 ? "Unterlage wartet" : "Unterlagen warten"} auf euren Blick.`
              : "Welche Erinnerungen möchtet ihr festhalten?"}
          </h2>
          <p>
            {unreviewed.length
              ? "Die Originale sind bereits gespeichert. Prüft Gesamtpreis und Leistungen und übernehmt die Angaben in euren Vergleich."
              : "Foto und Video stehen gerade im Mittelpunkt. Bringt eure Angebote zusammen und seht auf einen Blick, was ihr dafür bekommt."}
          </p>
          <div className="atelier-focus-bottom">
            <button
              onClick={() =>
                go(unreviewed.length ? "Dokumente" : "Dienstleister")
              }
            >
              {unreviewed.length ? "Unterlagen prüfen" : "Angebote vergleichen"}
              <ArrowRight size={19} />
            </button>
            <span>
              {state.offers.length}{" "}
              {state.offers.length === 1 ? "Angebot" : "Angebote"} im Vergleich
            </span>
          </div>
        </section>
        <section className="atelier-budget">
          <div className="atelier-section-label">
            <span>EUER BUDGETGEFÜHL</span>
            <Wallet size={20} />
          </div>
          <div className="atelier-budget-total">
            <strong>{money(amount)}</strong>
            <span>
              bisher bekannt beauftragt
              {committed.some((cost) => cost.amount === null)
                ? " · weitere Beträge offen"
                : ""}
            </span>
          </div>
          <dl>
            <div>
              <dt>Davon bekannt gezahlt</dt>
              <dd>{money(paid)}</dd>
            </div>
            <div>
              <dt>Zielbudget</dt>
              <dd>
                {budget?.target === null || budget?.target === undefined
                  ? "Noch offen"
                  : money(budget.target)}
              </dd>
            </div>
            <div>
              <dt>Offene Zahlungen</dt>
              <dd>{unknown ? "Noch unvollständig" : money(amount - paid)}</dd>
            </div>
          </dl>
          <button className="atelier-inline-link" onClick={() => go("Budget")}>
            Budget & Zahlungen öffnen <ArrowUpRight size={17} />
          </button>
        </section>
      </div>
      <div className="atelier-lower-grid">
        <section className="atelier-tasks">
          <div className="atelier-panel-heading">
            <div>
              <p className="atelier-kicker">EIN SCHRITT NACH DEM ANDEREN</p>
              <h2>Das steht als Nächstes an.</h2>
            </div>
            <button
              className="atelier-inline-link"
              onClick={() => go("Aufgaben")}
            >
              {openTasks} offen <ArrowUpRight size={17} />
            </button>
          </div>
          {tasks}
        </section>
        <section className="atelier-people">
          <div className="atelier-people-icon">
            <Users size={29} />
            <Heart size={15} weight="fill" />
          </div>
          <h2>Eure Lieblingsmenschen.</h2>
          <p>
            {state.guests.length
              ? `${peopleCount(state.guests)} Personen in ${state.guests.length} Einträgen. Familien und Rückmeldungen bleiben für jede Feier im Blick.`
              : "Eure Gästeliste hat schon ein Zuhause? Bringt sie aus Excel mit und plant gemeinsam weiter."}
          </p>
          <button onClick={onImport}>
            Gästeliste aus Excel übernehmen <ArrowUpRight size={18} />
          </button>
          <div className="atelier-people-note">
            <CheckCircle size={16} />
            <span>Familien zählen mit ihrer Personenzahl.</span>
          </div>
        </section>
      </div>
      <section className="atelier-discover-invitation">
        <div>
          <p className="atelier-kicker">VON DER IDEE ZUR ENTSCHEIDUNG</p>
          <h2>
            Tamilische Dienstleister.
            <br />
            <em>Neue Lieblingsorte.</em>
          </h2>
          <p>
            Entdeckt unsere recherchierte Vorauswahl mit Quellen, Leistungen und
            den Fragen, die ihr noch klären könnt.
          </p>
        </div>
        <Button secondary onClick={() => go("Entdecken")}>
          Vorauswahl entdecken <ArrowUpRight size={18} />
        </Button>
      </section>
    </div>
  );
}
