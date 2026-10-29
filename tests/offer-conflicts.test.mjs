import test from "node:test";
import assert from "node:assert/strict";
import { mergeOffer } from "../src/offer-conflicts.ts";
const base = {
  id: "fixture",
  version: 1,
  price: 1000,
  photos: "100 Bilder",
  delivery: "8 Wochen",
  evidence: { price: [{ page: 1, quote: "1000 EUR" }] },
  manualFields: [],
  documentId: "document-one",
  status: "Geprüft",
};
test("unrelated offer edits merge without overwriting the other account", () => {
  const result = mergeOffer(
    base,
    { ...base, price: 1200, manualFields: ["price"] },
    { ...base, version: 2, delivery: "12 Wochen", manualFields: ["delivery"] },
  );
  assert.equal(result.unresolved, false);
  assert.equal(result.merged.price, 1200);
  assert.equal(result.merged.delivery, "12 Wochen");
  assert.equal(result.merged.version, 2);
  assert.deepEqual(result.merged.manualFields.sort(), ["delivery", "price"]);
  assert.deepEqual(result.merged.evidence.price, base.evidence.price);
});
test("competing edits need an explicit choice and preserve the chosen source", () => {
  const mine = {
    ...base,
    price: 1300,
    evidence: { price: [{ page: 2, quote: "1300 EUR" }] },
    manualFields: ["price"],
  };
  const shared = {
    ...base,
    version: 2,
    price: 1400,
    evidence: { price: [{ page: 3, quote: "1400 EUR" }] },
  };
  assert.equal(mergeOffer(base, mine, shared).unresolved, true);
  const local = mergeOffer(base, mine, shared, { price: "mine" });
  assert.equal(local.merged.price, 1300);
  assert.equal(local.merged.evidence.price[0].page, 2);
  const remote = mergeOffer(base, mine, shared, { price: "shared" });
  assert.equal(remote.merged.price, 1400);
  assert.equal(remote.merged.evidence.price[0].page, 3);
});
test("an older draft without a baseline never guesses which differing value is newer", () => {
  const result = mergeOffer(
    undefined,
    { ...base, price: 0 },
    { ...base, version: 4, price: null },
  );
  assert.equal(result.unresolved, true);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].key, "price");
  assert.equal(
    mergeOffer(
      undefined,
      { ...base, price: 0 },
      { ...base, version: 4, price: null },
      { price: "mine" },
    ).merged.price,
    0,
  );
});
