import type { ReactNode } from "react";
import {
  Camera,
  FileText,
  Clock,
  Users,
  CheckCircle,
} from "@phosphor-icons/react";
import { price } from "../data";
import type { Offer } from "../data";
import { Badge } from "./ui";

export default function OfferCards({
  offers,
  actions,
}: {
  offers: Offer[];
  actions: (offer: Offer) => ReactNode;
}) {
  const details: [string, keyof Offer][] = [
    ["Fotografie", "photos"],
    ["Videografie", "video"],
    ["Weitere Leistungen", "included"],
    ["Lieferzeiten", "delivery"],
    ["Fahrt & Übernachtung", "extras"],
  ];
  return (
    <div
      className="offer-cards"
      aria-label="Übersicht eurer geprüften Angebote"
    >
      {offers.map((offer) => (
        <article
          className={`offer-overview-card ${offer.status === "Favorit" ? "favorite" : ""}`}
          key={offer.id}
          aria-label={offer.name}
        >
          <header>
            <span className="offer-card-category">
              <Camera size={16} />
              {offer.category}
            </span>
            <Badge tone={offer.status === "Gebucht" ? "success" : ""}>
              {offer.status}
            </Badge>
          </header>
          <h3>{offer.name}</h3>
          <p className="offer-card-package">
            {offer.packageName || "Geprüftes Angebot"}
          </p>
          <div className="offer-card-price">
            <span>Gesamtpreis</span>
            <strong className={offer.price === null ? "unknown" : ""}>
              {price(offer.price, offer.currency)}
            </strong>
            <small>
              {offer.basis === "Nicht angegeben"
                ? "Netto / Brutto nicht angegeben"
                : offer.basis}
              {offer.events.length > 0 && ` · ${offer.events.join(" + ")}`}
            </small>
          </div>
          {offer.pricingNotes && (
            <p className="offer-card-pricing-notes">{offer.pricingNotes}</p>
          )}
          {(offer.hours || offer.team) && (
            <div className="offer-card-meta">
              {offer.hours && (
                <span>
                  <Clock size={16} />
                  {offer.hours}
                </span>
              )}
              {offer.team && (
                <span>
                  <Users size={16} />
                  {offer.team}
                </span>
              )}
            </div>
          )}
          <dl className="offer-card-services">
            {details
              .filter(
                ([, key]) =>
                  offer.category === "Foto & Video" ||
                  !["photos", "video"].includes(key) ||
                  !!offer[key],
              )
              .map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {String(offer[key] || "Nicht angegeben")}
                    {!!offer.evidence[key]?.length && (
                      <small>
                        {offer.manualFields.includes(key)
                          ? "Manuell angepasst · ursprüngliche Fundstelle: Seite "
                          : "Fundstelle: Seite "}
                        {[
                          ...new Set(
                            offer.evidence[key].map((source) => source.page),
                          ),
                        ].join(", ")}
                      </small>
                    )}
                  </dd>
                </div>
              ))}
          </dl>
          {(offer.optional || offer.excluded || offer.questions) && (
            <details className="offer-card-open">
              <summary>Extras & offene Punkte</summary>
              {offer.optional && (
                <p>
                  <strong>Optional:</strong> {offer.optional}
                </p>
              )}
              {offer.excluded && (
                <p>
                  <strong>Nicht enthalten:</strong> {offer.excluded}
                </p>
              )}
              {offer.questions && (
                <p>
                  <strong>Zu klären:</strong> {offer.questions}
                </p>
              )}
            </details>
          )}
          {offer.decision && (
            <p className="offer-card-decision">
              <strong>Eure Einschätzung</strong>
              {offer.decision}
            </p>
          )}
          <div className="offer-card-confirmed">
            <CheckCircle size={15} />
            Von euch geprüft
            {offer.documentId && (
              <>
                <FileText size={15} />
                Original hinterlegt
              </>
            )}
          </div>
          <footer>{actions(offer)}</footer>
        </article>
      ))}
    </div>
  );
}
