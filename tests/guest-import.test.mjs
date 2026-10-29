import test from "node:test";
import assert from "node:assert/strict";
import {
  guessMapping,
  proposeGuests,
  validateXlsxArchive,
} from "../src/guest-import.ts";
import { peopleCount } from "../shared/guests.mjs";
import { guestWorkbook } from "./guest-workbook.mjs";
const events = [
  { id: "civil", name: "Standesamt" },
  { id: "ceremony", name: "Tamilische Zeremonie" },
  { id: "reception", name: "Reception" },
];
const rows = [
  ["Gästeliste", "Anz.", "Prio"],
  [null, null, "beides", "thaali", "rezeption"],
  [],
  ["Familie Beispiel", 4, "x"],
  ["Person Beispiel", 1, null, null, "x"],
  ["Ohne Zuordnung", 2],
  ["Zwei Markierungen", 1, "x", null, "x"],
];
test("two-line headers preserve households and planned event counts without inventing confirmations", () => {
  const { mapping } = guessMapping(rows, events);
  const result = proposeGuests(rows, mapping, events, [], "synthetic.xlsx");
  assert.equal(mapping.startRow, 4);
  assert.equal(result.length, 4);
  assert.equal(peopleCount(result.map((row) => row.guest)), 8);
  assert.equal(result[0].guest.type, "Gruppe");
  assert.equal(result[0].guest.partySize, 4);
  assert.equal(result[0].guest.attendance.civil, "Nicht angegeben");
  assert.equal(result[0].guest.attendance.ceremony, "Vorgesehen");
  assert.equal(result[0].guest.attendance.reception, "Vorgesehen");
  assert.equal(
    peopleCount(
      result
        .filter((row) => row.guest.attendance.reception === "Vorgesehen")
        .map((row) => row.guest),
    ),
    6,
  );
  assert.ok(result[2].warnings.length);
  assert.ok(
    !result.some((row) =>
      Object.values(row.guest.attendance).includes("Zugesagt"),
    ),
  );
});
test("invalid quantities and name collisions remain visible; explicit event responses stay separate", () => {
  const source = [
    ["Name", "Anzahl", "Reception"],
    ["Alex", 1, "zugesagt"],
    ["ALEX", 2, "x"],
    ["Blank amount", null],
    ["Fraction", 1.5],
    ["Negative", -1],
    ["Conflict", 1, "abgesagt"],
  ];
  const { mapping } = guessMapping(source, events);
  const result = proposeGuests(
    source,
    mapping,
    events,
    [{ name: "Alex" }],
    "fixture.xlsx",
  );
  assert.ok(result[0].duplicate);
  assert.ok(result[1].duplicate);
  assert.equal(result[0].guest.attendance.reception, "Zugesagt");
  assert.equal(result[0].guest.attendance.ceremony, "Nicht angegeben");
  assert.ok(result[2].errors.length);
  assert.ok(result[3].errors.length);
  assert.ok(result[4].errors.length);
  assert.equal(result[5].guest.attendance.reception, "Abgesagt");
});
test("XLSX resource guard accepts a real archive and rejects invalid or inflated archives", () => {
  const buffer = guestWorkbook(rows);
  validateXlsxArchive(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
  assert.throws(() => validateXlsxArchive(new ArrayBuffer(10)), /gültige XLSX/);
  const inflated = Buffer.from(buffer);
  for (let i = 0; i < inflated.length - 28; i++) {
    if (inflated.readUInt32LE(i) === 0x02014b50) {
      inflated.writeUInt32LE(30 * 1024 * 1024, i + 24);
      break;
    }
  }
  assert.throws(
    () =>
      validateXlsxArchive(
        inflated.buffer.slice(
          inflated.byteOffset,
          inflated.byteOffset + inflated.byteLength,
        ),
      ),
    /entpackte/,
  );
});
