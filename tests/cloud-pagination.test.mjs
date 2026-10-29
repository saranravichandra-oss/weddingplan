import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCloudHandler } from "../cloud/handler.mjs";

const origin = "https://planning.example.test";
const sessionToken = "synthetic-local-pagination-session";
const date = (offset) => new Date(1793200000000 + offset * 1000).toISOString();

// This adapter models PostgREST's capped selects in memory. It never connects to Supabase.
function fixture({
  cap = 1000,
  counts = true,
  failHistoryPage = false,
  guestCount = 1201,
  insertBetweenPages = false,
} = {}) {
  const guests = Array.from({ length: guestCount }, (_, index) => ({
    id: `guest-${String(index).padStart(5, "0")}`,
    kind: "guests",
    data: { name: `Synthetic guest ${index}`, partySize: 1 },
    version: 1,
    updated_at: date(1201 - index),
    updated_by: "fixture-user",
  }));
  const tables = {
    wedding_config: [{ key: "allowed_origins", value: [origin] }],
    wedding_sessions: [
      {
        token: createHash("sha256").update(sessionToken).digest("hex"),
        user_id: "fixture-user",
        csrf: "synthetic-csrf",
        expires: Date.now() + 600000,
      },
    ],
    wedding_users: [
      {
        id: "fixture-user",
        name: "Fixture",
        email: "fixture@example.test",
        password: "not-read-by-this-test",
        created_at: date(0),
      },
    ],
    wedding_records: [
      ...guests,
      ...[2, 0, 1].map((position) => ({
        id: `event-${position}`,
        kind: "events",
        data: { name: `Event ${position}`, position },
        version: 1,
        updated_at: date(0),
        updated_by: "fixture-user",
      })),
    ],
    wedding_documents: Array.from({ length: 1003 }, (_, index) => ({
      id: `document-${String(index).padStart(5, "0")}`,
      name: `Synthetic ${index}.txt`,
      mime: "text/plain",
      size: 30,
      status: "ready",
      analysis: null,
      created_at: date(index),
      created_by: "fixture-user",
      uploaded: true,
      progress: "Prüfbereit",
      error: null,
    })),
    wedding_history: Array.from({ length: 1307 }, (_, index) => ({
      id: index + 1,
      record_id: guests[index % guests.length].id,
      kind: "guests",
      data: { name: `Synthetic version ${index}` },
      version: index + 1,
      updated_at: date(index),
    })),
  };
  const calls = [];
  let inserted = false;
  const db = {
    storage: { from: () => ({}) },
    rpc: async (name) => {
      assert.equal(name, "wedding_limit");
      return { data: true, error: null };
    },
    from(name) {
      const filters = [],
        orders = [];
      let columns = "*",
        countRequested = false,
        rowLimit = cap,
        single = false;
      const builder = {
        select(value = "*", options) {
          columns = value;
          countRequested = options?.count === "exact";
          return this;
        },
        eq(column, value) {
          filters.push({ column, value, op: "eq" });
          return this;
        },
        gt(column, value) {
          filters.push({ column, value, op: "gt" });
          return this;
        },
        order(column, options) {
          orders.push({ column, ascending: options?.ascending !== false });
          return this;
        },
        limit(value) {
          rowLimit = Math.min(value, cap);
          return this;
        },
        single() {
          single = true;
          return this;
        },
        maybeSingle() {
          single = true;
          return this;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              calls.push({
                name,
                filters: [...filters],
                orders: [...orders],
                countRequested,
                rowLimit,
              });
              if (
                failHistoryPage &&
                name === "wedding_history" &&
                filters.some(
                  (filter) => filter.column === "id" && filter.op === "gt",
                )
              )
                return {
                  data: null,
                  error: { message: "synthetic database detail" },
                };
              if (
                insertBetweenPages &&
                !inserted &&
                name === "wedding_records" &&
                filters.some(
                  (filter) =>
                    filter.column === "kind" && filter.value === "guests",
                ) &&
                filters.some(
                  (filter) => filter.column === "id" && filter.op === "gt",
                )
              ) {
                inserted = true;
                tables.wedding_records.push({
                  ...guests[0],
                  id: "guest-00700-extra",
                  data: { name: "Added during pagination", partySize: 1 },
                });
              }
              let rows = tables[name].filter((row) =>
                filters.every(({ column, value, op }) =>
                  op === "eq" ? row[column] === value : row[column] > value,
                ),
              );
              const count = counts && countRequested ? rows.length : null;
              rows = rows
                .slice()
                .sort((a, b) => {
                  for (const { column, ascending } of orders) {
                    const result =
                      a[column] < b[column]
                        ? -1
                        : a[column] > b[column]
                          ? 1
                          : 0;
                    if (result) return ascending ? result : -result;
                  }
                  return 0;
                })
                .slice(0, rowLimit)
                .map((row) =>
                  columns === "*"
                    ? { ...row }
                    : Object.fromEntries(
                        columns
                          .split(",")
                          .map((column) => [column.trim(), row[column.trim()]]),
                      ),
                );
              return {
                data: single ? (rows[0] ?? null) : rows,
                count,
                error: null,
              };
            })
            .then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const handle = createCloudHandler(db);
  const request = (path, headers = {}) =>
    handle(
      new Request(`https://edge.example.test${path}`, {
        headers: {
          "x-wedding-path": path,
          "x-wedding-public-origin": origin,
          cookie: `wedding_session=${sessionToken}`,
          ...headers,
        },
      }),
    );
  return { request, calls };
}

test("cloud state and export include collections beyond the default thousand-row cap", async () => {
  const { request } = fixture();
  const stateResponse = await request("/state");
  assert.equal(stateResponse.status, 200);
  const state = await stateResponse.json();
  assert.equal(state.guests.length, 1201);
  assert.equal(state.documents.length, 1003);
  assert.deepEqual(
    state.events.map((event) => event.position),
    [0, 1, 2],
  );
  assert.equal(state.guests[0].name, "Synthetic guest 1200");
  assert.equal(state.documents[0].name, "Synthetic 1002.txt");
  const exported = await request("/export");
  assert.equal(exported.headers.get("Cache-Control"), "no-store");
  assert.match(exported.headers.get("Content-Disposition"), /attachment/);
  const data = await exported.json();
  assert.equal(data.guests.length, 1201);
  assert.equal(data.documents.length, 1003);
  assert.equal(data.history.length, 1307);
  assert.equal(data.history.at(-1).version, 1307);
  assert.equal("id" in data.history[0], false);
  assert.equal("users" in data, false);
  assert.equal("password" in data, false);
});

test("an insertion between pages never makes an existing final record disappear from the export", async () => {
  const { request } = fixture({ guestCount: 1000, insertBetweenPages: true });
  const response = await request("/export");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.guests.length, 1001);
  assert.ok(data.guests.some((guest) => guest.id === "guest-00999"));
  assert.equal(new Set(data.guests.map((guest) => guest.id)).size, 1001);
});

test("cloud pagination follows stable cursors even when the service caps pages below the requested size", async () => {
  const { request, calls } = fixture({ cap: 37 });
  const data = await (await request("/export")).json();
  assert.equal(data.guests.length, 1201);
  assert.equal(new Set(data.guests.map((guest) => guest.id)).size, 1201);
  assert.equal(data.history.length, 1307);
  assert.ok(
    calls.some(
      (call) =>
        call.name === "wedding_history" &&
        call.filters.some(
          (filter) => filter.column === "id" && filter.op === "gt",
        ),
    ),
  );
});

test("cloud pagination finishes completely when row counts are unavailable", async () => {
  const { request } = fixture({ counts: false });
  const data = await (await request("/export")).json();
  assert.equal(data.guests.length, 1201);
  assert.equal(data.documents.length, 1003);
  assert.equal(data.history.length, 1307);
});

test("a later page failure rejects the export instead of returning a partial backup", async () => {
  const { request, calls } = fixture({ failHistoryPage: true });
  const response = await request("/export");
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal("format" in result, false);
  assert.equal("history" in result, false);
  assert.doesNotMatch(JSON.stringify(result), /synthetic database detail/);
  assert.ok(
    calls.some(
      (call) =>
        call.name === "wedding_history" &&
        call.filters.some(
          (filter) => filter.column === "id" && filter.op === "gt",
        ),
    ),
  );
});

test("paging does not expose any planning collection without a current session or allowed origin", async () => {
  const { request, calls } = fixture();
  assert.equal((await request("/export", { cookie: "" })).status, 401);
  assert.equal(
    (await request("/state", { origin: "https://other.example.test" })).status,
    403,
  );
  assert.equal(
    calls.some((call) =>
      ["wedding_records", "wedding_documents", "wedding_history"].includes(
        call.name,
      ),
    ),
    false,
  );
});
