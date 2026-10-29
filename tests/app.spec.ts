import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { offerImage } from "./fixtures.mjs";
import { guestWorkbook } from "./guest-workbook.mjs";
const email = "browser-one@example.test";
const password = "OnlyForBrowserFixtures2027";
async function login(page: Page, asPartner = false) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "E-Mail als Anmeldename" })
    .fill(asPartner ? "browser-two@example.test" : email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
}
async function section(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name, exact: true })
    .click();
}
test.beforeAll(async ({ request }) => {
  const status = await (await request.get("/api/auth/status")).json();
  const created = await request.post(
    status.setupRequired ? "/api/auth/setup" : "/api/auth/login",
    { data: { name: "Browserperson 1", email, password } },
  );
  expect(created.ok()).toBeTruthy();
  const auth = await created.json();
  const existing = await (await request.get("/api/state")).json();
  if (existing.members.length === 2) return;
  const invitation = await request.post("/api/invitations", {
    headers: { "X-CSRF-Token": auth.csrf },
  });
  const data = await invitation.json();
  const joined = await request.post("/api/auth/accept", {
    data: {
      name: "Browserperson 2",
      email: "browser-two@example.test",
      password,
      invitation: data.invitation,
    },
  });
  expect(joined.ok()).toBeTruthy();
});
test("all planning areas work on desktop and mobile with no runtime errors or horizontal page overflow", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    for (const name of [
      "Übersicht",
      "Dienstleister",
      "Entdecken",
      "Gäste",
      "Budget",
      "Aufgaben",
      "Veranstaltungen",
      "Dokumente",
      "Gemeinsam",
    ]) {
      await section(page, name);
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      if (name === "Übersicht")
        await page.screenshot({
          path: testInfo.outputPath(`dashboard-${width}.png`),
          fullPage: true,
        });
      if (name === "Entdecken") {
        await expect(
          page.getByRole("heading", { name: /Hier könnte eure/ }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`discover-${width}.png`),
          fullPage: true,
        });
      }
    }
  }
  expect(errors).toEqual([]);
});
test("text extraction proposes values with source evidence; confirmed unknown price survives reload", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Text einfügen", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Angebotstext", exact: true })
    .fill(
      "Anbieter: Browser-Teststudio\nAnzahlung: 500 EUR\nOptional: Album 250 EUR",
    );
  await page
    .getByRole("button", { name: "Text speichern und auswerten" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Browser-Teststudio");
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("");
  await page
    .getByText("Weitere Angebotsdetails und offene Punkte", { exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Anzahlung", exact: true }),
  ).toHaveValue("500");
  await expect(page.locator(".field-source").first()).toContainText(
    "Fundstelle",
  );
  await page
    .getByRole("checkbox", { name: /Ich habe Original und Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", { name: "Bestätigt in den Vergleich übernehmen" })
    .click();
  await expect(
    page.getByRole("columnheader", { name: /Browser-Teststudio/ }),
  ).toBeVisible();
  await expect(page.locator(".price-cell")).toContainText("Nicht angegeben");
  await page.reload();
  await section(page, "Dienstleister");
  await expect(
    page.getByRole("columnheader", { name: /Browser-Teststudio/ }),
  ).toBeVisible();
  await section(page, "Budget");
  await expect(
    page.locator(".stat").filter({ hasText: "Bekannt beauftragt" }),
  ).toContainText("1.000");
});
test("actual screenshot OCR fills a price and keeps its page source", async ({
  page,
}) => {
  test.setTimeout(60000);
  await login(page);
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await page.getByLabel("Angebotsdatei auswählen").setInputFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: offerImage().png,
  });
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Teststudio", { timeout: 40000 });
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("3200");
  await expect(
    page.getByAltText("Gespeichertes Originalangebot"),
  ).toBeVisible();
  await expect(page.locator(".document-text")).toContainText("3.200,00 EUR");
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  await section(page, "Dokumente");
  await expect(page.getByText("fixture.png", { exact: true })).toBeVisible();
});
test("guest responses remain separate for each event and are saved", async ({
  page,
}) => {
  await login(page);
  await section(page, "Gäste");
  await page.getByRole("button", { name: "Gast hinzufügen" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Browser-Testgast");
  await dialog
    .getByLabel("Reception: Einladung & Rückmeldung")
    .selectOption("Zugesagt");
  await dialog.getByRole("button", { name: "Dauerhaft speichern" }).click();
  const row = page.getByRole("row").filter({ hasText: "Browser-Testgast" });
  await expect(row).toContainText("Zugesagt");
  await expect(
    row.getByRole("cell", { name: "Nicht eingeladen", exact: true }),
  ).toHaveCount(2);
  await page.reload();
  await section(page, "Gäste");
  await expect(
    page.getByRole("row").filter({ hasText: "Browser-Testgast" }),
  ).toContainText("Zugesagt");
});
test("the second account receives saved task updates", async ({
  page,
  browser,
}) => {
  await login(page);
  await section(page, "Aufgaben");
  await page.getByRole("button", { name: "Aufgabe anlegen" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Aufgabe", exact: true })
    .fill("Gemeinsame Browser-Aufgabe");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dauerhaft speichern" })
    .click();
  const context = await browser.newContext();
  const partner = await context.newPage();
  await login(partner, true);
  await section(partner, "Aufgaben");
  await expect(
    partner.getByRole("button", {
      name: "Gemeinsame Browser-Aufgabe: als erledigt markieren",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Gemeinsame Browser-Aufgabe: als erledigt markieren",
    })
    .click();
  await expect(
    partner.getByRole("button", {
      name: "Gemeinsame Browser-Aufgabe: wieder öffnen",
    }),
  ).toBeVisible({ timeout: 12000 });
  await context.close();
});
test("saved budget scenarios distinguish unknown from explicit zero and count existing bookings once", async ({
  page,
}) => {
  await login(page);
  await section(page, "Budget");
  await expect(page.locator(".scenario-result")).toContainText(
    "Noch unvollständig",
  );
  await page.getByRole("button", { name: /Werte bearbeiten/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("spinbutton", { name: "Weitere feste Kosten für das Szenario" })
    .fill("0");
  await dialog
    .getByRole("spinbutton", { name: "Kosten pro Gast für das Szenario" })
    .fill("100");
  await dialog.getByRole("button", { name: "Dauerhaft speichern" }).click();
  await expect(page.locator(".scenario-result strong")).toHaveText(/21.000/);
  await page.getByRole("button", { name: "220 Gäste", exact: true }).click();
  await expect(page.locator(".scenario-result strong")).toHaveText(/23.000/);
  await page.reload();
  await section(page, "Budget");
  await expect(page.locator(".scenario-result strong")).toHaveText(/21.000/);
});

test("Excel guest import previews households, preserves open responses and skips repeated names", async ({
  page,
}) => {
  await login(page);
  await section(page, "Gäste");
  await page
    .getByRole("button", { name: "Excel importieren", exact: true })
    .click();
  const file = {
    name: "synthetic-guests.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: guestWorkbook([
      ["Gästeliste", "Anz.", "Prio"],
      [null, null, "beides", "thaali", "rezeption"],
      [],
      ["Browser Import Family", 4, "x"],
      ["Browser Import Single", 1, null, null, "x"],
      ["Browser Import Open", 2],
      ["Browser Import Family", 4, "x"],
    ]),
  };
  await page.getByLabel("Excel-Gästeliste auswählen").setInputFiles(file);
  const button = page.getByRole("button", {
    name: "3 Einträge mit 7 Personen importieren",
    exact: true,
  });
  await expect(button).toBeEnabled();
  const before = await (await page.request.get("/api/state")).json();
  expect(
    before.guests.some(
      (g: { name: string }) => g.name === "Browser Import Family",
    ),
  ).toBeFalsy();
  await expect(page.locator(".import-preview")).toContainText(
    "Namensgleichheit",
  );
  await button.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const family = page.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: /Browser Import Family/ }),
  });
  await expect(family).toContainText("4 Personen");
  await expect(
    family.getByRole("cell", { name: "Vorgesehen", exact: true }),
  ).toHaveCount(2);
  await expect(
    family.getByRole("cell", { name: "Nicht angegeben", exact: true }),
  ).toHaveCount(1);
  await page.reload();
  await section(page, "Gäste");
  await expect(
    page.getByRole("rowheader", { name: /Browser Import Family/ }),
  ).toContainText("4 Personen");
  await page
    .getByRole("button", { name: "Excel importieren", exact: true })
    .click();
  await page.getByLabel("Excel-Gästeliste auswählen").setInputFiles(file);
  await expect(
    page.getByRole("button", {
      name: "0 Einträge mit 0 Personen importieren",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Dialog schließen" }).click();
});

test("navigation links preserve the current workspace and browser back returns to the previous section", async ({
  page,
}) => {
  await login(page);
  await section(page, "Gäste");
  await expect(page).toHaveURL(/bereich=gaeste/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Eure Lieblingsmenschen.", exact: true }),
  ).toBeVisible();
  await section(page, "Aufgaben");
  await expect(page).toHaveURL(/bereich=aufgaben/);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Eure Lieblingsmenschen.", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { name: "Gäste", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("unsaved offer corrections survive closing and reloading and are never saved as confirmed automatically", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  const discard = page.getByRole("button", {
    name: "Entwurf verwerfen",
    exact: true,
  });
  if (await discard.isVisible()) await discard.click();
  await page
    .getByRole("textbox", { name: "Anbieter", exact: true })
    .fill("Ungespeicherter Browser-Entwurf");
  await page
    .getByRole("spinbutton", { name: "Gesamtpreis", exact: true })
    .fill("4567");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Entwurf in diesem Tab gesichert" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Ungespeicherter Browser-Entwurf");
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("4567");
  const state = await (await page.request.get("/api/state")).json();
  expect(
    state.offers.some(
      (offer: { name: string }) =>
        offer.name === "Ungespeicherter Browser-Entwurf",
    ),
  ).toBeFalsy();
  await page
    .getByRole("button", { name: "Entwurf verwerfen", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Dialog schließen" }).click();
});

test("researched suggestions stay separate until explicitly remembered and keep their sources and unresolved terms", async ({
  page,
}) => {
  await login(page);
  const before = await (await page.request.get("/api/state")).json();
  await section(page, "Entdecken");
  await expect(page.getByRole("article")).toHaveCount(14);
  await page.getByRole("button", { name: /^Location/ }).click();
  await expect(page.getByRole("article")).toHaveCount(6);
  await page
    .getByRole("searchbox", { name: "Vorschläge durchsuchen" })
    .fill("Meistersaal");
  const card = page.getByRole("article", { name: "Meistersaal", exact: true });
  await expect(card).toContainText("220 Tafel / 150 Gala");
  await expect(card.getByRole("link", { name: /^Quelle/ })).toHaveAttribute(
    "href",
    "https://www.meistersaal-berlin.de/raeume/",
  );
  await card.getByRole("button", { name: "Details & Fragen" }).click();
  const dialog = page.getByRole("dialog", { name: "Meistersaal", exact: true });
  await expect(dialog.getByRole("link", { name: /FAQ/ })).toHaveAttribute(
    "href",
    "https://www.meistersaal-berlin.de/faq/fqs-meistersaal/",
  );
  await dialog.getByText("Anfragetext vorbereiten", { exact: true }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Anfragetext", exact: true }),
  ).toHaveValue(/der genaue Termin ist noch abzustimmen/);
  const untouched = await (await page.request.get("/api/state")).json();
  expect(untouched.providers).toEqual(before.providers);
  expect(untouched.offers).toEqual(before.offers);
  await dialog
    .getByRole("button", { name: "Gemeinsam merken", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Gemerkt", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Dialog schließen" }).click();
  await page.reload();
  await page
    .getByRole("checkbox", { name: "Nur gemerkte", exact: true })
    .check();
  await expect(page.getByRole("article")).toHaveCount(1);
  const after = await (await page.request.get("/api/state")).json();
  expect(after.providers.length).toBe(before.providers.length + 1);
  expect(after.costs).toEqual(before.costs);
  expect(after.offers).toEqual(before.offers);
  expect(after.events).toEqual(before.events);
  const remembered = after.providers.find(
    (value: { name: string }) => value.name === "Meistersaal",
  );
  expect(remembered.status).toBe("Gefunden");
  expect(remembered.notes).toContain("159 € brutto / Person, Basis 150 Gäste");
  expect(remembered.notes).toContain(
    "https://www.meistersaal-berlin.de/faq/fqs-meistersaal/",
  );
  await section(page, "Dienstleister");
  await expect(
    page.locator(".contact-row").filter({ hasText: "Meistersaal" }),
  ).toContainText("Gefunden");
});

test("blocked tab storage warns before discarding and does not turn a successful save into an error", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem,
      remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("wedding-ss:offer-draft:"))
        throw new DOMException("Disabled for test", "SecurityError");
      return set.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key) {
      if (key.startsWith("wedding-ss:offer-draft:"))
        throw new DOMException("Disabled for test", "SecurityError");
      return remove.call(this, key);
    };
  });
  await login(page);
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Anbieter", exact: true })
    .fill("Storage-blocked Browser Fixture");
  await expect(
    page.getByText(/der Browser erlaubt gerade keine lokale Sicherung/),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page
    .getByRole("button", { name: "Dialog schließen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("checkbox", { name: /Ich habe Original und Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", {
      name: "Bestätigt in den Vergleich übernehmen",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const state = await (await page.request.get("/api/state")).json();
  expect(
    state.offers.filter(
      (offer: { name: string }) =>
        offer.name === "Storage-blocked Browser Fixture",
    ),
  ).toHaveLength(1);
});

test("mobile offers show readable complete cards and can switch to a side by side comparison", async ({
  page,
}, testInfo) => {
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  for (const data of [
    {
      name: "Mobil Foto & Film",
      price: 2450,
      photos: "250 bearbeitete Bilder",
      video: "60 Minuten Film und ein Highlight",
      team: "2 Foto + 1 Video",
      hours: "8 Stunden",
      delivery: "12 Wochen",
      included: "Galerie und Datendownload",
      optional: "Album extra",
      evidence: { photos: [{ page: 1, quote: "250 bearbeitete Bilder" }] },
    },
    {
      name: "Mobil Zweite Auswahl",
      price: null,
      photos: "Umfang noch offen",
      video: "Nicht enthalten",
    },
  ]) {
    const response = await page.request.post("/api/records/offers", {
      headers: { "X-CSRF-Token": auth.csrf },
      data: { ...data, currency: "EUR", confirmed: true },
    });
    expect(response.ok()).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 950 });
  await section(page, "Dienstleister");
  await page.getByRole("searchbox", { name: "Anbieter suchen" }).fill("Mobil");
  await expect(
    page.getByRole("button", { name: "Kartenübersicht", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const card = page.getByRole("article", {
    name: "Mobil Foto & Film",
    exact: true,
  });
  await expect(card).toContainText("2.450");
  await expect(card).toContainText("250 bearbeitete Bilder");
  await expect(card).toContainText("60 Minuten Film");
  await expect(card).toContainText("12 Wochen");
  await expect(card).toContainText("Fundstelle: Seite 1");
  await expect(
    page
      .getByRole("article", { name: "Mobil Zweite Auswahl", exact: true })
      .locator(".offer-card-price"),
  ).toContainText("Nicht angegeben");
  await card
    .getByRole("button", { name: "Als Favorit markieren", exact: true })
    .click();
  await expect(card).toContainText("Favorit aufheben");
  await page.screenshot({
    path: testInfo.outputPath("offer-cards-390.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: testInfo.outputPath("offer-cards-viewport-390.png"),
  });
  await page
    .getByRole("button", { name: "Nebeneinander", exact: true })
    .click();
  await expect(page.locator(".live-comparison")).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: /Mobil Foto & Film/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Kartenübersicht", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Original & Angaben", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Mobil Foto & Film");
  await page.getByRole("button", { name: "Dialog schließen" }).click();
});

test("a shared section link keeps its destination through sign in", async ({
  page,
}) => {
  await page.goto("/?bereich=entdecken");
  await page
    .getByRole("textbox", { name: "E-Mail als Anmeldename" })
    .fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Hier könnte eure/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(/bereich=entdecken/);
});

test("simultaneous offer edits preserve both accounts and ask for competing values before saving", async ({
  page,
  browser,
}) => {
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  const response = await page.request.post("/api/records/offers", {
    headers: { "X-CSRF-Token": auth.csrf },
    data: {
      name: "Gemeinsamer Browser-Vergleich",
      price: 1000,
      currency: "EUR",
      delivery: "8 Wochen",
      confirmed: true,
    },
  });
  expect(response.ok()).toBeTruthy();
  const original = await response.json();
  await page.reload();
  await section(page, "Dienstleister");
  await page
    .getByRole("searchbox", { name: "Anbieter suchen" })
    .fill(original.name);
  await page
    .getByRole("button", { name: "Original & Angaben", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Gesamtpreis", exact: true })
    .fill("1200");
  const confirmation = page.getByRole("checkbox", {
    name: /Ich habe Original und Angaben geprüft/,
  });
  await confirmation.check();
  const partnerContext = await browser.newContext();
  try {
    const partner = await partnerContext.newPage();
    await login(partner, true);
    const partnerAuth = await (
      await partner.request.get("/api/auth/me")
    ).json();
    // Create a real stale-write race after the form's version has been sent.
    await page.route(
      `**/api/records/offers/${original.id}`,
      async (route) => {
        const changed = await partner.request.put(
          `/api/records/offers/${original.id}`,
          {
            headers: { "X-CSRF-Token": partnerAuth.csrf },
            data: {
              ...original,
              price: 1300,
              delivery: "12 Wochen",
              manualFields: ["price", "delivery"],
            },
          },
        );
        expect(changed.ok()).toBeTruthy();
        await route.continue();
      },
      { times: 1 },
    );
    await page
      .getByRole("button", {
        name: "Bestätigt in den Vergleich übernehmen",
        exact: true,
      })
      .click();
    const conflicts = page.getByRole("region", {
      name: "Gemeinsame Änderungen prüfen",
    });
    await expect(conflicts).toBeVisible();
    await expect(
      conflicts.getByRole("button", {
        name: "Änderungen zusammenführen",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", {
        name: "Bestätigt in den Vergleich übernehmen",
        exact: true,
      }),
    ).toBeDisabled();
    await conflicts
      .getByRole("group", { name: "Gesamtpreis", exact: true })
      .getByRole("radio")
      .first()
      .check();
    await conflicts
      .getByRole("button", { name: "Änderungen zusammenführen", exact: true })
      .click();
    await expect(conflicts).toHaveCount(0);
    await expect(
      page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
    ).toHaveValue("1200");
    await expect(
      page.getByRole("textbox", {
        name: "Bearbeitungs- und Lieferzeiten",
        exact: true,
      }),
    ).toHaveValue("12 Wochen");
    await expect(confirmation).not.toBeChecked();
    const notYetSaved = await (await page.request.get("/api/state")).json();
    expect(
      notYetSaved.offers.find(
        (offer: { id: string }) => offer.id === original.id,
      ).price,
    ).toBe(1300);
    await confirmation.check();
    await page
      .getByRole("button", {
        name: "Bestätigt in den Vergleich übernehmen",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const final = await (await partner.request.get("/api/state")).json();
    const merged = final.offers.find(
      (offer: { id: string }) => offer.id === original.id,
    );
    expect(merged.price).toBe(1200);
    expect(merged.delivery).toBe("12 Wochen");
    expect(merged.version).toBe(3);
    expect(merged.manualFields).toContain("delivery");
  } finally {
    await partnerContext.close();
  }
});

test("different shared originals never mix package fields and a local draft can become a separate offer", async ({
  page,
}) => {
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  const headers = { "X-CSRF-Token": auth.csrf };
  const firstDoc = await (
    await page.request.post("/api/documents/text", {
      headers,
      data: { text: "Anbieter: Quellenfixture\nGesamtpreis: 1000 EUR" },
    })
  ).json();
  const secondDoc = await (
    await page.request.post("/api/documents/text", {
      headers,
      data: { text: "Anbieter: Quellenfixture\nGesamtpreis: 1500 EUR" },
    })
  ).json();
  const original = await (
    await page.request.post("/api/records/offers", {
      headers,
      data: {
        name: "Getrennte Browser-Originale",
        price: 1000,
        currency: "EUR",
        documentId: firstDoc.id,
        confirmed: true,
      },
    })
  ).json();
  await page.reload();
  await section(page, "Dienstleister");
  await page
    .getByRole("searchbox", { name: "Anbieter suchen" })
    .fill(original.name);
  await page
    .getByRole("button", { name: "Original & Angaben", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Gesamtpreis", exact: true })
    .fill("1100");
  const update = await page.request.put(`/api/records/offers/${original.id}`, {
    headers,
    data: { ...original, price: 1500, documentId: secondDoc.id },
  });
  expect(update.ok()).toBeTruthy();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const conflicts = page.getByRole("region", {
    name: "Gemeinsame Änderungen prüfen",
  });
  await expect(conflicts).toContainText("unterschiedliche Originale");
  await expect(
    conflicts.getByRole("button", {
      name: "Änderungen zusammenführen",
      exact: true,
    }),
  ).toHaveCount(0);
  await conflicts
    .getByRole("button", {
      name: "Entwurf als eigenes Angebot weiterführen",
      exact: true,
    })
    .click();
  await expect(conflicts).toHaveCount(0);
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("1100");
  await page
    .getByRole("checkbox", { name: /Ich habe Original und Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", {
      name: "Bestätigt in den Vergleich übernehmen",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const state = await (await page.request.get("/api/state")).json();
  expect(
    state.offers.find((value: { id: string }) => value.id === original.id)
      .price,
  ).toBe(1500);
  const separate = state.offers.find(
    (value: { id: string; name: string }) =>
      value.name === original.name && value.id !== original.id,
  );
  expect(separate.price).toBe(1100);
  expect(separate.documentId).toBe(firstDoc.id);
  expect(separate.status).toBe("Geprüft");
});
