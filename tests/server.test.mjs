import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { once } from "node:events";
import { DatabaseSync } from "node:sqlite";
import { offerImage, scannedPdf } from "./fixtures.mjs";

test(
  "private app persists data, shares it between exactly two accounts and performs real local OCR",
  { timeout: 150000 },
  async (t) => {
    const prefix = resolve(".test-data-server-");
    const directory = mkdtempSync(prefix);
    const base = "http://127.0.0.1:5191";
    let child,
      stderr = "";
    async function start() {
      child = spawn(process.execPath, ["server/index.mjs", "--production"], {
        cwd: resolve("."),
        env: {
          ...process.env,
          PORT: "5191",
          HOST: "127.0.0.1",
          WEDDING_DATA_DIR: directory,
        },
        stdio: ["ignore", "ignore", "pipe"],
      });
      child.stderr.on("data", (value) => {
        stderr += value;
      });
      for (let n = 0; n < 100; n++) {
        if (child.exitCode !== null)
          throw new Error("Testserver unerwartet beendet: " + stderr);
        try {
          if ((await fetch(base + "/api/auth/status")).ok) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Testserver startet nicht.");
    }
    async function stop() {
      if (child && child.exitCode === null) {
        const stopped = once(child, "exit");
        child.kill();
        await stopped;
      }
    }
    async function request(
      path,
      { method = "GET", data, auth, body, headers = {} } = {},
    ) {
      const response = await fetch(base + "/api" + path, {
        method,
        headers: {
          ...(auth ? { Cookie: auth.cookie, "X-CSRF-Token": auth.csrf } : {}),
          ...(data ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        body: data ? JSON.stringify(data) : body,
      });
      const type = response.headers.get("content-type") || "";
      const value = type.includes("application/json")
        ? await response.json()
        : await response.arrayBuffer();
      return { response, value };
    }
    const authOf = (result) => ({
      cookie: result.response.headers.get("set-cookie").split(";")[0],
      csrf: result.value.csrf,
    });
    try {
      await start();
      await t.test(
        "authentication and CSRF are required; sessions use HttpOnly cookies",
        async () => {
          assert.equal((await request("/state")).response.status, 401);
          const result = await request("/auth/setup", {
            method: "POST",
            data: {
              name: "Testperson 1",
              email: "one@example.test",
              password: "FixturePasswordOne2027",
            },
          });
          assert.equal(result.response.status, 200);
          assert.match(result.response.headers.get("set-cookie"), /HttpOnly/);
          assert.match(
            result.response.headers.get("set-cookie"),
            /SameSite=Strict/,
          );
          t.owner = authOf(result);
          const blocked = await request("/records/tasks", {
            method: "POST",
            auth: { ...t.owner, csrf: "wrong" },
            data: { title: "Nicht speichern" },
          });
          assert.equal(blocked.response.status, 403);
          assert.equal(
            (
              await request("/auth/login", {
                method: "POST",
                data: {
                  email: "one@example.test",
                  password: "FixturePasswordOne2027",
                },
                headers: { Origin: "https://attacker.invalid" },
              })
            ).response.status,
            403,
          );
        },
      );
      await t.test(
        "invitation is one-use and a second account sees shared records",
        async () => {
          const invitation = await request("/invitations", {
            method: "POST",
            auth: t.owner,
          });
          const accepted = await request("/auth/accept", {
            method: "POST",
            data: {
              name: "Testperson 2",
              email: "two@example.test",
              password: "FixturePasswordTwo2027",
              invitation: invitation.value.invitation,
            },
          });
          assert.equal(accepted.response.status, 200);
          t.partner = authOf(accepted);
          assert.equal(
            (await request("/invitations", { method: "POST", auth: t.owner }))
              .response.status,
            409,
          );
          const state = await request("/state", { auth: t.partner });
          assert.equal(state.value.members.length, 2);
          assert.deepEqual(
            state.value.events.map((event) => event.name),
            ["Standesamt", "Tamilische Zeremonie", "Reception"],
          );
          assert.equal(state.value.costs[0].amount, 1000);
          assert.equal(state.value.costs[0].paid, 500);
          assert.equal(state.value.paidApiCalls, false);
        },
      );
      await t.test(
        "row versions reject stale writes without losing the other person’s edit",
        async () => {
          const created = await request("/records/tasks", {
            method: "POST",
            auth: t.owner,
            data: {
              title: "Gemeinsam prüfen",
              priority: "Normal",
              done: false,
            },
          });
          assert.equal(created.response.status, 201);
          t.taskId = created.value.id;
          const changed = await request("/records/tasks/" + t.taskId, {
            method: "PUT",
            auth: t.partner,
            data: { ...created.value, done: true },
          });
          assert.equal(changed.response.status, 200);
          const stale = await request("/records/tasks/" + t.taskId, {
            method: "PUT",
            auth: t.owner,
            data: { ...created.value, title: "Veraltete Fassung" },
          });
          assert.equal(stale.response.status, 409);
          assert.equal(
            (await request("/state", { auth: t.owner })).value.tasks.find(
              (task) => task.id === t.taskId,
            ).done,
            true,
          );
        },
      );
      await t.test(
        "guests have independent responses per celebration",
        async () => {
          const state = (await request("/state", { auth: t.owner })).value;
          const attendance = {
            [state.events[0].id]: "Eingeladen",
            [state.events[1].id]: "Nicht eingeladen",
            [state.events[2].id]: "Zugesagt",
          };
          const result = await request("/records/guests", {
            method: "POST",
            auth: t.owner,
            data: { name: "Testgast", attendance },
          });
          assert.equal(result.response.status, 201);
          assert.equal(
            result.value.attendance[state.events[0].id],
            "Eingeladen",
          );
          assert.equal(result.value.attendance[state.events[2].id], "Zugesagt");
        },
      );
      await t.test(
        "guest import is atomic, idempotent and counts families without changing existing guests",
        async () => {
          const before = (await request("/state", { auth: t.owner })).value;
          const attendance = {
            [before.events[1].id]: "Vorgesehen",
            [before.events[2].id]: "Nicht angegeben",
          };
          const input = {
            batchId: randomUUID(),
            rows: [
              {
                sourceRow: 4,
                guest: {
                  name: "Import Family",
                  partySize: 5,
                  type: "Gruppe",
                  attendance,
                },
              },
              {
                sourceRow: 5,
                guest: { name: "Testgast", partySize: 3, attendance },
              },
            ],
          };
          assert.equal(
            (await request("/guests/import", { method: "POST", data: input }))
              .response.status,
            401,
          );
          assert.equal(
            (
              await request("/guests/import", {
                method: "POST",
                auth: { ...t.owner, csrf: "wrong" },
                data: input,
              })
            ).response.status,
            403,
          );
          const invalid = {
            ...input,
            rows: [
              input.rows[0],
              { sourceRow: 8, guest: { name: "Invalid family", partySize: 0 } },
            ],
          };
          assert.equal(
            (
              await request("/guests/import", {
                method: "POST",
                auth: t.owner,
                data: invalid,
              })
            ).response.status,
            400,
          );
          assert.equal(
            (await request("/state", { auth: t.owner })).value.guests.length,
            before.guests.length,
          );
          const imported = await request("/guests/import", {
            method: "POST",
            auth: t.owner,
            data: input,
          });
          assert.equal(imported.response.status, 201);
          assert.deepEqual(imported.value, {
            created: 1,
            skipped: 1,
            people: 5,
          });
          const retry = await request("/guests/import", {
            method: "POST",
            auth: t.owner,
            data: input,
          });
          assert.deepEqual(retry.value, { created: 0, skipped: 2, people: 0 });
          const saved = (
            await request("/state", { auth: t.partner })
          ).value.guests.find((guest) => guest.name === "Import Family");
          assert.equal(saved.partySize, 5);
          assert.equal(saved.attendance[before.events[1].id], "Vorgesehen");
          assert.equal(
            saved.attendance[before.events[2].id],
            "Nicht angegeben",
          );
        },
      );
      await t.test(
        "documents are private, persisted, and unknown prices never become zero",
        async () => {
          const saved = await request("/documents/text", {
            method: "POST",
            auth: t.owner,
            data: {
              text: "Anbieter: Teststudio\nAnzahlung: 500 EUR\nOptional: Album 250 EUR",
            },
          });
          assert.equal(saved.response.status, 201);
          t.documentId = saved.value.id;
          assert.equal(
            (await request("/documents/" + t.documentId + "/file")).response
              .status,
            401,
          );
          const read = await request("/documents/" + t.documentId, {
            auth: t.partner,
          });
          assert.equal(read.value.analysis.fields.price, undefined);
          assert.equal(read.value.analysis.fields.deposit, 500);
          const original = await request(
            "/documents/" + t.documentId + "/file",
            { auth: t.partner },
          );
          assert.equal(original.response.status, 200);
          assert.match(new TextDecoder().decode(original.value), /Teststudio/);
          const upload = new FormData();
          upload.set(
            "file",
            new Blob(["not a PDF"], { type: "application/pdf" }),
            "fake.pdf",
          );
          assert.equal(
            (
              await request("/documents", {
                method: "POST",
                auth: t.owner,
                body: upload,
              })
            ).response.status,
            415,
          );
        },
      );
      await t.test(
        "real PNG and scanned PDF run local OCR with price source evidence",
        { timeout: 100000 },
        async () => {
          const image = offerImage();
          for (const [name, mime, bytes] of [
            ["screenshot.png", "image/png", image.png],
            ["scan.pdf", "application/pdf", scannedPdf(image.jpg)],
          ]) {
            const form = new FormData();
            form.set("file", new Blob([bytes], { type: mime }), name);
            const uploaded = await request("/documents", {
              method: "POST",
              auth: t.owner,
              body: form,
            });
            assert.equal(uploaded.response.status, 202);
            let doc;
            for (let n = 0; n < 160; n++) {
              doc = (
                await request("/documents/" + uploaded.value.id, {
                  auth: t.partner,
                })
              ).value;
              if (["complete", "error"].includes(doc.status)) break;
              await new Promise((r) => setTimeout(r, 350));
            }
            assert.equal(doc.status, "complete", doc.error);
            assert.equal(doc.analysis.fields.price, 3200);
            assert.equal(doc.analysis.fields.deposit, 500);
            assert.equal(doc.analysis.pages[0].method, "OCR");
            assert.equal(doc.analysis.evidence.price[0].page, 1);
          }
        },
      );
      await t.test(
        "offers do not book themselves and one explicit booking cannot be duplicated",
        async () => {
          const offer = await request("/records/offers", {
            method: "POST",
            auth: t.owner,
            data: {
              name: "Bestätigtes Testangebot",
              price: null,
              confirmed: true,
              documentId: t.documentId,
            },
          });
          assert.equal(offer.response.status, 201);
          assert.equal(offer.value.price, null);
          let state = (await request("/state", { auth: t.partner })).value;
          assert.equal(state.costs.length, 1);
          const booking = {
            amount: 3000,
            paid: 0,
            due: "",
            version: offer.value.version,
          };
          assert.equal(
            (
              await request("/offers/" + offer.value.id + "/book", {
                method: "POST",
                auth: t.partner,
                data: booking,
              })
            ).response.status,
            201,
          );
          state = (await request("/state", { auth: t.owner })).value;
          assert.equal(state.costs.length, 2);
          assert.equal(
            state.costs.reduce((n, c) => n + c.amount, 0),
            4000,
          );
          assert.equal(
            (
              await request("/offers/" + offer.value.id + "/book", {
                method: "POST",
                auth: t.owner,
                data: { ...booking, version: state.offers[0].version },
              })
            ).response.status,
            409,
          );
        },
      );
      await t.test(
        "database and document files survive a server restart; export excludes credentials",
        async () => {
          await stop();
          await start();
          const login = await request("/auth/login", {
            method: "POST",
            data: {
              email: "one@example.test",
              password: "FixturePasswordOne2027",
            },
          });
          assert.equal(login.response.status, 200);
          t.owner = authOf(login);
          const state = (await request("/state", { auth: t.owner })).value;
          assert.ok(
            state.tasks.some((task) => task.id === t.taskId && task.done),
          );
          assert.ok(state.documents.some((doc) => doc.id === t.documentId));
          const exported = await request("/export", { auth: t.owner });
          assert.equal(exported.response.status, 200);
          assert.equal(exported.value.format, "wedding-ss-v1");
          assert.equal(exported.value.users, undefined);
          assert.equal(exported.value.sessions, undefined);
          assert.ok(
            exported.value.history.some(
              (record) =>
                record.record_id === t.taskId &&
                record.version === 1 &&
                record.data.done === false,
            ),
          );
          const verificationDb = new DatabaseSync(
            join(directory, "wedding.sqlite"),
            { readOnly: true },
          );
          const password = verificationDb
            .prepare("SELECT password FROM users LIMIT 1")
            .get().password;
          assert.notEqual(password, "FixturePasswordOne2027");
          assert.match(password, /^[a-f0-9]+:[a-f0-9]+$/);
          verificationDb.close();
          assert.equal(
            (await fetch(base + "/.wedding-data/wedding.sqlite")).status,
            404,
          );
        },
      );
      await t.test(
        "unknown payments remain null and backup includes database plus originals",
        async () => {
          const unknown = await request("/records/costs", {
            method: "POST",
            auth: t.owner,
            data: {
              label: "Unbekannte Zahlung",
              stage: "Beauftragt",
              amount: 200,
              paid: null,
            },
          });
          assert.equal(unknown.response.status, 201);
          assert.equal(unknown.value.paid, null);
          const invalid = await request("/records/tasks", {
            method: "POST",
            auth: t.owner,
            data: { title: "Ungültiger Termin", due: "2027-02-31" },
          });
          assert.equal(invalid.response.status, 400);
          const backupRoot = join(directory, "backups");
          const process = spawn(
            globalThis.process.execPath,
            ["scripts/backup.mjs"],
            {
              cwd: resolve("."),
              env: {
                ...globalThis.process.env,
                WEDDING_DATA_DIR: directory,
                WEDDING_BACKUP_DIR: backupRoot,
              },
              stdio: "ignore",
            },
          );
          const [code] = await once(process, "exit");
          assert.equal(code, 0);
          const snapshotPath = join(backupRoot, readdirSync(backupRoot)[0]);
          const snapshot = new DatabaseSync(
            join(snapshotPath, "wedding.sqlite"),
            { readOnly: true },
          );
          const documents = snapshot
            .prepare("SELECT filename FROM documents")
            .all();
          assert.ok(documents.length >= 3);
          for (const doc of documents)
            assert.ok(
              readFileSync(join(snapshotPath, "documents", doc.filename))
                .length > 0,
            );
          assert.equal(
            snapshot.prepare("SELECT COUNT(*) AS n FROM users").get().n,
            2,
          );
          snapshot.close();
        },
      );
    } finally {
      await stop();
      assert.ok(directory.startsWith(prefix));
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
