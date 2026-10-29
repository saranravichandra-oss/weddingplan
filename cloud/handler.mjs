import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { accountSchema, loginSchema, schemas } from "../server/validation.mjs";
import { extractOffer } from "../server/extract.mjs";
import { guestImportSchema } from "../server/guest-import.mjs";

const kinds = Object.keys(schemas),
  bucketName = "wedding-documents";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const now = () => new Date().toISOString();
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
const record = (row) =>
  row && {
    ...row.data,
    id: row.id,
    version: row.version,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
async function query(operation) {
  const { data, error } = await operation;
  if (error) {
    const errorCode = error.message || "";
    if (/event_name_taken/.test(errorCode))
      fail(
        409,
        "Diesen Veranstaltungsnamen gibt es bereits. Bitte einen anderen Namen wählen.",
      );
    if (
      /conflict|already_booked|booking_state|linked_record|invitation_invalid|storage_limit|migration_closed|protected_record|not_found/.test(
        errorCode,
      )
    )
      fail(
        409,
        /storage_limit/.test(errorCode)
          ? "Der kostenlose Dokumentenspeicher ist voll (750 MB App-Limit). Bitte zuerst sichern und nicht mehr benötigte Unterlagen löschen."
          : "Eintrag inzwischen geändert, bereits gebucht oder noch verknüpft. Bitte die aktuelle Fassung laden.",
      );
    if (error.code === "23505") fail(409, "Dieser Eintrag existiert bereits.");
    throw new Error("DatabaseError");
  }
  return data;
}
async function body(request) {
  const text = await request.text();
  if (text.length > 2500000)
    fail(
      413,
      "Die Anfrage ist zu groß. Bitte ein kleineres Dokument verwenden.",
    );
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    fail(400, "Ungültige Anfrage.");
  }
}
function validFile(bytes, name) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf" && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-")
    return "application/pdf";
  if (
    ext === "png" &&
    bytes
      .slice(0, 8)
      .every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i])
  )
    return "image/png";
  if (
    ["jpg", "jpeg"].includes(ext) &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    ext === "webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  if (ext === "txt" && !bytes.includes(0) && bytes.length <= 1000000) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return "text/plain";
    } catch {}
  }
  return null;
}
function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function passwordMatches(password, stored) {
  const [salt, value] = stored.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(value, "hex"),
  );
}

export function createCloudHandler(db) {
  const table = (name) => db.from("wedding_" + name);
  const allRows = async (name, columns = "*", filters = {}) => {
    const rows = [];
    let cursor, expected;
    for (;;) {
      let operation = table(name).select(
        columns,
        cursor === undefined ? { count: "exact" } : undefined,
      );
      for (const [column, value] of Object.entries(filters))
        operation = operation.eq(column, value);
      if (cursor !== undefined) operation = operation.gt("id", cursor);
      const result = await operation.order("id").limit(500);
      const page = await query(result);
      if (cursor === undefined && Number.isInteger(result.count))
        expected = result.count;
      if (!Array.isArray(page)) throw new Error("DatabaseError");
      if (!page.length) {
        if (expected !== undefined && rows.length < expected)
          throw new Error("DatabaseError");
        return rows;
      }
      rows.push(...page);
      if (expected !== undefined && rows.length >= expected) return rows;
      const next = page.at(-1).id;
      if (next === undefined || next === cursor)
        throw new Error("DatabaseError");
      cursor = next;
    }
  };
  const list = async (kind) => {
    const rows = await allRows("records", "*", { kind });
    rows.sort(
      (a, b) =>
        a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id),
    );
    const values = rows.map(record);
    return kind === "events"
      ? values.sort(
          (a, b) =>
            (a.position ??
              ["Standesamt", "Tamilische Zeremonie", "Reception"].indexOf(
                a.name,
              )) -
            (b.position ??
              ["Standesamt", "Tamilische Zeremonie", "Reception"].indexOf(
                b.name,
              )),
        )
      : values;
  };
  const get = async (kind, id) =>
    record(
      await query(
        table("records")
          .select("*")
          .eq("kind", kind)
          .eq("id", id)
          .maybeSingle(),
      ),
    );
  const document = async (id) => {
    const doc = await query(
      table("documents").select("*").eq("id", id).maybeSingle(),
    );
    if (!doc) fail(404, "Dokument nicht gefunden.");
    return doc;
  };
  const limit = async (key, window, maximum) => {
    if (
      !(await query(
        db.rpc("wedding_limit", {
          p_key: hash(key),
          p_window: window,
          p_limit: maximum,
        }),
      ))
    )
      fail(429, "Zu viele Versuche. Bitte später erneut versuchen.");
  };
  return async function handle(request) {
    let cookie;
    const response = (value, status = 200, extra = {}) =>
      new Response(JSON.stringify(value), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          ...(cookie ? { "Set-Cookie": cookie } : {}),
          ...extra,
        },
      });
    try {
      const route =
        request.headers.get("x-wedding-path") ||
        new URL(request.url).pathname.replace(
          /^\/functions\/v1\/wedding-api/,
          "",
        ) ||
        "/";
      const url = new URL(route, "https://wedding.invalid");
      const path = url.pathname;
      const method = request.method;
      const ip =
        request.headers.get("x-wedding-client-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        "unknown";
      if (
        ["/migration", "/migration-file", "/migration-finish"].includes(path) &&
        method === "POST"
      ) {
        const closed = await query(
          table("config")
            .select("value")
            .eq("key", "migration_done")
            .maybeSingle(),
        );
        if (closed && path === "/migration")
          fail(403, "Die einmalige Migration ist abgeschlossen.");
        const publicKey = await query(
          table("config")
            .select("value")
            .eq("key", "migration_public_key")
            .maybeSingle(),
        );
        if (!publicKey) fail(403, "Die Migration ist geschlossen.");
        const text = await request.text();
        if (text.length > (path === "/migration-file" ? 22000000 : 2000000))
          fail(413, "Migration zu groß.");
        const signature = request.headers.get("x-wedding-signature") || "";
        const key = await crypto.subtle.importKey(
          "jwk",
          publicKey.value,
          { name: "Ed25519" },
          false,
          ["verify"],
        );
        if (
          !(await crypto.subtle.verify(
            "Ed25519",
            key,
            Buffer.from(signature, "base64url"),
            new TextEncoder().encode(text),
          ))
        )
          fail(403, "Ungültige Migrationssignatur.");
        const payload = JSON.parse(text);
        if (path === "/migration-file") {
          if (!closed) fail(409, "Zuerst den Datenstand übernehmen.");
          const doc = await document(payload.id);
          if (doc.uploaded) return response({ ok: true });
          const bytes = Buffer.from(payload.base64 || "", "base64");
          if (
            bytes.length !== doc.size ||
            validFile(bytes, doc.name) !== doc.mime
          )
            fail(
              415,
              "Originaldatei stimmt nicht mit dem lokalen Datenstand überein.",
            );
          const storage = db.storage.from(bucketName);
          // A signed migration can resume an interrupted transfer of this one file.
          await query(
            storage.upload(doc.filename, bytes, {
              contentType: doc.mime,
              upsert: true,
            }),
          );
          await query(
            table("documents").update({ uploaded: true }).eq("id", doc.id),
          );
          return response({ ok: true });
        }
        if (path === "/migration-finish") {
          if (
            !closed ||
            (await query(table("documents").select("id").eq("uploaded", false)))
              .length
          )
            fail(409, "Es fehlen noch Originaldateien.");
          await query(
            table("config").delete().eq("key", "migration_public_key"),
          );
          return response({ ok: true });
        }
        if (
          !Array.isArray(payload.users) ||
          payload.users.length < 1 ||
          payload.users.length > 2 ||
          !Array.isArray(payload.records)
        )
          fail(400, "Ungültiger lokaler Datenstand.");
        await query(db.rpc("wedding_migrate", { p_payload: payload }));
        return response({
          ok: true,
          users: payload.users.length,
          records: payload.records.length,
        });
      }
      const origin = request.headers.get("origin");
      const publicOrigin = request.headers.get("x-wedding-public-origin");
      const config = await query(
        table("config")
          .select("value")
          .eq("key", "allowed_origins")
          .maybeSingle(),
      );
      const allowed = config?.value || [];
      if (
        !publicOrigin ||
        !allowed.includes(publicOrigin) ||
        (origin && origin !== publicOrigin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        fail(403, "Diese Anfrage stammt nicht aus eurer App.");
      if (path === "/auth/status")
        return response({
          setupRequired: false,
          canSetup: false,
          paidApiCalls: false,
          hosting: "cloud",
        });
      await limit("global:" + ip, 60000, 300);
      const data = ["POST", "PUT", "DELETE", "PATCH"].includes(method)
        ? await body(request)
        : {};
      const startSession = async (user) => {
        const raw = token(),
          csrf = token();
        await query(table("sessions").delete().lt("expires", Date.now()));
        await query(
          table("sessions").insert({
            token: hash(raw),
            user_id: user.id,
            csrf,
            expires: Date.now() + 7 * 86400000,
          }),
        );
        cookie = `wedding_session=${raw}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;
        return response({ user: safeUser(user), csrf });
      };
      if (path === "/auth/setup")
        fail(403, "Euer bestehender Zugang wurde übernommen. Bitte anmelden.");
      if (path === "/auth/login" && method === "POST") {
        const login = loginSchema.parse(data);
        await limit("login:" + login.email, 900000, 20);
        const user = await query(
          table("users").select("*").eq("email", login.email).maybeSingle(),
        );
        const valid = passwordMatches(
          login.password,
          user?.password ||
            "00000000000000000000000000000000:" + "0".repeat(128),
        );
        if (!user || !valid) fail(401, "E-Mail oder Passwort stimmt nicht.");
        return await startSession(user);
      }
      if (path === "/auth/accept" && method === "POST") {
        await limit("join:" + ip, 900000, 10);
        const input = accountSchema
          .extend({ invitation: z.string().min(30).max(100) })
          .parse(data);
        const user = await query(
          db.rpc("wedding_join", {
            p_token: hash(input.invitation),
            p_id: randomUUID(),
            p_name: input.name,
            p_email: input.email,
            p_password: passwordHash(input.password),
          }),
        );
        return await startSession(user);
      }
      const raw = request.headers
        .get("cookie")
        ?.split(";")
        .map((x) => x.trim())
        .find((x) => x.startsWith("wedding_session="))
        ?.slice(16);
      const session =
        raw &&
        (await query(
          table("sessions")
            .select("*")
            .eq("token", hash(raw))
            .gt("expires", Date.now())
            .maybeSingle(),
        ));
      if (!session) fail(401, "Bitte anmelden.");
      const user = await query(
        table("users")
          .select("id,name,email,password")
          .eq("id", session.user_id)
          .single(),
      );
      if (
        !["GET", "HEAD"].includes(method) &&
        request.headers.get("x-csrf-token") !== session.csrf
      )
        fail(403, "Sicherheitsprüfung fehlgeschlagen. Bitte neu laden.");
      if (path === "/auth/me")
        return response({ user: safeUser(user), csrf: session.csrf });
      if (path === "/auth/logout" && method === "POST") {
        await query(table("sessions").delete().eq("token", session.token));
        cookie =
          "wedding_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
        return response({ ok: true });
      }
      if (path === "/auth/password" && method === "POST") {
        const input = z
          .object({
            current: z.string().max(200),
            password: z.string().min(12).max(200),
          })
          .parse(data);
        if (!passwordMatches(input.current, user.password))
          fail(403, "Das bisherige Passwort stimmt nicht.");
        await query(
          table("users")
            .update({ password: passwordHash(input.password) })
            .eq("id", user.id),
        );
        await query(table("sessions").delete().eq("user_id", user.id));
        return await startSession(user);
      }
      if (path === "/state") {
        const result = Object.fromEntries(
          await Promise.all(
            kinds.map(async (kind) => [kind, await list(kind)]),
          ),
        );
        const docs = await allRows(
          "documents",
          "id,name,mime,size,status,progress,error,created_at,created_by,uploaded",
        );
        docs.sort(
          (a, b) =>
            b.created_at.localeCompare(a.created_at) ||
            a.id.localeCompare(b.id),
        );
        const members = await query(
          table("users").select("id,name,email").order("created_at"),
        );
        return response({
          ...result,
          documents: docs.map((d) => ({
            ...d,
            createdAt: d.created_at,
            createdBy: d.created_by,
          })),
          members,
          network: [publicOrigin],
          hosting: "cloud",
          storageLimitMB: 750,
          paidApiCalls: false,
        });
      }
      if (path === "/invitations" && method === "POST") {
        if ((await query(table("users").select("id"))).length >= 2)
          fail(409, "Beide Zugänge sind bereits eingerichtet.");
        await query(table("invitations").delete().neq("token", ""));
        const raw = token(),
          expires = Date.now() + 48 * 3600000;
        await query(table("invitations").insert({ token: hash(raw), expires }));
        return response({ invitation: raw, expires });
      }
      if (path === "/invitations" && method === "DELETE") {
        await query(table("invitations").delete().neq("token", ""));
        return response({ ok: true });
      }
      if (path === "/guests/import" && method === "POST") {
        const input = guestImportSchema.parse(data);
        const ids = new Set((await list("events")).map((event) => event.id));
        if (
          input.rows.some((row) =>
            Object.keys(row.guest.attendance).some((id) => !ids.has(id)),
          )
        )
          fail(
            400,
            "Die Veranstaltungszuordnung ist nicht mehr aktuell. Bitte die Vorschau neu laden.",
          );
        const result = await query(
          db.rpc("wedding_import_guests", {
            p_batch: input.batchId,
            p_rows: input.rows,
            p_user: user.id,
          }),
        );
        return response(result, 201);
      }
      const entity = path.match(/^\/records\/([a-z]+)(?:\/([^/]+))?$/);
      if (entity && ["POST", "PUT", "DELETE"].includes(method)) {
        const [, kind, id] = entity;
        if (!schemas[kind] || (method === "POST" && kind === "settings"))
          fail(400, "Unbekannter Bereich.");
        const payload = method === "DELETE" ? {} : schemas[kind].parse(data);
        const version =
          method === "POST"
            ? null
            : z.number().int().positive().parse(data.version);
        const result = await query(
          db.rpc("wedding_write", {
            p_kind: kind,
            p_id: id || randomUUID(),
            p_data: payload,
            p_version: version,
            p_user: user.id,
            p_delete: method === "DELETE",
          }),
        );
        return response(
          method === "DELETE" ? result : record(result),
          method === "POST" ? 201 : 200,
        );
      }
      const booking = path.match(/^\/offers\/([^/]+)\/book$/);
      if (booking && method === "POST") {
        const input = z
          .object({
            amount: z.number().finite().min(0).max(100000000),
            paid: z.number().finite().min(0),
            due: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
            version: z.number().int().positive(),
          })
          .parse(data);
        return response(
          record(
            await query(
              db.rpc("wedding_book", {
                p_offer: booking[1],
                p_version: input.version,
                p_user: user.id,
                p_amount: input.amount,
                p_paid: input.paid,
                p_due: input.due,
                p_id: randomUUID(),
              }),
            ),
          ),
          201,
        );
      }
      const storage = db.storage.from(bucketName);
      if (path === "/documents/upload-ticket" && method === "POST") {
        await limit("upload:" + user.id, 3600000, 40);
        const input = z
          .object({
            name: z.string().trim().min(1).max(200),
            mime: z.enum([
              "application/pdf",
              "image/png",
              "image/jpeg",
              "image/webp",
              "text/plain",
            ]),
            size: z.number().int().min(1).max(15728640),
          })
          .parse(data);
        const id = randomUUID(),
          extension = input.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "png", "jpg", "jpeg", "webp", "txt"].includes(extension))
          fail(415, "Dateiformat nicht unterstützt.");
        const filename = id + "." + extension;
        await query(
          db.rpc("wedding_reserve_document", {
            p_document: {
              id,
              name: input.name.replace(/[\\/\x00-\x1f]/g, "_"),
              mime: input.mime,
              size: input.size,
              filename,
              created_by: user.id,
            },
          }),
        );
        const ticket = await query(
          storage.createSignedUploadUrl(filename, { upsert: false }),
        );
        return response({ id, uploadUrl: ticket.signedUrl }, 201);
      }
      if (path === "/documents/text" && method === "POST") {
        const input = z
          .object({
            text: z.string().trim().min(1).max(200000),
            name: z
              .string()
              .trim()
              .min(1)
              .max(190)
              .default("Eingefügter Angebotstext"),
          })
          .parse(data);
        const id = randomUUID(),
          filename = id + ".txt";
        await query(
          db.rpc("wedding_reserve_document", {
            p_document: {
              id,
              name: input.name + ".txt",
              mime: "text/plain",
              size: new TextEncoder().encode(input.text).length,
              filename,
              created_by: user.id,
            },
          }),
        );
        await query(
          storage.upload(filename, new TextEncoder().encode(input.text), {
            contentType: "text/plain",
            upsert: false,
          }),
        );
        await query(
          table("documents")
            .update({
              uploaded: true,
              status: "complete",
              progress: "Prüfbereit",
              analysis: extractOffer([
                { page: 1, text: input.text, method: "Eingefügter Text" },
              ]),
            })
            .eq("id", id),
        );
        return response({ id }, 201);
      }
      const docRoute = path.match(
        /^\/documents\/([^/]+)(?:\/(file|complete|analysis|retry))?$/,
      );
      if (docRoute) {
        const [, id, action] = docRoute;
        const doc = await document(id);
        if (method === "DELETE" && !action) {
          const filename = await query(
            db.rpc("wedding_delete_document", { p_id: id }),
          );
          await query(storage.remove([filename]));
          return response({ ok: true });
        }
        if (method === "GET" && action === "file") {
          if (!doc.uploaded) fail(404, "Upload ist noch nicht abgeschlossen.");
          const signed = await query(
            storage.createSignedUrl(
              doc.filename,
              300,
              url.searchParams.has("download") ? { download: doc.name } : {},
            ),
          );
          return new Response(null, {
            status: 307,
            headers: {
              Location: signed.signedUrl,
              "Cache-Control": "no-store",
            },
          });
        }
        if (method === "GET" && !action) {
          const { filename, ...metadata } = doc;
          return response({ ...metadata, createdAt: doc.created_at });
        }
        if (method === "POST" && action === "complete") {
          if (doc.uploaded) return response({ ok: true });
          const file = await query(storage.download(doc.filename));
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (
            bytes.length !== doc.size ||
            validFile(bytes, doc.name) !== doc.mime
          ) {
            await query(storage.remove([doc.filename]));
            await query(
              table("documents")
                .update({
                  status: "error",
                  progress: "Upload ungültig",
                  error:
                    "Dateiinhalt stimmt nicht mit dem erlaubten Format überein.",
                })
                .eq("id", id),
            );
            fail(415, "Dateiinhalt oder Format nicht unterstützt.");
          }
          await query(
            table("documents")
              .update({
                uploaded: true,
                status: "running",
                progress: "Texterkennung auf deinem Gerät läuft …",
              })
              .eq("id", id),
          );
          return response({ ok: true });
        }
        if (method === "POST" && action === "analysis") {
          if (!doc.uploaded)
            fail(409, "Bitte zuerst das Original vollständig hochladen.");
          if (typeof data.error === "string") {
            await query(
              table("documents")
                .update({
                  status: "error",
                  progress: "Manuelle Prüfung möglich",
                  error: data.error.slice(0, 1000),
                })
                .eq("id", id),
            );
            return response({ ok: true });
          }
          const pages = z
            .array(
              z.object({
                page: z.number().int().min(1).max(20),
                text: z.string().max(200000),
                method: z.string().max(100),
                confidence: z.number().min(0).max(100).optional(),
              }),
            )
            .min(1)
            .max(20)
            .parse(data.pages);
          if (pages.reduce((sum, p) => sum + p.text.length, 0) > 400000)
            fail(413, "Zu viel erkannter Text. Bitte Dokument aufteilen.");
          if (!pages.some((p) => p.text.trim()))
            fail(400, "Kein lesbarer Text erkannt.");
          const analysis = extractOffer(pages);
          await query(
            table("documents")
              .update({
                status: "complete",
                progress: "Prüfbereit",
                analysis,
                error: null,
              })
              .eq("id", id),
          );
          return response({ ok: true });
        }
        if (method === "POST" && action === "retry") {
          await query(
            table("documents")
              .update({
                status: "running",
                progress: "Texterkennung auf deinem Gerät läuft …",
                error: null,
              })
              .eq("id", id),
          );
          return response({ ok: true });
        }
      }
      if (path === "/export") {
        const data = Object.fromEntries(
          await Promise.all(
            kinds.map(async (kind) => [kind, await list(kind)]),
          ),
        );
        const documents = await allRows(
          "documents",
          "id,name,mime,size,status,analysis,created_at",
        );
        const history = (
          await allRows("history", "id,record_id,kind,data,version,updated_at")
        ).map(({ id, ...entry }) => entry);
        return response(
          {
            format: "wedding-ss-v1",
            exportedAt: now(),
            ...data,
            documents,
            history,
            originalFiles:
              "Originale separat aus dem privaten Dokumentenbereich herunterladen.",
          },
          200,
          {
            "Content-Disposition":
              'attachment; filename="wedding-ss-export.json"',
          },
        );
      }
      fail(404, "Unbekannter API-Endpunkt.");
    } catch (error) {
      if (error instanceof z.ZodError)
        return response(
          {
            error: "Bitte die Eingaben prüfen.",
            fields: error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          },
          400,
        );
      const status = error.status || 500;
      if (status === 500)
        console.error(
          "Wedding API:",
          error.name,
          error.message === "DatabaseError" ? "database" : "internal",
        );
      return response(
        {
          error:
            status === 500
              ? "Die Aktion konnte nicht gespeichert werden. Bitte erneut versuchen."
              : error.message,
        },
        status,
      );
    }
  };
}
