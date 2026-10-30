import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { createCloudHandler } from "../cloud/handler.mjs";
test("shared code keeps leading zeroes, rejects invalid input and sets a protected session", async () => {
  const salt = "synthetic-salt",
    password = salt + ":" + scryptSync("012345", salt, 64).toString("hex");
  const limits = [],
    sessions = [];
  let allow = true;
  const db = {
    storage: { from: () => ({}) },
    rpc: async (n, p) => {
      limits.push(p);
      return { data: allow, error: null };
    },
    from(name) {
      let mode = "select";
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        lt() {
          return this;
        },
        delete() {
          mode = "delete";
          return this;
        },
        insert(row) {
          sessions.push(row);
          mode = "insert";
          return this;
        },
        maybeSingle() {
          return this;
        },
        then(resolve) {
          resolve({
            data:
              name === "wedding_config"
                ? { value: ["https://fixture.test"] }
                : name === "wedding_users"
                  ? {
                      id: "synthetic",
                      email: "planung@wedding-ss.invalid",
                      name: "Shared",
                      password,
                    }
                  : null,
            error: null,
          });
        },
      };
    },
  };
  const handler = createCloudHandler(db),
    request = (code) =>
      handler(
        new Request("https://backend.test", {
          method: "POST",
          headers: {
            "x-wedding-path": "/auth/code",
            "x-wedding-public-origin": "https://fixture.test",
            origin: "https://fixture.test",
            "content-type": "application/json",
          },
          body: JSON.stringify({ code }),
        }),
      );
  assert.equal((await request("12345")).status, 400);
  assert.equal((await request("999999")).status, 401);
  const good = await request("012345");
  assert.equal(good.status, 200);
  assert.match(
    good.headers.get("set-cookie"),
    /HttpOnly; Secure; SameSite=Strict/,
  );
  assert.equal(sessions.length, 1);
  assert.ok(limits.some((p) => p.p_limit === 5));
  allow = false;
  assert.equal((await request("012345")).status, 429);
});
