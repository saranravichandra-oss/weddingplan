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

test("German whole-euro dash notation preserves the amount without accepting negative or incomplete numbers", () => {
  for (const value of ["2.500,-", "2.500,–", "2.500, —", "2.500.−"])
    assert.equal(parseAmount(value), 2500, value);
  assert.equal(parseAmount("159,–"), 159);
  assert.equal(parseAmount("1000-"), null);
  assert.equal(parseAmount("-1000"), null);
  assert.equal(extract("Gesamtpreis: 2.500,– EUR brutto").fields.price, 2500);
  const unit = extract("Paketpreis: 159,– € pro Person");
  assert.equal(unit.fields.price, undefined);
  assert.match(unit.fields.pricingNotes, /159,–/);
});

test("catering and decoration offers retain explicit provider labels and separated scope sections", () => {
  const result = extract(`Firma
Beispiel Festservice GmbH
Enthaltene Leistungen:
Buffet für 200 Personen
Servicepersonal für sechs Stunden
Nicht enthalten:
Getränke
Optionale Leistungen:
Zusätzliche Deko
Zahlungsbedingungen:
30 % bei Bestätigung
Preisübersicht
Gesamtpreis
2.500,- € brutto`);
  assert.equal(result.fields.name, "Beispiel Festservice GmbH");
  assert.equal(result.fields.price, 2500);
  assert.equal(result.fields.basis, "Brutto");
  assert.equal(
    result.fields.included,
    "Buffet für 200 Personen\nServicepersonal für sechs Stunden",
  );
  assert.equal(result.fields.excluded, "Getränke");
  assert.equal(result.fields.optional, "Zusätzliche Deko");
  assert.equal(result.fields.paymentTerms, "30 % bei Bestätigung");
  assert.match(result.evidence.name[0].quote, /Firma\nBeispiel/);
  for (const label of ["Caterer", "Restaurant", "Angebot von", "Anbietername"])
    assert.equal(
      extract(`${label}: Beispiel Dienstleistung`).fields.name,
      "Beispiel Dienstleistung",
    );
});

test("empty provider labels never consume the next price label or a service heading", () => {
  for (const next of [
    "Gesamtpreis: 1.000 EUR",
    "Gesamtpreis:\n1.000 EUR",
    "Enthaltene Leistungen:\nBuffet für 200 Personen",
  ]) {
    assert.equal(extract(`Firma:\n${next}`).fields.name, undefined, next);
  }
  assert.equal(
    extract("Firma: Beispiel Küche\nAnbieter: Anderer Festservice").fields.name,
    undefined,
  );
  assert.equal(
    extract(
      "Firma: Beispiel Photography\nAnbieter: Anderer Festservice\nBeispiel Photography",
    ).fields.name,
    undefined,
  );
  assert.equal(
    extract("Firma:\nStudio Beispiel").fields.name,
    "Studio Beispiel",
  );
  assert.equal(extract("Firma:\nDatum 17.05.2027").fields.name, undefined);
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

test("per-person and hourly package prices never become the wedding total", () => {
  for (const line of [
    "Paketpreis: 159 EUR pro Person",
    "Paketpreis pro Gast: 59,90 EUR",
    "Gesamtpreis: 159 EUR p. P.",
    "Paketpreis: 150 EUR / Stunde",
    "Total price: 150 EUR per guest",
    "Paketpreis: 159 EUR inkl. 19 % MwSt pro Person",
    "Paketpreis: 159 EUR netto pro Person",
    "Paketpreis: 600 EUR pro Tisch",
    "Paketpreis: 600 EUR pro 10 Personen",
    "Paketpreis\n159 EUR\npro Person",
  ]) {
    const result = extract(line);
    assert.equal(result.fields.price, undefined, line);
    assert.ok(
      result.warnings.some((warning) => warning.includes("Einheitspreis")),
      line,
    );
    assert.ok(result.fields.pricingNotes, line);
  }
});

test("a price labelled only per person is preserved as a source note without calculating a total", () => {
  const result = extract(
    "Anbieter: Cateringfixture\nPreis pro Person: 59,90 EUR\nGästeanzahl: 200 Personen",
  );
  assert.equal(result.fields.price, undefined);
  assert.match(result.fields.pricingNotes, /Preis pro Person: 59,90 EUR/);
  assert.equal(result.evidence.pricingNotes[0].page, 1);
  const split = extract("Paketpreis\n159 EUR\npro Person");
  assert.match(split.fields.pricingNotes, /pro Person/);
});

test("a stated total is kept separately from a per-person breakdown", () => {
  const result = extract("Gesamtpreis: 3.000 EUR (150 EUR pro Person)");
  assert.equal(result.fields.price, 3000);
});

test("unit rates and estimates are not treated as full deposits or photo/video package subtotals", () => {
  const result = extract(
    "Fotografie-Paket: 150 EUR pro Stunde\nVideografie-Paket\n200 EUR\npro Stunde\nAnzahlung: 15 EUR pro Gast\nRestbetrag: ab 150 EUR",
  );
  assert.equal(result.fields.photoPrice, undefined);
  assert.equal(result.fields.videoPrice, undefined);
  assert.equal(result.fields.deposit, null);
  assert.equal(result.fields.balance, null);
});

test("starting prices, estimates, ranges and negative amounts are not fixed totals", () => {
  for (const line of [
    "Paketpreis: ab 1500 EUR",
    "Gesamtpreis: ca. 3000 EUR",
    "Paketpreis: 1000–1500 EUR",
    "Gesamtpreis: -100 EUR",
  ]) {
    assert.equal(extract(line).fields.price, undefined, line);
  }
  assert.equal(
    extract("Gesamtpreis: 3000 EUR für ca. 150 Gäste").fields.price,
    3000,
  );
  assert.equal(extract("Gesamtpreis: 0 EUR").fields.price, 0);
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
