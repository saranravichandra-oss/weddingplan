import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { openStore } from "../server/store.mjs";

const original = "Reception";
const renamed = "Unser Abend";
const fixtures = [
  {
    id: "event-evening",
    kind: "events",
    data: { name: original, position: 2 },
  },
  {
    id: "event-morning",
    kind: "events",
    data: { name: "Morgenfeier", position: 1 },
  },
  {
    id: "task-linked",
    kind: "tasks",
    data: {
      title: "Ablauf klären",
      event: original,
      detail: "Reception bleibt ein Originalzitat",
    },
  },
  {
    id: "provider-linked",
    kind: "providers",
    data: { name: "Testservice", event: original },
  },
  {
    id: "offer-linked",
    kind: "offers",
    data: {
      name: "Testangebot",
      events: ["Morgenfeier", original],
      status: "Gebucht",
      confirmed: true,
    },
  },
  {
    id: "cost-booked",
    kind: "costs",
    data: {
      label: "Gebuchtes Testangebot",
      event: "Morgenfeier + Reception",
      offerId: "offer-linked",
      amount: 1000,
      paid: 100,
      stage: "Beauftragt",
    },
  },
  {
    id: "cost-manual",
    kind: "costs",
    data: {
      label: "Weitere Kosten",
      event: original,
      amount: 300,
      paid: null,
      stage: "Geschätzt",
    },
  },
  {
    id: "cost-custom",
    kind: "costs",
    data: {
      label: "Individuelle Zuordnung",
      event: "Mehrere Veranstaltungen",
      offerId: "offer-custom",
      amount: 200,
      paid: 0,
      stage: "Beauftragt",
    },
  },
  {
    id: "offer-custom",
    kind: "offers",
    data: {
      name: "Weiteres Testangebot",
      events: [original],
      status: "Gebucht",
      confirmed: true,
    },
  },
  {
    id: "task-unrelated",
    kind: "tasks",
    data: { title: "Andere Feier", event: "Morgenfeier" },
  },
  {
    id: "guest-group",
    kind: "guests",
    data: {
      name: "Testgruppe",
      partySize: 5,
      attendance: {
        "event-evening": "Vorgesehen",
        "event-morning": "Zugesagt",
      },
    },
  },
];

async function verifyRenaming(adapter) {
  await adapter.seed(fixtures);
  const before = await adapter.records();
  const event = before.find((row) => row.id === "event-evening");
  await adapter.update(event, { ...event.data, name: renamed });
  const rows = await adapter.records();
  const byId = (id) => rows.find((row) => row.id === id);
  assert.equal(byId("task-linked").data.event, renamed);
  assert.equal(byId("provider-linked").data.event, renamed);
  assert.deepEqual(byId("offer-linked").data.events, ["Morgenfeier", renamed]);
  assert.equal(byId("cost-booked").data.event, "Morgenfeier + Unser Abend");
  assert.equal(byId("cost-manual").data.event, renamed);
  assert.equal(byId("cost-custom").data.event, "Mehrere Veranstaltungen");
  assert.equal(
    byId("task-linked").data.detail,
    "Reception bleibt ein Originalzitat",
  );
  assert.equal(byId("offer-linked").data.status, "Gebucht");
  assert.deepEqual(
    byId("guest-group").data,
    before.find((row) => row.id === "guest-group").data,
  );
  for (const id of [
    "task-linked",
    "provider-linked",
    "offer-linked",
    "cost-booked",
    "cost-manual",
    "offer-custom",
  ])
    assert.equal(
      byId(id).version,
      before.find((row) => row.id === id).version + 1,
      id,
    );
  for (const id of ["guest-group", "task-unrelated", "cost-custom"])
    assert.equal(
      byId(id).version,
      before.find((row) => row.id === id).version,
      id,
    );
  assert.ok(
    (await adapter.history()).some(
      (row) => row.record_id === "task-linked" && row.data.event === original,
    ),
  );
  await assert.rejects(
    () => adapter.update(event, { ...event.data, name: "Veraltete Änderung" }),
    /conflict/,
  );
  assert.deepEqual(
    await adapter.records(),
    rows,
    "a stale event write changes nothing",
  );
  await assert.rejects(
    () =>
      adapter.update(byId("event-evening"), {
        ...byId("event-evening").data,
        name: " morgenfeier ",
      }),
    /event_name_taken/,
  );
  assert.deepEqual(
    await adapter.records(),
    rows,
    "a duplicate event name changes nothing",
  );
  const historyBeforeFailure = await adapter.history();
  await adapter.rejectNextRename();
  await assert.rejects(
    () =>
      adapter.update(byId("event-evening"), {
        ...byId("event-evening").data,
        name: "Scheitert",
      }),
    /fixture_block|fixture_not_updated/,
  );
  assert.deepEqual(
    await adapter.records(),
    rows,
    "a dependent failure rolls back the entire rename",
  );
  assert.deepEqual(
    await adapter.history(),
    historyBeforeFailure,
    "rolled-back history does not claim successful changes",
  );
}

test("local event renaming preserves linked planning records, history and stale-write protection", async () => {
  const directory = mkdtempSync(resolve(".test-data-event-renaming-"));
  const store = openStore(directory);
  try {
    store.db.exec("DELETE FROM records; DELETE FROM record_history;");
    store.db
      .prepare(
        "INSERT INTO users(id,name,email,password,created_at) VALUES(?,?,?,?,?)",
      )
      .run(
        "fixture-user",
        "Testperson",
        "events@example.test",
        "not-a-login-hash",
        new Date().toISOString(),
      );
    await verifyRenaming({
      seed: async (rows) => {
        for (const row of rows)
          store.create(row.kind, row.data, "fixture-user", row.id);
      },
      records: async () =>
        store.db
          .prepare("SELECT id,kind,data,version FROM records ORDER BY id")
          .all()
          .map((row) => ({ ...row, data: JSON.parse(row.data) })),
      history: async () =>
        store.db
          .prepare("SELECT record_id,data FROM record_history")
          .all()
          .map((row) => ({ ...row, data: JSON.parse(row.data) })),
      update: async (row, data) => {
        const result = store.update(
          row.kind,
          row.id,
          data,
          row.version,
          "fixture-user",
        );
        if (!result) throw new Error("conflict");
      },
      rejectNextRename: async () =>
        store.db.exec(
          "CREATE TRIGGER fixture_block BEFORE UPDATE ON records WHEN NEW.id='provider-linked' AND json_extract(NEW.data,'$.event')='Scheitert' BEGIN SELECT RAISE(ABORT,'fixture_block'); END;",
        ),
    });
  } finally {
    store.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test(
  "cloud SQL event renaming is exercised in isolated in-memory Postgres, never production",
  { timeout: 30000 },
  async () => {
    const db = new PGlite();
    try {
      await db.exec(
        "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
      );
      await db.exec(readFileSync("cloud/schema.sql", "utf8"));
      await db.exec(readFileSync("cloud/event-renaming.sql", "utf8"));
      const permission = (
        await db.query(
          "SELECT has_function_privilege('anon','public.wedding_event_rename()','EXECUTE') as anon, has_function_privilege('service_role','public.wedding_event_rename()','EXECUTE') as backend",
        )
      ).rows[0];
      assert.deepEqual(permission, { anon: false, backend: true });
      await db.query(
        "INSERT INTO public.wedding_users(id,name,email,password) VALUES($1,$2,$3,$4)",
        [
          "fixture-user",
          "Testperson",
          "events@example.test",
          "not-a-login-hash",
        ],
      );
      await verifyRenaming({
        seed: async (rows) => {
          for (const row of rows)
            await db.query(
              "INSERT INTO public.wedding_records(id,kind,data,updated_by) VALUES($1,$2,$3,$4)",
              [row.id, row.kind, JSON.stringify(row.data), "fixture-user"],
            );
        },
        records: async () =>
          (
            await db.query(
              "SELECT id,kind,data,version FROM public.wedding_records ORDER BY id",
            )
          ).rows,
        history: async () =>
          (await db.query("SELECT record_id,data FROM public.wedding_history"))
            .rows,
        update: async (row, data) => {
          await db.query("SELECT public.wedding_write($1,$2,$3,$4,$5,false)", [
            row.kind,
            row.id,
            JSON.stringify(data),
            row.version,
            "fixture-user",
          ]);
        },
        rejectNextRename: async () =>
          db.exec(
            "ALTER TABLE public.wedding_records ADD CONSTRAINT fixture_not_updated CHECK (id<>'provider-linked' OR data->>'event'<>'Scheitert');",
          ),
      });
    } finally {
      await db.close();
    }
  },
);
