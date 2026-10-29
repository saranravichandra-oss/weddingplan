import { useEffect, useState } from "react";
import { cloudMode } from "../documents";
import { Flower, LockKey } from "@phosphor-icons/react";
import { api, json, setCsrf } from "../api";
import type { Auth } from "../api";
import type { User } from "../data";
import { Button, ErrorMessage } from "./ui";
export default function AccountGate({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [canSetup, setCanSetup] = useState(false);
  const [invitation, setInvitation] = useState(
    new URLSearchParams(location.hash.slice(1)).get("invite") || "",
  );
  const [joining, setJoining] = useState(!!invitation);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  async function checkStatus() {
    setChecking(true);
    setError("");
    try {
      const data = await api<{ setupRequired: boolean; canSetup: boolean }>(
        "/auth/status",
      );
      setSetup(data.setupRequired);
      setCanSetup(data.canSetup);
    } catch {
      setError(
        cloudMode
          ? "Die Datenverbindung ist gerade nicht erreichbar. Bitte erneut prüfen."
          : "Der lokale Server ist nicht erreichbar. Bitte die App auf dem Hauptrechner starten und erneut prüfen.",
      );
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    void checkStatus();
  }, []);
  return (
    <div className="account-page">
      <div className="account-brand">
        <Flower size={33} weight="thin" /> Wedding <em>SS</em>
      </div>
      <div className="panel account-panel">
        <span className="eyebrow">EURE PRIVATE PLANUNGSZENTRALE</span>
        <h1>
          {setup
            ? "Euer Plan beginnt hier."
            : joining
              ? "Gemeinsam weiterplanen."
              : "Schön, dass du da bist."}
        </h1>
        <p>
          {setup
            ? "Erstelle den ersten privaten Zugang. Danach kannst du deinen Partner oder deine Partnerin einladen."
            : joining
              ? "Mit eurem Einladungscode erhältst du den zweiten Zugang zur selben Planung."
              : "Melde dich an, um eure Planung und Angebote zu öffnen."}
        </p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || setup === null) return;
            setError("");
            setBusy(true);
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const response = await api<Auth>(
                setup
                  ? "/auth/setup"
                  : joining
                    ? "/auth/accept"
                    : "/auth/login",
                { method: "POST", body: json({ ...data, invitation }) },
              );
              setCsrf(response.csrf);
              history.replaceState({}, "", location.pathname + location.search);
              onLogin(response.user);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {(setup || joining) && (
            <label>
              Dein Name
              <input
                name="name"
                disabled={busy || setup === null}
                required
                maxLength={200}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            E-Mail als Anmeldename
            <input
              name="email"
              disabled={busy || setup === null}
              required
              type="email"
              autoComplete="username"
              maxLength={200}
            />
          </label>
          <label>
            Passwort
            <input
              name="password"
              disabled={busy || setup === null}
              required
              type="password"
              minLength={setup || joining ? 12 : 1}
              maxLength={200}
              autoComplete={
                setup || joining ? "new-password" : "current-password"
              }
            />
            {(setup || joining) && (
              <small>
                Mindestens 12 Zeichen. Es wird keine E-Mail versendet.
              </small>
            )}
          </label>
          {joining && !setup && (
            <label>
              Einladungscode
              <input
                required
                disabled={busy || setup === null}
                value={invitation}
                onChange={(e) => setInvitation(e.target.value.trim())}
                autoComplete="off"
              />
            </label>
          )}
          <ErrorMessage message={error} />
          {setup === null &&
            (checking ? (
              <p role="status">Verbindung wird geprüft …</p>
            ) : (
              <Button secondary onClick={() => void checkStatus()}>
                Verbindung erneut prüfen
              </Button>
            ))}
          {setup && !canSetup && (
            <ErrorMessage message="Der erste Zugang muss direkt auf dem Hauptrechner unter http://127.0.0.1:5173 eingerichtet werden." />
          )}
          <Button
            type="submit"
            disabled={busy || setup === null || (setup && !canSetup)}
          >
            {busy
              ? "Wird geprüft …"
              : setup
                ? "Ersten Zugang erstellen"
                : joining
                  ? "Einladung annehmen"
                  : "Anmelden"}
          </Button>
        </form>
        {!setup && (
          <button
            className="text-button"
            disabled={busy || setup === null}
            onClick={() => {
              setJoining(!joining);
              setError("");
            }}
          >
            {joining
              ? "Ich habe bereits einen Zugang"
              : "Ich habe einen Einladungscode"}
          </button>
        )}
        <div className="account-note">
          <LockKey size={17} />
          <span>
            {cloudMode
              ? "Private Cloudplanung für euch beide. Ihr könnt euch aus unterschiedlichen Netzwerken anmelden. Keine kostenpflichtige KI."
              : "Daten bleiben auf eurem Rechner. Keine kostenpflichtigen APIs. Für beide Geräte muss derselbe App-Server erreichbar sein."}
          </span>
        </div>
      </div>
    </div>
  );
}
