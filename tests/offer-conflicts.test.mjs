import test from "node:test";
import assert from "node:assert/strict";
import { mergeOffer } from "../src/offer-conflicts.ts";
import { mergeRecord } from "../src/record-conflicts.ts";

test("planning merges retain independent celebration responses and immutable shared metadata", () => {
  const base = {
    id: "group",
    version: 1,
    name: "Testfamilie",
    partySize: 3,
    importBatch: "original-batch",
    attendance: { civil: "Vorgesehen", evening: "Vorgesehen" },
  };
  const mine = {
    ...base,
    name: "Testfamilie korrigiert",
    importBatch: "stale-must-not-replace",
    attendance: { ...base.attendance, civil: "Zugesagt" },
  };
  const shared = {
    ...base,
    version: 2,
    updatedBy: "other",
    partySize: 4,
    attendance: { ...base.attendance, evening: "Abgesagt" },
  };
  const { merged, unresolved } = mergeRecord(base, mine, shared);
  assert.equal(unresolved, false);
  assert.equal(merged.name, mine.name);
  assert.equal(merged.partySize, 4);
  assert.equal(merged.version, 2);
  assert.equal(merged.importBatch, "original-batch");
  assert.deepEqual(merged.attendance, {
    civil: "Zugesagt",
    evening: "Abgesagt",
  });
  assert.deepEqual(shared.attendance, {
    civil: "Vorgesehen",
    evening: "Abgesagt",
  });
});

test("the same celebration or planning field needs an explicit choice, including cleared values", () => {
  const base = {
    version: 1,
    notes: "Vorher",
    attendance: { evening: "Vorgesehen" },
  };
  const mine = { ...base, notes: "", attendance: { evening: "Zugesagt" } };
  const shared = {
    ...base,
    version: 2,
    notes: "Gemeinsame Notiz",
    attendance: { evening: "Abgesagt" },
  };
  const pending = mergeRecord(base, mine, shared);
  assert.equal(pending.unresolved, true);
  assert.deepEqual(pending.conflicts.map(({ key }) => key).sort(), [
    "attendance-evening",
    "notes",
  ]);
  const result = mergeRecord(base, mine, shared, {
    notes: "mine",
    "attendance-evening": "shared",
  });
  assert.equal(result.unresolved, false);
  assert.equal(result.merged.notes, "");
  assert.deepEqual(result.merged.attendance, { evening: "Abgesagt" });
});

test("another simultaneous change is compared with the adopted baseline before another write", () => {
  const base = { version: 1, title: "Testaufgabe", detail: "Alt", done: false };
  const firstShared = { ...base, version: 2, detail: "Vom anderen Konto" };
  const first = mergeRecord(
    base,
    { ...base, title: "Eigener Titel" },
    firstShared,
  );
  const secondShared = {
    ...firstShared,
    version: 3,
    title: "Neuer gemeinsamer Titel",
    done: true,
  };
  const second = mergeRecord(firstShared, first.merged, secondShared);
  assert.equal(second.unresolved, true);
  assert.equal(second.merged.done, true);
  assert.equal(second.merged.version, 3);
  assert.equal(second.conflicts[0].key, "title");
});
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
