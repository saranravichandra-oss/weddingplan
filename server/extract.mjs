// Conservative, local rules. No remote model calls and no inferred prices.
export function parseAmount(value) {
  let number = value.replace(/[\s\u00a0']/g, "");
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(number))
    number = number.replaceAll(".", "").replace(",", ".");
  else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(number))
    number = number.replaceAll(",", "");
  else if (/^\d+(?:,\d{1,2})?$/.test(number)) number = number.replace(",", ".");
  else if (!/^\d+(?:\.\d{1,2})?$/.test(number)) return null;
  const parsed = Number(number);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000000
    ? parsed
    : null;
}
const currencies = {
  "€": "EUR",
  EUR: "EUR",
  $: "USD",
  USD: "USD",
  "£": "GBP",
  GBP: "GBP",
};
function moneyIn(line) {
  const matches = [
    ...line.matchAll(/(\d[\d .,'\u00a0]*?)\s*(€|EUR|USD|GBP|\$|£)(?![a-z])/gi),
  ];
  return matches
    .map((m) => ({
      value: parseAmount(m[1]),
      currency: currencies[m[2].toUpperCase()],
    }))
    .filter((m) => m.value !== null);
}
export function extractOffer(pages) {
  const fields = {},
    evidence = {},
    warnings = [];
  const lines = pages.flatMap((page) =>
    page.text
      .split(/\r?\n/)
      .map((value) => ({ page: page.page, line: value.trim() }))
      .filter((x) => x.line),
  );
  const put = (field, value, line) => {
    fields[field] = value;
    evidence[field] = [{ page: line.page, quote: line.line }];
  };
  function choose(field, pattern, transform = (value) => value) {
    const candidates = lines.flatMap((item) => {
      const match = item.line.match(pattern);
      return match
        ? [{ ...item, value: transform(match[1]?.trim() || item.line) }]
        : [];
    });
    const unique = [...new Set(candidates.map((c) => JSON.stringify(c.value)))];
    if (unique.length === 1) put(field, candidates[0].value, candidates[0]);
    else if (unique.length > 1)
      warnings.push(
        `Mehrere Angaben zu „${field}“ gefunden. Bitte manuell prüfen.`,
      );
  }
  choose(
    "name",
    /^(?:anbieter|dienstleister|studio|company|vendor)\s*:\s*(.{2,200})$/i,
  );
  const totals = lines
    .filter(
      (x) =>
        /(?:gesamtpreis|paketpreis|gesamtbetrag|angebotssumme|total(?:\s+price)?|grand\s+total)/i.test(
          x.line,
        ) &&
        !/(anzahlung|rest(?:betrag|zahlung)|optional|aufpreis|zusatz|rabatt|nachlass|abzüglich|discount|deposit|balance)/i.test(
          x.line,
        ),
    )
    .flatMap((item) =>
      moneyIn(item.line).map((money) => ({ ...item, ...money })),
    );
  const uniqueTotals = [
    ...new Set(totals.map((t) => `${t.currency}:${t.value}`)),
  ];
  if (uniqueTotals.length === 1) {
    put("price", totals[0].value, totals[0]);
    put("currency", totals[0].currency, totals[0]);
  } else if (uniqueTotals.length > 1)
    warnings.push(
      "Mehrere Gesamtpreise oder Währungen gefunden. Kein Preis wurde automatisch ausgewählt.",
    );
  else
    warnings.push(
      "Kein eindeutig beschrifteter Gesamtpreis gefunden. Anzahlung und Restbetrag wurden nicht als Paketpreis übernommen.",
    );
  choose("deposit", /^(?:anzahlung|deposit)\s*[:\-]?\s*(.+)$/i, (value) => {
    const values = moneyIn(value);
    return values.length === 1 ? values[0].value : null;
  });
  choose(
    "balance",
    /^(?:restbetrag|restzahlung|balance)\s*[:\-]?\s*(.+)$/i,
    (value) => {
      const values = moneyIn(value);
      return values.length === 1 ? values[0].value : null;
    },
  );
  const gross = lines.filter(
    (x) =>
      !/nicht\s+inkl/i.test(x.line) &&
      /\bbrutto\b|\binkl\.?\s*(?:\d+[,.]?\d*\s*%\s*)?(?:mwst|ust|umsatzsteuer)|including\s+vat/i.test(
        x.line,
      ),
  );
  const net = lines.filter((x) =>
    /\bnetto\b|(?:zzgl\.?|ohne|nicht\s+inkl\.?)\s*(?:\d+[,.]?\d*\s*%\s*)?(?:mwst|ust|umsatzsteuer)|excluding\s+vat/i.test(
      x.line,
    ),
  );
  if (gross.length && !net.length) put("basis", "Brutto", gross[0]);
  else if (net.length && !gross.length) put("basis", "Netto", net[0]);
  else if (gross.length && net.length)
    warnings.push(
      "Netto- und Bruttoangaben gefunden. Preisbasis bitte selbst zuordnen.",
    );
  choose("hours", /^(?:begleitung|dauer|coverage|leistungsdauer)\s*:\s*(.+)$/i);
  choose("team", /^(?:team|personal|fotografen|videografen)\s*:\s*(.+)$/i);
  choose(
    "photos",
    /^(?:fotos|bilder|bearbeitete (?:fotos|bilder)|photos)\s*:\s*(.+)$/i,
  );
  choose("video", /^(?:video|film|filme|highlightfilm)\s*:\s*(.+)$/i);
  choose("delivery", /^(?:lieferzeit|lieferung|delivery)\s*:\s*(.+)$/i);
  choose("validity", /^(?:gültig bis|gültigkeit|valid until)\s*:\s*(.+)$/i);
  choose("offerDate", /^(?:angebotsdatum|offer date)\s*:\s*(.+)$/i);
  choose("packageName", /^(?:paket|package|leistungspaket)\s*:\s*(.+)$/i);
  choose(
    "extraHours",
    /^(?:zusatzstunde|mehrstunde|zusätzliche stunde|extra hour)\s*:\s*(.+)$/i,
  );
  for (const [key, pattern] of Object.entries({
    included: /^(?:enthalten|inklusive|inkludiert|included)\s*:\s*(.+)$/i,
    excluded:
      /^(?:nicht enthalten|ausgeschlossen|excluded|not included)\s*:\s*(.+)$/i,
    optional:
      /^(?:optional|optionale zusatzleistungen|optional extras)\s*:\s*(.+)$/i,
    extras:
      /^(?:fahrtkosten|anfahrt|reisekosten|übernachtung|nebenkosten|travel|accommodation)\s*[:\-]?\s*(.+)$/i,
    paymentTerms:
      /^(?:zahlungsbedingungen|zahlungsfrist|payment terms)\s*:\s*(.+)$/i,
  })) {
    const found = lines.filter((x) => pattern.test(x.line));
    if (found.length) {
      fields[key] = found.map((x) => x.line).join("\n");
      evidence[key] = found.map((x) => ({ page: x.page, quote: x.line }));
    }
  }
  const percentageDeposit = lines.filter(
    (x) => /^(?:anzahlung|deposit)\s*:/i.test(x.line) && /\d+\s*%/.test(x.line),
  );
  if (percentageDeposit.length) {
    fields.paymentTerms = [
      fields.paymentTerms,
      ...percentageDeposit.map((x) => x.line),
    ]
      .filter(Boolean)
      .join("\n");
    evidence.paymentTerms = [
      ...(evidence.paymentTerms || []),
      ...percentageDeposit.map((x) => ({ page: x.page, quote: x.line })),
    ];
  }
  const contact = lines.filter((x) =>
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|^(?:telefon|tel\.?|website|kontakt)\s*:/i.test(
      x.line,
    ),
  );
  if (contact.length) {
    fields.contact = contact.map((x) => x.line).join("\n");
    evidence.contact = contact.map((x) => ({ page: x.page, quote: x.line }));
  }
  const eventNames = [
    ["Standesamt", /standesamt|civil ceremony/i],
    [
      "Tamilische Zeremonie",
      /tamilische? (?:zeremonie|trauung)|tamil ceremony/i,
    ],
    ["Reception", /reception|hochzeitsfeier/i],
  ];
  fields.events = eventNames
    .filter(([, regex]) => lines.some((x) => regex.test(x.line)))
    .map(([name]) => name);
  if (fields.events.length)
    evidence.events = lines
      .filter((x) => eventNames.some(([, re]) => re.test(x.line)))
      .map((x) => ({ page: x.page, quote: x.line }));
  if (!fields.basis) warnings.push("Preisbasis nicht eindeutig angegeben.");
  if (!fields.extras)
    warnings.push(
      "Neben- und Fahrtkosten nicht eindeutig angegeben. Der Endpreis kann unvollständig sein.",
    );
  if (!fields.name) warnings.push("Anbietername bitte manuell ergänzen.");
  fields.questions = warnings.join("\n");
  return {
    fields,
    evidence,
    warnings,
    pages,
    engine: "Lokale Texterkennung + nachvollziehbare Regeln",
    analyzedAt: new Date().toISOString(),
  };
}
