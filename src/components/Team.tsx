import { useState } from "react";
import {
  Copy,
  DownloadSimple,
  Info,
  LockKey,
  SignOut,
  Users,
} from "@phosphor-icons/react";
import { api, json, setCsrf } from "../api";
import type { Auth } from "../api";
import type { AppState, User } from "../data";
import { Badge, Button, ErrorMessage, Heading, Title } from "./ui";
export default function Team({
  state,
  user,
  logout,
}: {
  state: AppState;
  user: User;
  logout: () => void;
}) {
  const [invite, setInvite] = useState("");
  const [expires, setExpires] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <Title
        title="Gemeinsam ist es euer Plan."
        description="Zwei private Zugänge. Eine gemeinsame Planung auf eurem Rechner."
      />
      <div className="team-grid">
        <section className="panel team-card">
          <Heading title="Eure Zugänge" />
          {state.members.map((member) => (
            <div className="member-row" key={member.id}>
              <div className="couple-avatar">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <strong>{member.name}</strong>
                <p>{member.email}</p>
              </div>
              {member.id === user.id && <Badge>Du</Badge>}
            </div>
          ))}
          {state.members.length < 2 ? (
            <>
              <p>
                Erstelle einen einmaligen Einladungscode für den zweiten Zugang.
                Er gilt 48 Stunden. Ein neuer Code ersetzt den bisherigen.
              </p>
              <Button
                onClick={async () => {
                  setError("");
                  try {
                    const data = await api<{
                      invitation: string;
                      expires: number;
                    }>("/invitations", { method: "POST" });
                    setInvite(data.invitation);
                    setExpires(data.expires);
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                <Users size={17} /> Zweiten Zugang einladen
              </Button>
              {invite && (
                <div className="invitation-box">
                  <label>
                    Einladungscode
                    <input
                      value={invite}
                      readOnly
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <small>
                    Gültig bis {new Date(expires).toLocaleString("de-DE")}. Nur
                    persönlich weitergeben.
                  </small>
                  <Button
                    secondary
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invite);
                        setMessage("Code kopiert.");
                      } catch {
                        setMessage(
                          "Bitte den Code im Feld markieren und kopieren.",
                        );
                      }
                    }}
                  >
                    <Copy /> Code kopieren
                  </Button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      await api("/invitations", { method: "DELETE" });
                      setInvite("");
                    }}
                  >
                    Einladung widerrufen
                  </button>
                </div>
              )}
            </>
          ) : (
            <Badge tone="success">Beide Zugänge sind eingerichtet</Badge>
          )}
        </section>
        <section className="panel team-card">
          <Heading title="Auf dem zweiten Gerät öffnen" />
          <p>
            Beide Geräte mit demselben vertrauenswürdigen Netzwerk verbinden.
            Auf dem zweiten Gerät eine der folgenden Adressen öffnen und „Ich
            habe einen Einladungscode“ wählen:
          </p>
          {state.network.length ? (
            state.network.map((url) => (
              <a className="network-address" key={url} href={url}>
                {url}
              </a>
            ))
          ) : (
            <p>
              Noch keine Netzwerkadresse verfügbar. Bitte den Hauptrechner mit
              eurem Netzwerk verbinden.
            </p>
          )}
          <div className="inline-note">
            <Info />
            <span>
              Dieser Rechner und die App müssen laufen. Die Adresse kann sich
              nach einem Netzwerkwechsel ändern. Diese HTTP-Version ist für euer
              privates Netzwerk gedacht; sie ist nicht öffentlich im Internet
              bereitgestellt.
            </span>
          </div>
        </section>
        <section className="panel team-card">
          <Heading title="Daten & Kosten" />
          <Badge tone="success">Keine kostenpflichtigen API-Aufrufe</Badge>
          <p>
            Die Auswertung läuft vollständig lokal. Ein eingerichteter
            OpenAI-Schlüssel wird von dieser App nicht geladen oder verwendet.
          </p>
          <p>
            Planungsdaten und Originale liegen im privaten Ordner{" "}
            <code>.wedding-data</code>. Der JSON-Export enthält eure Einträge
            und Auswertungen; Originale separat herunterladen. Ein vollständiges
            Backup erzeugt <code>npm run backup</code>.
          </p>
          <a href="/api/export" className="button secondary">
            <DownloadSimple size={18} /> Planung als JSON exportieren
          </a>
        </section>
        <section className="panel team-card">
          <Heading title="Dein Passwort ändern" />
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = Object.fromEntries(new FormData(form));
              setError("");
              try {
                const data = await api<Auth>("/auth/password", {
                  method: "POST",
                  body: json(values),
                });
                setCsrf(data.csrf);
                form.reset();
                setMessage(
                  "Passwort geändert. Andere Sitzungen dieses Kontos wurden abgemeldet.",
                );
              } catch (error) {
                setError((error as Error).message);
              }
            }}
          >
            <label>
              Bisheriges Passwort
              <input
                name="current"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Neues Passwort
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={200}
                required
                autoComplete="new-password"
              />
            </label>
            <Button type="submit">
              <LockKey size={17} /> Passwort ändern
            </Button>
          </form>
          <Button secondary onClick={logout}>
            <SignOut size={17} /> Abmelden
          </Button>
        </section>
      </div>
      <ErrorMessage message={error} />
      {message && (
        <p role="status" className="inline-note">
          {message}
        </p>
      )}
    </>
  );
}
