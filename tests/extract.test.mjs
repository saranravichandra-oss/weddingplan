import test from "node:test";
import assert from "node:assert/strict";
import { extractOffer, parseAmount } from "../server/extract.mjs";
const extract = (text) =>
  extractOffer([{ page: 1, text, method: "Textdatei" }]);
test("German and English amounts preserve cents without treating unknown as zero", () => {
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("1,234.56"), 1234.56);
  assert.equal(parseAmount("1200,50"), 1200.5);
  assert.equal(parseAmount("1.000"), 1000);
  assert.equal(parseAmount("unbekannt"), null);
  assert.equal(parseAmount("0,00"), 0);
});
test("deposit, balance and optional extras never become a total", () => {
  const result = extract(
    "Anbieter: Teststudio\nAnzahlung: 500 EUR\nRestbetrag: 1500 EUR\nOptional: Album 250 EUR\nZusatzstunde: 200 EUR",
  );
  assert.equal(result.fields.price, undefined);
  assert.equal(result.fields.deposit, 500);
  assert.equal(result.fields.balance, 1500);
  assert.ok(result.fields.optional.includes("250"));
  assert.equal(result.fields.video, undefined);
});
test("conflicting totals remain unknown, evidence preserves pages", () => {
  const result = extractOffer([
    { page: 1, text: "Paketpreis: 3.200,50 EUR brutto", method: "Text" },
    { page: 2, text: "Paketpreis: 2.800 EUR", method: "Text" },
  ]);
  assert.equal(result.fields.price, undefined);
  assert.ok(result.warnings.some((w) => w.includes("Mehrere Gesamtpreise")));
  const single = extract(
    "Anbieter: Teststudio\nGesamtpreis: 3.200,50 EUR brutto\nAnzahlung: 500 EUR\nVideo: ausdrücklich nicht enthalten",
  );
  assert.equal(single.fields.price, 3200.5);
  assert.equal(single.fields.currency, "EUR");
  assert.equal(single.fields.basis, "Brutto");
  assert.equal(single.evidence.price[0].page, 1);
  assert.match(single.evidence.price[0].quote, /Gesamtpreis/);
  assert.match(single.fields.video, /nicht enthalten/);
});
test("only explicitly mentioned celebrations are proposed, no cultural inference", () => {
  const result = extract(
    "Anbieter: Tamil Wedding Photography\nPaketpreis: 1.000 EUR\nReception",
  );
  assert.deepEqual(result.fields.events, ["Reception"]);
  assert.equal(result.fields.included, undefined);
  assert.equal(result.fields.deposit, undefined);
});
test("percentage deposits stay payment terms, and excluded VAT is not gross", () => {
  const result = extract(
    "Anbieter: Teststudio\nGesamtpreis: 2.000 EUR nicht inkl. MwSt\nAnzahlung: 30 %",
  );
  assert.equal(result.fields.basis, "Netto");
  assert.equal(result.fields.deposit, null);
  assert.match(result.fields.paymentTerms, /30 %/);
});
test("table labels, section headings and separate total lines are readable proposals", () => {
  const text = `BEISPIEL MEDIA HOCHZEITSREPORTAGE
Hochzeitsdatum
21. Juni 2027
Veranstaltungsort
Potsdam
Gästeanzahl
ca. 180 Personen
Geplante Aufnahmezeit
ca. 07:00–15:00 Uhr
Team
1 Fotograf und 2 Videografen
Leistungsumfang
Begleitung des Hochzeitstages
• Gruppenbilder und Paarporträts
Fotografie
• 280–320 bearbeitete Fotos
• Galerie und Album mit 40 Seiten
Videografie
• Hochzeitsfilm 60 Minuten
• Highlightfilm 4 Minuten
Bearbeitungs- und Lieferzeiten
Fotos und Videos
2–4 Monate
Hochzeitsalbum
4–5 Monate
Preisübersicht
Videografie-Paket
1.740,00 €
Fotografie-Paket inklusive Album
2.100,00 €
Gesamtpreis
3.840,00 €
Anfahrt und Übernachtung sind enthalten.
Beispiel Media KONTAKT`;
  for (const value of [
    text,
    text.replaceAll(
      /(Hochzeitsdatum|Veranstaltungsort|Gästeanzahl|Geplante Aufnahmezeit|Team)\n/g,
      "$1 ",
    ),
  ]) {
    const result = extractOffer([{ page: 3, text: value, method: "PDF-Text" }]);
    assert.equal(result.fields.name, "Beispiel Media");
    assert.equal(result.fields.price, 3840);
    assert.equal(result.fields.photoPrice, 2100);
    assert.equal(result.fields.videoPrice, 1740);
    assert.equal(result.fields.team, "1 Fotograf und 2 Videografen");
    assert.equal(result.fields.hours, "ca. 07:00–15:00 Uhr");
    assert.equal(result.fields.venue, "Potsdam");
    assert.equal(result.fields.eventDate, "21. Juni 2027");
    assert.match(result.fields.photos, /280–320/);
    assert.match(result.fields.video, /60 Minuten/);
    assert.match(result.fields.delivery, /4–5 Monate/);
    assert.equal(result.fields.basis, undefined);
    assert.equal(result.evidence.price[0].page, 3);
    assert.match(result.evidence.price[0].quote, /Gesamtpreis\n3.840,00 €/);
  }
});
