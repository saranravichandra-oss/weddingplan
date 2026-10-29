import { useState } from "react";
import {
  ArrowUpRight,
  Camera,
  Check,
  Clock,
  Flower,
  ForkKnife,
  Translate,
  Users,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { Task, WeddingEvent } from "../data";
import { Button } from "./ui";

const ideas: { title: string; short: string; detail: string; icon: Icon }[] = [
  {
    title: "Unsere bedeutenden Momente festhalten",
    short: "Was soll sich für euch und eure Familien richtig anfühlen?",
    detail:
      "Gemeinsam auswählen, welche persönlichen, familiären oder kulturellen Momente ihr einplanen möchtet. Reihenfolge, gewünschte Begleitung und Ansprechperson abstimmen. Nichts wird allein aufgrund der tamilischen Ausrichtung vorausgesetzt.",
    icon: Flower,
  },
  {
    title: "Zeitpuffer für Outfitwechsel abstimmen",
    short: "Ankommen, fertig machen, umziehen – mit Zeit zum Durchatmen.",
    detail:
      "Gewünschte Looks und Wechsel besprechen: Vorbereitung, Styling, Ankleiden, Wege, privater Raum und ein realistischer Zeitpuffer. Nur tatsächlich gewünschte Wechsel in euren Ablauf aufnehmen.",
    icon: Clock,
  },
  {
    title: "Foto- und Filmmomente gemeinsam auswählen",
    short: "Eure Wunschbilder und Familiengruppen vorab sammeln.",
    detail:
      "Kurze Wunschliste für Foto/Video erstellen: wichtige Personen und Momente, Gruppenbilder, Paarzeit und ungestörte Begleitung. Eine Ansprechperson für Familiengruppen festlegen, wenn ihr das möchtet. Aufnahmezeiten mit dem gebuchten Paket abgleichen.",
    icon: Camera,
  },
  {
    title: "Zeremonieelemente mit dem Ort abstimmen",
    short: "Die richtige Ausstattung für das, was ihr euch wünscht.",
    detail:
      "Falls ihr Thaali, Maalai oder andere Zeremonieelemente einplant: Reihenfolge und gewünschte Materialien mit euren Ansprechpersonen abstimmen. Platzbedarf, Dekoration, Anlieferung und gegebenenfalls ausdrücklich gewünschte Feuer-/Rauchelemente vorab mit dem Veranstaltungsort klären. Keine Elemente automatisch als Pflicht übernehmen.",
    icon: Flower,
  },
  {
    title: "Gäste verständlich durch den Tag begleiten",
    short: "Ein Willkommen und Erklärungen in euren gewünschten Sprachen.",
    detail:
      "Überlegen, ob und wann ihr kurze Erklärungen auf Tamil, Deutsch oder weiteren gewünschten Sprachen braucht. Begrüßung, Orientierung, Programm und ausgewählte Momente verständlich vorbereiten. Musik und Moderation mit eurem bereits organisierten Team abstimmen.",
    icon: Translate,
  },
  {
    title: "Festessen und Serviceablauf vorbereiten",
    short: "Menü, Rückmeldungen und Essenszeiten zusammenbringen.",
    detail:
      "Mit eurem ausgewählten Caterer Menü, gewünschte Servierform und Zeiten abstimmen. Ernährungswünsche und Allergieangaben gezielt nachfragen; bei Familien nicht ohne Rückfrage auf jede Person übertragen. Personal, Geschirr, Warmhaltung, Getränke und Aufräumen im Angebot prüfen.",
    icon: ForkKnife,
  },
  {
    title: "Ankommen und Wege für unsere Gäste planen",
    short: "Anreise, Orientierung, Sitzgelegenheiten und Rückweg.",
    detail:
      "Anreise, Parken oder Shuttlebedarf sowie Rückwege sammeln. Mit dem Veranstaltungsort Zugänglichkeit, Sitzmöglichkeiten, Rückzugsraum und gut sichtbare Orientierung klären. Nur die Unterstützung einplanen, die eure Gäste tatsächlich wünschen.",
    icon: Users,
  },
];

export default function EventIdeas({
  events,
  tasks,
  onPrepare,
}: {
  events: WeddingEvent[];
  tasks: Task[];
  onPrepare: (task: Partial<Task>) => void;
}) {
  const [event, setEvent] = useState("");
  return (
    <section className="event-ideas" aria-label="Optionale Planungsimpulse">
      <div className="event-ideas-heading">
        <div>
          <p className="atelier-kicker">
            EURE TRADITIONEN. EURE ENTSCHEIDUNGEN.
          </p>
          <h2>
            Ein Ablauf, der
            <br />
            <em>nach euch klingt.</em>
          </h2>
          <p>
            Wählt die Impulse, die zu euch passen. Ihr prüft und ergänzt jede
            Aufgabe, bevor sie in eurer gemeinsamen Planung landet.
          </p>
        </div>
        <label>
          Für welche Feier?
          <select
            value={event}
            onChange={(change) => setEvent(change.target.value)}
          >
            <option value="">Veranstaltung noch offen</option>
            {events.map((value) => (
              <option key={value.id} value={value.name}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="event-ideas-grid">
        {ideas.map((idea) => {
          const added = tasks.some(
            (task) => task.title === idea.title && task.event === event,
          );
          return (
            <article key={idea.title} aria-label={idea.title}>
              <idea.icon size={24} weight="light" />
              <h3>{idea.title}</h3>
              <p>{idea.short}</p>
              <details>
                <summary>Gedanken dazu</summary>
                <p>{idea.detail}</p>
              </details>
              <Button
                secondary
                disabled={added}
                onClick={() =>
                  onPrepare({
                    title: idea.title,
                    detail: idea.detail,
                    event,
                    category: "Ablauf",
                    done: false,
                    priority: "Normal",
                    due: "",
                    owner: "",
                  })
                }
              >
                {added ? (
                  <>
                    <Check size={16} />
                    Schon als Aufgabe vorhanden
                  </>
                ) : (
                  <>
                    Als Aufgabe vorbereiten <ArrowUpRight size={16} />
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </div>
      <div className="event-ideas-context">
        <strong>Traditionen bleiben persönlich.</strong>
        <p>
          Es gibt keinen vorgeschriebenen Ablauf für jede tamilische Hochzeit.
          Als kultureller Hintergrund beschreibt das National Heritage Board
          einen tamilisch-hinduistischen Kontext in Singapur, unter anderem mit
          Blumen, Schmuck und Outfitwechseln. Eure eigenen Wünsche und
          familiären Absprachen entscheiden.
        </p>
        <a
          href="https://www.roots.gov.sg/ich-landing/ich/tamil-hindu-weddings"
          target="_blank"
          rel="noreferrer"
        >
          Hintergrund beim National Heritage Board <ArrowUpRight size={14} />
          <span className="sr-only"> (öffnet neuen Tab)</span>
        </a>
        <p>
          Auch eine ethnologische Feldstudie aus Deutschland beschreibt
          unterschiedliche Feierkontexte. Solche Beobachtungen sind Anregungen
          für Fragen, keine Vorlage für eure Familie.
        </p>
        <a
          href="https://kups.ub.uni-koeln.de/12253/1/Kothe2020SozialeWeltenSriLankischTamilischerMigranteninDeutschland.pdf#page=106"
          target="_blank"
          rel="noreferrer"
        >
          Feldstudie in Deutschland · Kothe, 2020, S. 98{" "}
          <ArrowUpRight size={14} />
          <span className="sr-only"> (öffnet neuen Tab)</span>
        </a>
      </div>
    </section>
  );
}
