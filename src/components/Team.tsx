import { useState } from "react";
import { cloudMode } from "../documents";
import {
  Copy,
  DownloadSimple,
  Info,
  LockKey,
  SignOut,
  Users,
} from "@phosphor-icons/react";
import { api, currentSessionVersion, json, setCsrf } from "../api";
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
  const [inviteError, setInviteError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteUncertain, setInviteUncertain] = useState(false);
  const [inviteBusy, setInviteBusy] = useState<"" | "create" | "revoke">("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const accountBusy = !!inviteBusy || passwordBusy || exportBusy;
  const inviteExpired = !!invite && expires <= Date.now();
  async function createInvitation() {
    if (accountBusy) return;
    setInviteBusy("create");
    setInviteError("");
    setInviteMessage("");
    setInviteUncertain(false);
    setInvite("");
    try {
      const data = await api<{ invitation: string; expires: number }>(
        "/invitations",
        { method: "POST" },
      );
      setInvite(data.invitation);
      setExpires(data.expires);
    } catch (error) {
      setInviteError((error as Error).message);
    } finally {
      setInviteBusy("");
    }
  }
  async function revokeInvitation() {
    if (accountBusy) return;
    setInviteBusy("revoke");
    setInviteError("");
    setInviteMessage("");
    try {
      await api("/invitations", { method: "DELETE" });
      setInvite("");
      setInviteUncertain(false);
      setInviteMessage("Einladung widerrufen.");
    } catch {
      setInviteUncertain(true);
      setInviteError(
        "Widerruf konnte nicht bestätigt werden. Bitte erneut versuchen.",
      );
    } finally {
      setInviteBusy("");
    }
  }
  async function exportPlanning() {
    if (accountBusy) return;
    const startedSession = currentSessionVersion();
    setExportBusy(true);
    setExportError("");
    setExportMessage("");
    try {
      const data = await api<{ format?: string }>("/export");
      if (startedSession !== currentSessionVersion()) return;
      if (data?.format !== "wedding-ss-v1")
        throw new Error(
          "Die Sicherung konnte nicht bestätigt werden. Bitte erneut versuchen.",
        );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "wedding-ss-export.json";
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage(
        "Export erstellt. Bitte prüft die Datei in euren Downloads. Originale separat herunterladen.",
      );
    } catch (error) {
      if (startedSession === currentSessionVersion())
        setExportError((error as Error).message);
    } finally {
      setExportBusy(false);
    }
  }
  return (
    <>
      <Title
        title="Gemeinsam ist es euer Plan."
        description={
          cloudMode
            ? "Zwei private Zugänge. Eine gemeinsame Planung, von überall erreichbar."
            : "Zwei private Zugänge. Eine gemeinsame Planung auf eurem Rechner."
        }
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
                disabled={accountBusy}
                onClick={() => void createInvitation()}
              >
                <Users size={17} />{" "}
                {inviteBusy === "create"
                  ? "Einladung wird erstellt …"
                  : "Zweiten Zugang einladen"}
              </Button>
              {invite && (
                <div className="invitation-box">
                  <label>
                    Einladungscode
                    <input
                      value={invite}
                      readOnly
                      disabled={accountBusy || inviteExpired || inviteUncertain}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <small>
                    Gültig bis {new Date(expires).toLocaleString("de-DE")}. Nur
                    persönlich weitergeben.
                  </small>
                  {inviteExpired && (
                    <ErrorMessage message="Dieser Code ist abgelaufen. Erstelle einen neuen Einladungscode." />
                  )}
                  <Button
                    secondary
                    disabled={accountBusy || inviteExpired || inviteUncertain}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invite);
                        setInviteMessage("Code kopiert.");
                      } catch {
                        setInviteMessage(
                          "Bitte den Code im Feld markieren und kopieren.",
                        );
                      }
                    }}
                  >
                    <Copy /> Code kopieren
                  </Button>
                  {cloudMode && (
                    <Button
                      secondary
                      disabled={accountBusy || inviteExpired || inviteUncertain}
                      onClick={async () => {
                        const link =
                          state.network[0] +
                          "/#invite=" +
                          encodeURIComponent(invite);
                        try {
                          await navigator.clipboard.writeText(link);
                          setInviteMessage("Einladungslink kopiert.");
                        } catch {
                          setInviteMessage(
                            "Bitte die App-Adresse und den Code persönlich weitergeben.",
                          );
                        }
                      }}
                    >
                      <Copy /> Einladungslink kopieren
                    </Button>
                  )}
                  <button
                    className="text-button"
                    disabled={accountBusy}
                    onClick={() => void revokeInvitation()}
                  >
                    {inviteBusy === "revoke"
                      ? "Wird widerrufen …"
                      : "Einladung widerrufen"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <Badge tone="success">Beide Zugänge sind eingerichtet</Badge>
          )}
          <ErrorMessage message={inviteError} />
          {inviteMessage && (
            <p role="status" className="inline-note">
              {inviteMessage}
            </p>
          )}
        </section>
        <section className="panel team-card">
          <Heading title="Auf dem zweiten Gerät öffnen" />
          <p>
            {cloudMode
              ? "Diese Adresse funktioniert auch in einem anderen Netzwerk. Öffnet sie auf dem zweiten Gerät und wählt „Ich habe einen Einladungscode“, oder verwendet direkt den kopierten Einladungslink."
              : "Beide Geräte mit demselben vertrauenswürdigen Netzwerk verbinden. Auf dem zweiten Gerät eine der folgenden Adressen öffnen und „Ich habe einen Einladungscode“ wählen:"}
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
              {cloudMode
                ? "Euer Rechner muss dafür nicht laufen. Die gemeinsame Planung wird verschlüsselt über HTTPS geladen. Aktualisierungen erscheinen etwa alle 15 Sekunden sowie beim erneuten Öffnen der Seite."
                : "Dieser Rechner und die App müssen laufen. Die Adresse kann sich nach einem Netzwerkwechsel ändern. Diese HTTP-Version ist für euer privates Netzwerk gedacht; sie ist nicht öffentlich im Internet bereitgestellt."}
            </span>
          </div>
        </section>
        <section className="panel team-card">
          <Heading title="Daten & Kosten" />
          <Badge tone="success">Keine kostenpflichtigen API-Aufrufe</Badge>
          <p>
            {cloudMode
              ? "PDF-Text und Texterkennung werden auf eurem Gerät verarbeitet. Originale und geprüfte Angaben werden privat in der Cloud gespeichert. OpenAI wird nicht verwendet."
              : "Die Auswertung läuft vollständig lokal. Ein eingerichteter OpenAI-Schlüssel wird von dieser App nicht geladen oder verwendet."}
          </p>
          <p>
            {cloudMode ? (
              "Vercel Hobby und Supabase Free sind ohne kostenpflichtiges Upgrade eingerichtet. Für Originale gilt ein App-Limit von 750 MB. Kostenlose Tarife haben Nutzungsgrenzen; bei längerer Inaktivität kann Supabase pausieren. Sichert eure Planung als JSON und ladet Originale separat herunter."
            ) : (
              <>
                Planungsdaten und Originale liegen im privaten Ordner{" "}
                <code>.wedding-data</code>. Der JSON-Export enthält eure
                Einträge und Auswertungen; Originale separat herunterladen. Ein
                vollständiges Backup erzeugt <code>npm run backup</code>.
              </>
            )}
          </p>
          <Button
            secondary
            onClick={() => void exportPlanning()}
            disabled={accountBusy}
          >
            <DownloadSimple size={18} />{" "}
            {exportBusy
              ? "Export wird erstellt …"
              : "Planung als JSON exportieren"}
          </Button>
          <ErrorMessage message={exportError} />
          {exportBusy && (
            <p role="status" className="inline-note">
              Die Sicherung wird zusammengestellt. Bitte kurz warten …
            </p>
          )}
          {exportMessage && (
            <p role="status" className="inline-note">
              {exportMessage}
            </p>
          )}
        </section>
        <section className="panel team-card">
          <Heading title="Dein Passwort ändern" />
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (accountBusy) return;
              const form = e.currentTarget;
              const values = Object.fromEntries(new FormData(form));
              setPasswordError("");
              setPasswordMessage("");
              setPasswordBusy(true);
              try {
                const data = await api<Auth>("/auth/password", {
                  method: "POST",
                  body: json(values),
                });
                setCsrf(data.csrf);
                form.reset();
                setPasswordMessage(
                  "Passwort geändert. Andere Sitzungen dieses Kontos wurden abgemeldet.",
                );
              } catch (error) {
                setPasswordError((error as Error).message);
              } finally {
                setPasswordBusy(false);
              }
            }}
          >
            <label>
              Bisheriges Passwort
              <input
                name="current"
                disabled={accountBusy}
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Neues Passwort
              <input
                name="password"
                disabled={accountBusy}
                type="password"
                minLength={12}
                maxLength={200}
                required
                autoComplete="new-password"
              />
            </label>
            <ErrorMessage message={passwordError} />
            {passwordMessage && (
              <p role="status" className="inline-note">
                {passwordMessage}
              </p>
            )}
            <Button type="submit" disabled={accountBusy}>
              <LockKey size={17} />{" "}
              {passwordBusy ? "Passwort wird geändert …" : "Passwort ändern"}
            </Button>
          </form>
          <Button secondary onClick={logout} disabled={accountBusy}>
            <SignOut size={17} /> Abmelden
          </Button>
        </section>
      </div>
    </>
  );
}
