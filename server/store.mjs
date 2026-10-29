import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { renamedReference } from "./event-references.mjs";

export const kinds = [
  "tasks",
  "providers",
  "offers",
  "guests",
  "costs",
  "events",
  "settings",
];
export function openStore(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(directory, "wedding.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS invitations(token TEXT PRIMARY KEY, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, updated_by TEXT REFERENCES users(id));
    CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
    CREATE TABLE IF NOT EXISTS record_history(id INTEGER PRIMARY KEY, record_id TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT);
    CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, filename TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', progress TEXT NOT NULL DEFAULT 'Wartet auf Auswertung', analysis TEXT, error TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, user_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_id TEXT, created_at TEXT NOT NULL);
    PRAGMA user_version=1;`);
  const now = () => new Date().toISOString();
  const audit = (user, action, id = null) =>
    db
      .prepare(
        "INSERT INTO audit(user_id,action,entity_id,created_at) VALUES(?,?,?,?)",
      )
      .run(user, action, id, now());
  function create(kind, data, user = null, id = randomUUID()) {
    if (kind === "events") assertEventName(id, data.name);
    const date = now();
    db.prepare(
      "INSERT INTO records(id,kind,data,updated_at,updated_by) VALUES(?,?,?,?,?)",
    ).run(id, kind, JSON.stringify(data), date, user);
    return { id, ...data, version: 1, updatedAt: date, updatedBy: user };
  }
  function row(record) {
    return (
      record && {
        ...JSON.parse(record.data),
        id: record.id,
        version: record.version,
        updatedAt: record.updated_at,
        updatedBy: record.updated_by,
      }
    );
  }
  function list(kind) {
    const records = db
      .prepare("SELECT * FROM records WHERE kind=? ORDER BY updated_at,id")
      .all(kind)
      .map(row);
    if (kind !== "events") return records;
    const names = ["Standesamt", "Tamilische Zeremonie", "Reception"];
    return records
      .map((record) => ({
        ...record,
        position:
          record.position ??
          (names.includes(record.name) ? names.indexOf(record.name) : 99),
      }))
      .sort((a, b) => a.position - b.position);
  }
  function get(kind, id) {
    return row(
      db.prepare("SELECT * FROM records WHERE kind=? AND id=?").get(kind, id),
    );
  }
  function update(kind, id, data, version, user) {
    const date = now();
    db.exec("SAVEPOINT record_update");
    try {
      const previous = kind === "events" ? get(kind, id) : null;
      const renaming =
        previous?.version === version && previous.name !== data.name;
      if (renaming) assertEventName(id, data.name);
      db.prepare(
        "INSERT INTO record_history(record_id,kind,data,version,updated_at,updated_by) SELECT id,kind,data,version,updated_at,updated_by FROM records WHERE id=? AND kind=? AND version=?",
      ).run(id, kind, version);
      const result = db
        .prepare(
          "UPDATE records SET data=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND kind=? AND version=?",
        )
        .run(JSON.stringify(data), date, user, id, kind, version);
      if (result.changes && renaming) {
        const snapshot = db
          .prepare(
            "SELECT id,kind,data,version FROM records WHERE kind IN ('tasks','providers','offers','costs')",
          )
          .all()
          .map((record) => ({ ...record, data: JSON.parse(record.data) }));
        const offers = new Map(
          snapshot
            .filter((record) => record.kind === "offers")
            .map((record) => [record.id, record.data]),
        );
        for (const record of snapshot) {
          const changed = renamedReference(
            record.kind,
            record.data,
            previous.name,
            data.name,
            offers.get(record.data.offerId),
          );
          if (changed !== record.data)
            update(record.kind, record.id, changed, record.version, user);
        }
      }
      db.exec("RELEASE record_update");
      return result.changes ? get(kind, id) : null;
    } catch (error) {
      db.exec("ROLLBACK TO record_update; RELEASE record_update");
      throw error;
    }
  }
  function assertEventName(id, name) {
    if (
      list("events").some(
        (event) =>
          event.id !== id &&
          event.name.trim().toLowerCase() === name.trim().toLowerCase(),
      )
    )
      throw new Error("event_name_taken");
  }
  function documentList() {
    return db
      .prepare(
        "SELECT id,name,mime,size,status,progress,error,created_at,created_by FROM documents ORDER BY created_at DESC",
      )
      .all()
      .map((d) => ({ ...d, createdAt: d.created_at, createdBy: d.created_by }));
  }
  if (!db.prepare("SELECT id FROM records LIMIT 1").get()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      [
        [
          "Foto- und Videoangebote vergleichen",
          "Vorliegende Angebote hinzufügen und prüfen",
          "Foto & Video",
          "Hoch",
        ],
        [
          "Budgetrahmen gemeinsam festlegen",
          "Zielbudget und Obergrenze sind noch offen",
          "Budget",
          "Hoch",
        ],
        [
          "Details zum gebuchten Saal ergänzen",
          "Name, Adresse, Termin und Zahlungsfrist fehlen",
          "Standesamt",
          "Normal",
        ],
        [
          "Gäste je Veranstaltung planen",
          "180–220 Gäste bei der größten Feier als Ausgangspunkt",
          "Gäste",
          "Normal",
        ],
      ].forEach(([title, detail, category, priority]) =>
        create("tasks", {
          title,
          detail,
          category,
          priority,
          done: false,
          owner: "",
          due: "",
          event: "",
        }),
      );
      ["Standesamt", "Tamilische Zeremonie", "Reception"].forEach(
        (name, index) =>
          create("events", {
            name,
            position: index,
            date: "",
            location: "",
            guests: null,
            notes: "",
            traditions: "",
            status: index === 0 ? "Saal gebucht" : "In Planung",
          }),
      );
      create("costs", {
        label: "Saal fürs Standesamt",
        category: "Location",
        event: "Standesamt",
        stage: "Beauftragt",
        amount: 1000,
        paid: 500,
        due: "",
        offerId: null,
        notes: "Vereinbarter Gesamtpreis. Weitere Kosten sind nicht erfasst.",
      });
      create(
        "settings",
        { target: null, limit: null, guests: 200, fixed: null, perGuest: null },
        null,
        "budget",
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return { db, now, audit, create, list, get, update, documentList };
}
