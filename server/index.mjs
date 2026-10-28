import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { networkInterfaces } from "node:os";
import { createServer } from "node:http";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { openStore, kinds } from "./store.mjs";
import { schemas, accountSchema, loginSchema } from "./validation.mjs";
import { extractOffer } from "./extract.mjs";

const production = process.argv.includes("--production");
const directory = resolve(process.env.WEDDING_DATA_DIR || ".wedding-data");
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "0.0.0.0";
const uploads = join(directory, "documents");
mkdirSync(uploads, { recursive: true, mode: 0o700 });
const store = openStore(directory);
const { db } = store;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const scrypt = promisify(scryptCallback);
const token = () => randomBytes(32).toString("base64url");
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const local = (req) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
const allowedHosts = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  ...Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .map((i) => i.address),
]);
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const requestHost = (req.headers.host || "").replace(/:\d+$/, "");
  if (!allowedHosts.has(requestHost))
    return res.status(403).json({ error: "Unzulässiger Hostname." });
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.origin;
    if (
      req.headers["sec-fetch-site"] === "cross-site" ||
      (origin && origin !== `${req.protocol}://${req.headers.host}`)
    )
      return res
        .status(403)
        .json({ error: "Diese Anfrage stammt nicht aus eurer App." });
  }
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: production
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'", "blob:", "data:"],
            frameSrc: ["'self'", "blob:"],
            frameAncestors: ["'self'"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
          },
        }
      : false,
    strictTransportSecurity: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "sameorigin" },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.",
  },
});
app.use(
  [
    "/api/auth/login",
    "/api/auth/setup",
    "/api/auth/accept",
    "/api/auth/password",
  ],
  authLimit,
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Zu viele Anfragen. Bitte kurz warten." },
  }),
);
function session(req, res, next) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("wedding_session="))
    ?.slice(16);
  const row =
    cookie &&
    db
      .prepare(
        "SELECT s.*,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
      )
      .get(hash(cookie), Date.now());
  if (!row) return res.status(401).json({ error: "Bitte anmelden." });
  req.user = { id: row.user_id, name: row.name, email: row.email };
  req.session = row;
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers["x-csrf-token"] !== row.csrf
  )
    return res.status(403).json({
      error: "Sicherheitsprüfung fehlgeschlagen. Bitte die Seite neu laden.",
    });
  next();
}
function startSession(req, res, user) {
  const raw = token(),
    csrf = token();
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare(
    "INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)",
  ).run(hash(raw), user.id, csrf, Date.now() + 7 * 24 * 3600000);
  res.cookie("wedding_session", raw, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.secure,
    maxAge: 7 * 24 * 3600000,
    path: "/",
  });
  res.json({ user: safeUser(user), csrf });
}
async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${Buffer.from(await scrypt(password, salt, 64)).toString("hex")}`;
}
async function passwordMatches(password, stored) {
  const [salt, value] = stored.split(":");
  const candidate = Buffer.from(await scrypt(password, salt, 64));
  return timingSafeEqual(candidate, Buffer.from(value, "hex"));
}
app.get("/api/auth/status", (req, res) =>
  res.json({
    setupRequired: !db.prepare("SELECT id FROM users LIMIT 1").get(),
    canSetup: local(req),
    paidApiCalls: false,
  }),
);
app.post(
  "/api/auth/setup",
  asyncRoute(async (req, res) => {
    if (!local(req))
      return res.status(403).json({
        error:
          "Das erste Konto muss direkt auf diesem Rechner eingerichtet werden.",
      });
    const data = accountSchema.parse(req.body);
    const password = await passwordHash(data.password);
    // Check again after async password hashing: only one first account can win.
    if (db.prepare("SELECT id FROM users LIMIT 1").get())
      return res
        .status(409)
        .json({ error: "Das erste Konto existiert bereits. Bitte anmelden." });
    const user = { id: randomUUID(), ...data };
    db.prepare(
      "INSERT INTO users(id,name,email,password,created_at) VALUES(?,?,?,?,?)",
    ).run(user.id, data.name, data.email, password, store.now());
    store.audit(user.id, "account.created");
    startSession(req, res, user);
  }),
);
app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(data.email);
    const dummy = "00000000000000000000000000000000:" + "0".repeat(128);
    const valid = await passwordMatches(data.password, user?.password || dummy);
    if (!user || !valid)
      return res
        .status(401)
        .json({ error: "E-Mail oder Passwort stimmt nicht." });
    startSession(req, res, user);
  }),
);
app.post(
  "/api/auth/accept",
  asyncRoute(async (req, res) => {
    const data = accountSchema
      .extend({ invitation: z.string().min(30).max(100) })
      .parse(req.body);
    const password = await passwordHash(data.password);
    db.exec("BEGIN IMMEDIATE");
    try {
      const invitation = db
        .prepare(
          "SELECT * FROM invitations WHERE token=? AND used=0 AND expires>?",
        )
        .get(hash(data.invitation), Date.now());
      if (
        !invitation ||
        Number(db.prepare("SELECT COUNT(*) AS n FROM users").get().n) >= 2
      ) {
        db.exec("ROLLBACK");
        return res.status(403).json({
          error:
            "Einladung ungültig, abgelaufen oder beide Plätze sind belegt.",
        });
      }
      const user = { id: randomUUID(), ...data };
      db.prepare(
        "INSERT INTO users(id,name,email,password,created_at) VALUES(?,?,?,?,?)",
      ).run(user.id, data.name, data.email, password, store.now());
      db.prepare("UPDATE invitations SET used=1 WHERE token=?").run(
        hash(data.invitation),
      );
      db.exec("COMMIT");
      store.audit(user.id, "invitation.accepted");
      startSession(req, res, user);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }),
);
app.get("/api/auth/me", session, (req, res) =>
  res.json({ user: req.user, csrf: req.session.csrf }),
);
app.post("/api/auth/logout", session, (req, res) => {
  db.prepare("DELETE FROM sessions WHERE token=?").run(req.session.token);
  res.clearCookie("wedding_session", { path: "/" });
  res.json({ ok: true });
});
app.post(
  "/api/auth/password",
  session,
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        current: z.string().max(200),
        password: z.string().min(12).max(200),
      })
      .parse(req.body);
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    if (!(await passwordMatches(data.current, user.password)))
      return res
        .status(403)
        .json({ error: "Das bisherige Passwort stimmt nicht." });
    const password = await passwordHash(data.password);
    db.prepare("UPDATE users SET password=? WHERE id=?").run(
      password,
      req.user.id,
    );
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(req.user.id);
    store.audit(req.user.id, "password.changed");
    startSession(req, res, user);
  }),
);
app.post("/api/invitations", session, (req, res) => {
  if (Number(db.prepare("SELECT COUNT(*) AS n FROM users").get().n) >= 2)
    return res
      .status(409)
      .json({ error: "Beide Zugänge sind bereits eingerichtet." });
  const raw = token();
  db.prepare("DELETE FROM invitations").run();
  const expires = Date.now() + 48 * 3600000;
  db.prepare("INSERT INTO invitations(token,expires) VALUES(?,?)").run(
    hash(raw),
    expires,
  );
  store.audit(req.user.id, "invitation.created");
  res.json({ invitation: raw, expires });
});
app.delete("/api/invitations", session, (req, res) => {
  db.prepare("DELETE FROM invitations").run();
  res.json({ ok: true });
});
const network = () =>
  Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && !i.internal && i.family === "IPv4")
    .map((i) => `http://${i.address}:${port}`);
app.get("/api/state", session, (req, res) =>
  res.json({
    ...Object.fromEntries(kinds.map((kind) => [kind, store.list(kind)])),
    documents: store.documentList(),
    members: db
      .prepare("SELECT id,name,email FROM users ORDER BY created_at")
      .all(),
    network: network(),
    paidApiCalls: false,
  }),
);
function clean(kind, data) {
  const schema = schemas[kind];
  if (!schema) throw new Error("UnknownKind");
  return schema.parse(data);
}
function relations(data) {
  if (
    data.documentId &&
    !db.prepare("SELECT id FROM documents WHERE id=?").get(data.documentId)
  )
    return false;
  if (data.providerId && !store.get("providers", data.providerId)) return false;
  return true;
}
app.post("/api/records/:kind", session, (req, res) => {
  const { kind } = req.params;
  if (!kinds.includes(kind) || kind === "settings")
    return res.status(400).json({ error: "Unbekannter Bereich." });
  const data = clean(kind, req.body);
  if (!relations(data))
    return res.status(400).json({
      error: "Zugeordnetes Dokument oder Dienstleister existiert nicht.",
    });
  if (kind === "offers" && data.status === "Gebucht")
    return res.status(400).json({
      error:
        "Buchungen bitte ausdrücklich mit dem bestätigten Gesamtbetrag erfassen.",
    });
  const record = store.create(kind, data, req.user.id);
  store.audit(req.user.id, `${kind}.created`, record.id);
  res.status(201).json(record);
});
app.put("/api/records/:kind/:id", session, (req, res) => {
  const { kind, id } = req.params;
  if (!kinds.includes(kind))
    return res.status(400).json({ error: "Unbekannter Bereich." });
  const version = z.number().int().positive().parse(req.body.version);
  const data = clean(kind, req.body);
  if (!relations(data))
    return res.status(400).json({ error: "Ungültige Zuordnung." });
  if (kind === "offers") {
    const booked = store.list("costs").some((cost) => cost.offerId === id);
    if ((data.status === "Gebucht") !== booked)
      return res.status(409).json({
        error:
          "Der Buchungsstatus gehört zur verknüpften Budgetposition. Bitte zuerst die Buchung bearbeiten.",
      });
  }
  const record = store.update(kind, id, data, version, req.user.id);
  if (!record)
    return res.status(409).json({
      error:
        "Dieser Eintrag wurde inzwischen geändert. Bitte die aktuelle Fassung laden und eure Änderung erneut eintragen.",
    });
  store.audit(req.user.id, `${kind}.updated`, id);
  res.json(record);
});
app.delete("/api/records/:kind/:id", session, (req, res) => {
  const { kind, id } = req.params;
  if (!kinds.includes(kind) || ["settings", "events"].includes(kind))
    return res
      .status(400)
      .json({ error: "Dieser Bereich kann nicht gelöscht werden." });
  const version = z.number().int().positive().parse(req.body.version);
  if (
    kind === "providers" &&
    store.list("offers").some((o) => o.providerId === id)
  )
    return res
      .status(409)
      .json({ error: "Dieser Dienstleister ist mit Angeboten verknüpft." });
  if (kind === "offers" && store.list("costs").some((c) => c.offerId === id))
    return res.status(409).json({
      error:
        "Zu diesem Angebot existiert eine Buchung. Bitte die Buchung zuerst bearbeiten.",
    });
  const result = db
    .prepare("DELETE FROM records WHERE kind=? AND id=? AND version=?")
    .run(kind, id, version);
  if (!result.changes)
    return res.status(409).json({
      error: "Eintrag inzwischen geändert oder gelöscht. Bitte neu laden.",
    });
  if (kind === "costs") {
    for (const offer of store.list("offers"))
      if (
        offer.status === "Gebucht" &&
        !store.list("costs").some((cost) => cost.offerId === offer.id)
      )
        store.update(
          "offers",
          offer.id,
          clean("offers", { ...offer, status: "Geprüft" }),
          offer.version,
          req.user.id,
        );
  }
  store.audit(req.user.id, `${kind}.deleted`, id);
  res.json({ ok: true });
});
app.post("/api/offers/:id/book", session, (req, res) => {
  const data = z
    .object({
      amount: z.number().finite().min(0).max(100000000),
      paid: z.number().finite().min(0),
      due: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
      version: z.number().int().positive(),
    })
    .parse(req.body);
  const offer = store.get("offers", req.params.id);
  if (!offer || offer.version !== data.version)
    return res
      .status(409)
      .json({ error: "Angebot inzwischen geändert. Bitte neu laden." });
  if (data.paid > data.amount)
    return res.status(400).json({
      error:
        "Anzahlung darf den bestätigten Buchungsbetrag nicht überschreiten.",
    });
  if (store.list("costs").some((c) => c.offerId === offer.id))
    return res
      .status(409)
      .json({ error: "Dieses Angebot ist bereits im Budget gebucht." });
  db.exec("BEGIN IMMEDIATE");
  try {
    const cost = store.create(
      "costs",
      {
        label: offer.name,
        category: offer.category,
        event: offer.events.join(" + "),
        stage: "Beauftragt",
        amount: data.amount,
        paid: data.paid,
        due: data.due,
        offerId: offer.id,
        notes:
          "Buchungsbetrag manuell bestätigt (EUR). Gemeinsame Kosten einmal erfasst.",
      },
      req.user.id,
    );
    store.update(
      "offers",
      offer.id,
      clean("offers", { ...offer, status: "Gebucht" }),
      offer.version,
      req.user.id,
    );
    store.audit(req.user.id, "offer.booked", offer.id);
    db.exec("COMMIT");
    res.status(201).json(cost);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 0 },
});
function detect(buffer, name) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf" && buffer.subarray(0, 5).toString() === "%PDF-")
    return "application/pdf";
  if (
    ext === "png" &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    ["jpg", "jpeg"].includes(ext) &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  )
    return "image/jpeg";
  if (
    ext === "webp" &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (ext === "txt" && !buffer.includes(0) && buffer.length <= 1000000) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      return "text/plain";
    } catch {}
  }
  return null;
}
let running = false;
function processNext() {
  if (running) return;
  const doc = db
    .prepare(
      "SELECT * FROM documents WHERE status='queued' ORDER BY created_at LIMIT 1",
    )
    .get();
  if (!doc) return;
  running = true;
  db.prepare(
    "UPDATE documents SET status='running',progress='Auswertung wird gestartet',error=NULL WHERE id=?",
  ).run(doc.id);
  const worker = new Worker(new URL("./document-worker.mjs", import.meta.url), {
    workerData: {
      directory,
      path: join(uploads, doc.filename),
      mime: doc.mime,
    },
    resourceLimits: { maxOldGenerationSizeMb: 512 },
  });
  let finished = false;
  function finish(error) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (error)
      db.prepare(
        "UPDATE documents SET status='error',error=?,progress='Manuelle Erfassung möglich' WHERE id=?",
      ).run(error, doc.id);
    running = false;
    void worker.terminate();
    setTimeout(processNext, 0);
  }
  const timer = setTimeout(
    () =>
      finish(
        "Die Auswertung hat das Zeitlimit von 3 Minuten erreicht. Original gespeichert; bitte manuell ergänzen oder das Dokument aufteilen.",
      ),
    180000,
  );
  worker.on("message", (message) => {
    if (finished) return;
    if (message.type === "progress")
      db.prepare("UPDATE documents SET progress=? WHERE id=?").run(
        message.message,
        doc.id,
      );
    if (message.type === "done") {
      db.prepare(
        "UPDATE documents SET status='complete',analysis=?,progress='Prüfbereit' WHERE id=?",
      ).run(JSON.stringify(message.analysis), doc.id);
      finish();
    }
    if (message.type === "error") finish(message.message);
  });
  worker.on("error", () =>
    finish(
      "Die lokale Auswertung wurde unterbrochen. Bitte erneut versuchen oder manuell erfassen.",
    ),
  );
  worker.on("exit", () => {
    if (!finished) finish("Die lokale Auswertung wurde unterbrochen.");
  });
}
db.prepare("UPDATE documents SET status='queued' WHERE status='running'").run();
app.post(
  "/api/documents",
  session,
  rateLimit({
    windowMs: 3600000,
    limit: 40,
    message: { error: "Uploadlimit erreicht. Bitte später erneut versuchen." },
  }),
  upload.single("file"),
  (req, res) => {
    if (!req.file?.buffer?.length)
      return res.status(400).json({ error: "Bitte eine Datei auswählen." });
    const name = req.file.originalname
      .replace(/[\\/\x00-\x1f]/g, "_")
      .slice(0, 200);
    const mime = detect(req.file.buffer, name);
    if (!mime)
      return res.status(415).json({
        error:
          "Dateiinhalt oder Format nicht unterstützt. Bitte echtes PDF, PNG, JPG, WebP oder UTF-8-TXT verwenden. Word- und E-Mail-Dateien als PDF exportieren oder Text einfügen.",
      });
    const size = Number(
      db.prepare("SELECT COALESCE(SUM(size),0) AS n FROM documents").get().n,
    );
    if (size + req.file.size > 2 * 1024 ** 3)
      return res.status(413).json({
        error:
          "Der lokale Dokumentenspeicher hat 2 GB erreicht. Bitte zuerst ein Backup erstellen und den Speicher verwalten.",
      });
    const id = randomUUID(),
      filename =
        id +
        "." +
        {
          "application/pdf": "pdf",
          "image/png": "png",
          "image/jpeg": "jpg",
          "image/webp": "webp",
          "text/plain": "txt",
        }[mime];
    writeFileSync(join(uploads, filename), req.file.buffer, {
      mode: 0o600,
      flag: "wx",
    });
    try {
      db.prepare(
        "INSERT INTO documents(id,name,mime,size,filename,created_at,created_by) VALUES(?,?,?,?,?,?,?)",
      ).run(id, name, mime, req.file.size, filename, store.now(), req.user.id);
    } catch (error) {
      unlinkSync(join(uploads, filename));
      throw error;
    }
    store.audit(req.user.id, "document.uploaded", id);
    res.status(202).json({ id });
    processNext();
  },
);
app.post("/api/documents/text", session, (req, res) => {
  const data = z
    .object({
      text: z.string().trim().min(1).max(200000),
      name: z
        .string()
        .trim()
        .min(1)
        .max(190)
        .default("Eingefügter Angebotstext"),
    })
    .parse(req.body);
  if (
    Number(
      db.prepare("SELECT COALESCE(SUM(size),0) AS n FROM documents").get().n,
    ) +
      Buffer.byteLength(data.text) >
    2 * 1024 ** 3
  )
    return res.status(413).json({
      error:
        "Der lokale Dokumentenspeicher hat 2 GB erreicht. Bitte zuerst sichern und nicht mehr benötigte Unterlagen löschen.",
    });
  const id = randomUUID(),
    filename = id + ".txt";
  const analysis = extractOffer([
    { page: 1, text: data.text, method: "Eingefügter Text" },
  ]);
  writeFileSync(join(uploads, filename), data.text, {
    mode: 0o600,
    flag: "wx",
  });
  try {
    db.prepare(
      "INSERT INTO documents(id,name,mime,size,filename,status,progress,analysis,created_at,created_by) VALUES(?,?,?,?,?,'complete','Prüfbereit',?,?,?)",
    ).run(
      id,
      data.name + ".txt",
      "text/plain",
      Buffer.byteLength(data.text),
      filename,
      JSON.stringify(analysis),
      store.now(),
      req.user.id,
    );
  } catch (error) {
    unlinkSync(join(uploads, filename));
    throw error;
  }
  store.audit(req.user.id, "document.text_saved", id);
  res.status(201).json({ id });
});
app.get("/api/documents/:id", session, (req, res) => {
  const doc = db
    .prepare("SELECT * FROM documents WHERE id=?")
    .get(req.params.id);
  if (!doc) return res.status(404).json({ error: "Dokument nicht gefunden." });
  const { filename, analysis, ...metadata } = doc;
  res.json({ ...metadata, analysis: analysis ? JSON.parse(analysis) : null });
});
app.get("/api/documents/:id/file", session, (req, res) => {
  const doc = db
    .prepare("SELECT * FROM documents WHERE id=?")
    .get(req.params.id);
  if (!doc || !existsSync(join(uploads, doc.filename)))
    return res.status(404).json({ error: "Original nicht gefunden." });
  res
    .set("Content-Type", doc.mime)
    .set(
      "Content-Disposition",
      `${req.query.download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
    )
    .sendFile(join(uploads, doc.filename), { dotfiles: "allow" });
});
app.post("/api/documents/:id/retry", session, (req, res) => {
  const changed = db
    .prepare(
      "UPDATE documents SET status='queued',error=NULL,progress='Wartet auf Auswertung' WHERE id=? AND status='error'",
    )
    .run(req.params.id);
  if (!changed.changes)
    return res.status(409).json({
      error: "Nur fehlgeschlagene Auswertungen können erneut gestartet werden.",
    });
  res.json({ ok: true });
  processNext();
});
app.delete("/api/documents/:id", session, (req, res) => {
  const doc = db
    .prepare("SELECT * FROM documents WHERE id=?")
    .get(req.params.id);
  if (!doc) return res.status(404).json({ error: "Dokument nicht gefunden." });
  if (store.list("offers").some((offer) => offer.documentId === doc.id))
    return res.status(409).json({
      error:
        "Das Dokument ist noch mit einem Angebot verknüpft. Bitte zuerst das Angebot löschen.",
    });
  if (["running", "queued"].includes(doc.status))
    return res
      .status(409)
      .json({ error: "Bitte die laufende Auswertung abwarten." });
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM documents WHERE id=?").run(doc.id);
    if (existsSync(join(uploads, doc.filename)))
      unlinkSync(join(uploads, doc.filename));
    store.audit(req.user.id, "document.deleted", doc.id);
    db.exec("COMMIT");
    res.json({ ok: true });
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
});
app.get("/api/export", session, (req, res) => {
  const data = {
    format: "wedding-ss-v1",
    exportedAt: store.now(),
    ...Object.fromEntries(kinds.map((kind) => [kind, store.list(kind)])),
    history: db
      .prepare(
        "SELECT record_id,kind,data,version,updated_at FROM record_history ORDER BY id",
      )
      .all()
      .map((record) => ({ ...record, data: JSON.parse(record.data) })),
    documents: db
      .prepare(
        "SELECT id,name,mime,size,status,analysis,created_at FROM documents ORDER BY created_at",
      )
      .all()
      .map((d) => ({
        ...d,
        analysis: d.analysis ? JSON.parse(d.analysis) : null,
      })),
    originalFiles:
      "Originale separat im Dokumentenbereich herunterladen. Vollständiges Backup: npm run backup.",
  };
  res.attachment("wedding-ss-export.json").json(data);
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Unbekannter API-Endpunkt." }),
);
app.use((error, req, res, next) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({
      error: "Bitte die Eingaben prüfen.",
      fields: error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  if (error instanceof multer.MulterError)
    return res
      .status(413)
      .json({ error: "Upload nicht möglich. Maximal eine Datei mit 15 MB." });
  if (error.code?.startsWith("SQLITE_CONSTRAINT"))
    return res.status(409).json({
      error: "Dieser Eintrag existiert bereits oder ist noch verknüpft.",
    });
  console.error("Serverfehler:", error.name, error.code || "internal");
  res.status(500).json({
    error:
      "Die Aktion konnte nicht gespeichert werden. Bitte erneut versuchen.",
  });
});
app.use((req, res, next) => {
  if (
    /^\/(?:\.wedding-data|\.wedding-backups|server|tests)(?:\/|$)/i.test(
      req.path,
    )
  )
    return res.sendStatus(404);
  next();
});
const http = createServer(app);
if (production) {
  app.use(express.static(resolve("dist"), { dotfiles: "deny", index: false }));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer: createVite } = await import("vite");
  const vite = await createVite({
    server: {
      middlewareMode: true,
      hmr: { server: http },
      watch: {
        ignored: [
          "**/.wedding-data/**",
          "**/.wedding-backups/**",
          "**/.test-data*/**",
        ],
      },
      fs: {
        strict: true,
        deny: [
          "**/.env*",
          "**/.wedding-data/**",
          "**/.wedding-backups/**",
          "**/.test-data*/**",
          "**/*.sqlite*",
          "**/*.pem",
        ],
      },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
http.listen(port, host, () => {
  console.log(
    `Wedding SS: http://127.0.0.1:${port} · lokale Speicherung · externe KI-Aufrufe deaktiviert`,
  );
  processNext();
});
function shutdown() {
  http.close();
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
