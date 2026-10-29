// Conservative, local rules. No remote model calls and no inferred prices.
export function parseAmount(value) {
  let number = value.replace(/[\s\u00a0']/g, "");
  number = number.replace(/[,.][-–—−]$/, "");
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
    ...line.matchAll(
      /(\d[\d .,'\u00a0]*?(?:[-–—−])?)\s*(€|EUR|USD|GBP|\$|£)(?![a-z])/gi,
    ),
  ];
  return matches
    .map((m) => ({
      value: parseAmount(m[1]),
      currency: currencies[m[2].toUpperCase()],
      start: m.index,
      end: m.index + m[0].length,
    }))
    .filter((m) => m.value !== null);
}
export function extractOffer(pages) {
  const fields = {},
    evidence = {},
    warnings = [];
  const originalLines = pages.flatMap((page) =>
    page.text
      .split(/\r?\n/)
      .map((value) => ({ page: page.page, line: value.trim() }))
      .filter((x) => x.line),
  );
  // PDF tables often split a label and its value across separate text rows.
  // Keep the original quote while also exposing a logical label:value pair.
  const nameLabels = [
    "Anbieter",
    "Anbietername",
    "Dienstleister",
    "Studio",
    "Company",
    "Vendor",
    "Firma",
    "Caterer",
    "Restaurant",
    "Angebot von",
  ];
  const sectionHeadings =
    /^(?:leistungsumfang|leistungen|enthaltene leistungen|inklusivleistungen|inklusive folgender leistungen|fotografie|photography|videografie|videography|bearbeitungs[-\s]*(?:und\s+)?lieferzeiten|bearbeitungs-\s*und\s*lieferzeiten|lieferzeiten|preisübersicht|preise|kontakt|zahlungsbedingungen|optionale (?:leistungen|zusatzleistungen)|nicht enthalten)\s*:?$/i;
  const labels = [
    "Geplante Aufnahmezeit",
    "Veranstaltungsdatum",
    "Veranstaltungsort",
    "Hochzeitsdatum",
    "Gästeanzahl",
    "Anzahl Gäste",
    "Leistungsdauer",
    "Gesamtpreis",
    "Gesamtbetrag",
    "Angebotssumme",
    "Paketpreis",
    "Anzahlung",
    "Restbetrag",
    "Restzahlung",
    "Begleitung",
    "Lieferzeit",
    "Gültigkeit",
    "Angebotsdatum",
    "Aufnahmezeit",
    "Location",
    "Personal",
    "Team",
    "Datum",
  ];
  const allLabels = [...labels, ...nameLabels];
  const labelPattern = new RegExp(
    "^(" + labels.join("|") + ")(?:\\s*:\\s*|\\s+)(.+)$",
    "i",
  );
  const lines = originalLines.flatMap((item, index) => {
    item = { ...item, originalIndex: index };
    const label = allLabels.find(
      (label) =>
        item.line.replace(/[:\s]+$/, "").toLowerCase() === label.toLowerCase(),
    );
    if (label) {
      const next = originalLines[index + 1];
      if (
        next &&
        next.page === item.page &&
        !allLabels.some((l) =>
          new RegExp(
            "^" + l + (nameLabels.includes(l) ? "(?:\\s*:|$)" : "(?:\\s|:|$)"),
            "i",
          ).test(next.line),
        ) &&
        !sectionHeadings.test(next.line) &&
        !(nameLabels.includes(label) && moneyIn(next.line).length)
      )
        return [
          item,
          {
            page: item.page,
            originalIndex: index,
            line: label + ": " + next.line,
            quote: item.line + "\n" + next.line,
          },
        ];
    }
    const match = item.line.match(labelPattern);
    return match
      ? [item, { ...item, line: match[1] + ": " + match[2], quote: item.line }]
      : [item];
  });
  const put = (field, value, line) => {
    fields[field] = value;
    evidence[field] = [{ page: line.page, quote: line.quote || line.line }];
  };
  function choose(field, pattern, transform = (value) => value) {
    const candidates = lines.flatMap((item) => {
      const match = item.line.match(pattern);
      if (!match) return [];
      const value = transform(match[1]?.trim() || item.line, item);
      return value === undefined ? [] : [{ ...item, value }];
    });
    const unique = [...new Set(candidates.map((c) => JSON.stringify(c.value)))];
    if (unique.length === 1) put(field, candidates[0].value, candidates[0]);
    else if (unique.length > 1)
      warnings.push(
        `Mehrere Angaben zu „${field}“ gefunden. Bitte manuell prüfen.`,
      );
  }
  const providerPattern =
    /^(?:anbieter|anbietername|dienstleister|studio|company|vendor|firma|caterer|restaurant|angebot von)\s*:\s*(.{2,200})$/i;
  choose("name", providerPattern);
  if (!fields.name && !lines.some((item) => providerPattern.test(item.line))) {
    const businesses = originalLines.flatMap((item) => {
      const match = item.line.match(
        /^([\p{L}\d&'.-]+(?:\s+[\p{L}\d&'.-]+){0,4}\s+(?:videography|photography|media|films?|studio|fotostudio))\b/iu,
      );
      return match &&
        !/^(?:foto|video|preisangebot|angebot|professionelle|professionell)\b/i.test(
          match[1],
        )
        ? [{ ...item, value: match[1] }]
        : [];
    });
    const unique = [
      ...new Set(
        businesses.map((item) => item.value.toLowerCase().replace(/\s+/g, " ")),
      ),
    ];
    if (unique.length === 1) {
      const best =
        businesses.find((item) => /[a-z]/.test(item.value)) || businesses[0];
      put("name", best.value, best);
    }
  }
  const totalCandidates = lines
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
  const unit =
    "(?:(?:pro|je|per)\\s+(?:\\d+\\s+)?(?:person(?:en)?|pers\\.?|gast|gäste|guest|hour|stunde|std\\.?|tisch|table)|p\\.?\\s*p\\.?|/\\s*(?:person|pers\\.?|gast|guest|stunde|std\\.?|h|tisch|table))";
  const taxQualifier =
    "(?:(?:brutto|netto)\\s*|(?:inkl\\.?|zzgl\\.?|including|excluding)\\s*(?:\\d+[,.]?\\d*\\s*%\\s*)?(?:mwst\\.?|ust\\.?|vat)\\s*[,;]?\\s*)*";
  const unitAfter = new RegExp(
    "^\\s*" + taxQualifier + unit + "(?=\\s|$|[.,;)])",
    "i",
  );
  const unitBefore = new RegExp("\\b" + unit + "\\s*[:–-]?\\s*$", "i");
  const followingUnitLine = (item) => {
    const next =
      originalLines[item.originalIndex + (item.quote?.includes("\n") ? 2 : 1)];
    return !item.line.slice(item.end).trim() &&
      next?.page === item.page &&
      unitAfter.test(next.line)
      ? next.line
      : "";
  };
  const uncertain = (item) => {
    const before = item.line.slice(0, item.start);
    const after = item.line.slice(item.end);
    return (
      unitAfter.test(after) ||
      unitBefore.test(before) ||
      !!followingUnitLine(item) ||
      /(?:\bab|\bfrom|\bca\.?|\bcirca|\bapprox(?:imately)?\.?)\s*$/i.test(
        before,
      ) ||
      /(?:\d[\d .,'\u00a0]*\s*(?:[-–—]|bis|to)\s*|[-−]\s*)$/i.test(before)
    );
  };
  const totals = totalCandidates.filter((item) => !uncertain(item));
  const qualifiedPrices = lines
    .flatMap((item) =>
      moneyIn(item.line).map((money) => ({ ...item, ...money })),
    )
    .filter(uncertain)
    .map((item) => ({
      ...item,
      quote: [item.quote || item.line, followingUnitLine(item)]
        .filter(Boolean)
        .join("\n"),
    }));
  if (qualifiedPrices.length) {
    const unique = [
      ...new Map(
        qualifiedPrices.map((item) => [
          `${item.page}:${item.quote || item.line}`,
          item,
        ]),
      ).values(),
    ].filter(
      (item, index, all) =>
        !all.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            other.page === item.page &&
            other.quote !== item.quote &&
            other.quote.includes(item.quote),
        ),
    );
    fields.pricingNotes = unique
      .map((item) => item.quote || item.line)
      .join("\n")
      .slice(0, 4000);
    evidence.pricingNotes = unique.slice(0, 30).map((item) => ({
      page: item.page,
      quote: (item.quote || item.line).slice(0, 2000),
    }));
  }
  if (qualifiedPrices.length)
    warnings.push(
      "Einheitspreise, Preisrahmen oder unverbindliche Preisangaben erkannt. Diese Beträge wurden nicht als fester Gesamtpreis übernommen.",
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
  choose(
    "deposit",
    /^(?:anzahlung|deposit)\s*[:\-]?\s*(.+)$/i,
    (value, item) => {
      const values = moneyIn(item.line).filter(
        (money) => !uncertain({ ...item, ...money }),
      );
      return values.length === 1 ? values[0].value : null;
    },
  );
  choose(
    "balance",
    /^(?:restbetrag|restzahlung|balance)\s*[:\-]?\s*(.+)$/i,
    (value, item) => {
      const values = moneyIn(item.line).filter(
        (money) => !uncertain({ ...item, ...money }),
      );
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
  choose(
    "hours",
    /^(?:begleitung|dauer|coverage|leistungsdauer|geplante aufnahmezeit|aufnahmezeit)\s*:\s*(.+)$/i,
    (value) =>
      /\d|ganztägig|ganztags|full day/i.test(value) ? value : undefined,
  );
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
    "eventDate",
    /^(?:hochzeitsdatum|veranstaltungsdatum|datum)\s*:\s*(.+)$/i,
  );
  choose("venue", /^(?:veranstaltungsort|location)\s*:\s*(.+)$/i);
  choose("guestCount", /^(?:gästeanzahl|anzahl gäste)\s*:\s*(.+)$/i);
  function section(field, heading) {
    if (fields[field]) return;
    const start = originalLines.findIndex((item) => heading.test(item.line));
    if (start < 0) return;
    const first = originalLines[start],
      content = [];
    for (let i = start + 1; i < originalLines.length; i++) {
      const item = originalLines[i];
      if (
        item.page !== first.page ||
        sectionHeadings.test(item.line) ||
        /^(?:gesamtpreis|gesamtbetrag|angebotssumme|paketpreis)(?:\s*:|\s|$)/i.test(
          item.line,
        )
      )
        break;
      content.push(item.line);
    }
    if (content.length)
      put(field, content.join("\n").slice(0, 4000), {
        ...first,
        quote: [first.line, ...content].join("\n").slice(0, 2000),
      });
  }
  section(
    "included",
    /^(?:leistungsumfang|leistungen|enthaltene leistungen|inklusivleistungen|inklusive folgender leistungen)\s*:?$/i,
  );
  section("excluded", /^nicht enthalten\s*:?$/i);
  section("optional", /^optionale (?:leistungen|zusatzleistungen)\s*:?$/i);
  section("paymentTerms", /^zahlungsbedingungen\s*:?$/i);
  section("photos", /^(?:fotografie|photography)\s*:?$/i);
  section("video", /^(?:videografie|videography)\s*:?$/i);
  section(
    "delivery",
    /^(?:bearbeitungs[-\s]*(?:und\s+)?lieferzeiten|bearbeitungs-\s*und\s*lieferzeiten|lieferzeiten)\s*:?$/i,
  );
  for (const [field, heading] of [
    ["photoPrice", /^(?:fotografie|photography|foto)[-\s]*(?:paket|package)/i],
    [
      "videoPrice",
      /^(?:videografie|videography|video)[-\s]*(?:paket|package)/i,
    ],
  ]) {
    const found = originalLines.flatMap((item, index) => {
      if (!heading.test(item.line)) return [];
      let content = item.line,
        quote = item.line;
      if (
        !moneyIn(content).length &&
        originalLines[index + 1]?.page === item.page
      ) {
        const next = originalLines[index + 1];
        content += ": " + next.line;
        quote += "\n" + next.line;
      }
      const values = moneyIn(content)
        .map((money) => ({
          ...item,
          ...money,
          line: content,
          quote,
          originalIndex: index,
        }))
        .filter((candidate) => !uncertain(candidate));
      return values.length === 1 ? values : [];
    });
    if (new Set(found.map((item) => item.value)).size === 1)
      put(field, found[0].value, found[0]);
  }
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
  const contact = lines.filter(
    (x) =>
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|^(?:telefon|tel\.?|website|kontakt)\s*:/i.test(
        x.line,
      ) ||
      (/^\+?\d[\d ()/-]+\d$/.test(x.line) &&
        x.line.replace(/\D/g, "").length >= 8),
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
