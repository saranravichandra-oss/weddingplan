import { test, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { offerImage } from "./fixtures.mjs";
import { guestWorkbook } from "./guest-workbook.mjs";
const email = "browser-one@example.test";
const password = "OnlyForBrowserFixtures2027";
// In-memory synthetic sessions keep non-auth UI tests below the real login rate limit.
// Invalidated sessions still go through the actual sign-in form again.
const fixtureCookies = new Map<
  string,
  Awaited<ReturnType<BrowserContext["cookies"]>>
>();
async function login(page: Page, asPartner = false) {
  const account = asPartner ? "browser-two@example.test" : email;
  const cookies = fixtureCookies.get(account);
  if (cookies) await page.context().addCookies(cookies);
  else await page.context().clearCookies();
  await page.goto("/");
  const session = await page.request.get("/api/auth/me");
  if (session.ok()) {
    expect((await session.json()).user.email).toBe(account);
    await expect(
      page.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeVisible();
    return;
  }
  await page
    .getByRole("textbox", { name: "E-Mail als Anmeldename" })
    .fill(account);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  fixtureCookies.set(account, await page.context().cookies());
}
async function section(page: Page, name: string) {
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  const link = page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", {
      name: name === "Dienstleister" ? "Angebote und Dienstleister" : name,
      exact: true,
    });
  if (await link.isVisible()) await link.click();
  else {
    await page
      .getByRole("button", {
        name: "Mehr: alle Planungsbereiche öffnen",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog", { name: "Alle Planungsbereiche", exact: true })
      .getByRole("link", { name, exact: true })
      .click();
  }
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
  for (const width of [1440, 768, 390, 320]) {
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
test("mobile navigation exposes every area through More and tablet icons keep their accessible names", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await login(page);
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  const providerLink = nav.getByRole("link", {
    name: "Angebote und Dienstleister",
    exact: true,
  });
  await expect(providerLink.locator(".desktop-nav-name")).toBeHidden();
  await expect(providerLink.locator(".mobile-nav-name")).toBeVisible();
  const more = nav.getByRole("button", {
    name: "Mehr: alle Planungsbereiche öffnen",
    exact: true,
  });
  for (const item of await nav.locator("a:visible, button:visible").all()) {
    const box = await item.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await more.click();
  const menu = page.getByRole("dialog", {
    name: "Alle Planungsbereiche",
    exact: true,
  });
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("link")).toHaveCount(9);
  await expect(
    menu.getByRole("link", { name: "Dokumente", exact: true }),
  ).toHaveAttribute("href", /bereich=dokumente/);
  await menu.screenshot({ path: testInfo.outputPath("all-sections-320.png") });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await menu.getByRole("link", { name: "Dokumente", exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(page).toHaveURL(/bereich=dokumente/);
  await expect(more).toHaveClass(/active/);
  await more.click();
  await expect(
    menu.getByRole("link", { name: "Dokumente", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: /Ein großes Ja/ }),
  ).toBeVisible();
  await page.emulateMedia({ contrast: "more" });
  await expect(
    nav.getByRole("link", { name: "Budget", exact: true }),
  ).toHaveCSS("color", "rgb(36, 77, 60)");
  await page.emulateMedia({ contrast: "no-preference" });
  await page.setViewportSize({ width: 768, height: 950 });
  await expect(more).toBeHidden();
  await expect(nav.getByRole("link")).toHaveCount(9);
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
    const link = nav.getByRole("link", {
      name: name === "Dienstleister" ? "Angebote und Dienstleister" : name,
      exact: true,
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("title", name);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 950 });
  await expect(providerLink.locator(".desktop-nav-name")).toBeVisible();
  await expect(providerLink.locator(".mobile-nav-name")).toBeHidden();
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
test("retrying document recognition locks its source and late proposals require a fresh confirmation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  const response = await page.request.post("/api/documents/text", {
    headers: { "X-CSRF-Token": auth.csrf },
    data: {
      text: "Anbieter: Spätes Teststudio\nGesamtpreis: 850,00 EUR brutto\nTeam: 2 Fotografen\nLieferung: 8 Wochen",
    },
  });
  expect(response.ok()).toBeTruthy();
  const { id } = await response.json();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/documents/${id}`)).json()).status,
    )
    .toBe("complete");
  const original = await (
    await page.request.get(`/api/documents/${id}`)
  ).json();
  let phase: "error" | "running" | "complete" = "error";
  await page.route(`**/api/documents/${id}`, (route) =>
    route.fulfill({
      json:
        phase === "complete"
          ? original
          : {
              ...original,
              status: phase,
              error:
                phase === "error"
                  ? "Synthetischer Erkennungsfehler"
                  : undefined,
              progress:
                phase === "error" ? "Manuell prüfen" : "Auswertung läuft",
              analysis: null,
            },
    }),
  );
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let retries = 0;
  await page.route(`**/api/documents/${id}/retry`, async (route) => {
    retries++;
    if (retries === 1) {
      await waiting;
      return route.fulfill({
        status: 503,
        json: { error: "Synthetischer Neustartfehler" },
      });
    }
    phase = "running";
    await route.fulfill({ json: { ok: true } });
  });
  await section(page, "Dokumente");
  // Text originals may share their display name; identify the actual private file URL.
  const documentRow = page.locator(".document-row").filter({
    has: page.locator(`a[href="/api/documents/${id}/file?download=1"]`),
  });
  await expect(documentRow).toBeVisible();
  await documentRow
    .getByRole("button", { name: "Prüfen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Synthetischer Erkennungsfehler", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Anbieter", exact: true })
    .fill("Manuell geprüfter Anbieter");
  await dialog
    .getByRole("spinbutton", { name: "Gesamtpreis", exact: true })
    .fill("900");
  const confirmation = dialog.getByRole("checkbox", {
    name: /Ich habe Original und Angaben geprüft/,
  });
  await confirmation.check();
  try {
    await dialog
      .getByRole("button", { name: "Auswertung erneut versuchen", exact: true })
      .click();
    const pending = dialog.getByRole("button", {
      name: "Auswertung wird fortgesetzt …",
      exact: true,
    });
    await expect(pending).toBeDisabled();
    await pending.evaluate((button: HTMLButtonElement) => button.click());
    await expect(
      dialog.getByLabel("Angebotsdatei auswählen", { exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Text einfügen", exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Entwurf verwerfen", exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", {
        name: "Bestätigt in den Vergleich übernehmen",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(confirmation).not.toBeChecked();
    await dialog
      .getByRole("textbox", { name: "Begleitung / Aufnahmezeit", exact: true })
      .fill("Manuell 10 Stunden");
    expect(retries).toBe(1);
  } finally {
    release();
  }
  await expect(
    dialog
      .getByRole("alert")
      .filter({ hasText: "Synthetischer Neustartfehler" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Auswertung erneut versuchen",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Manuell geprüfter Anbieter");
  await dialog
    .getByRole("button", { name: "Auswertung erneut versuchen", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Bestätigt in den Vergleich übernehmen",
      exact: true,
    }),
  ).toBeDisabled();
  await confirmation.check();
  phase = "complete";
  await expect(
    dialog.getByRole("textbox", { name: "Team", exact: true }),
  ).toHaveValue("2 Fotografen");
  await expect(confirmation).not.toBeChecked();
  await expect(
    dialog
      .getByRole("status")
      .filter({ hasText: "Die neue Auswertung wurde übernommen" }),
  ).toBeVisible();
  const notice = dialog
    .getByRole("status")
    .filter({ hasText: "Die neue Auswertung wurde übernommen" });
  await notice.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("analysis-refresh-390.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    dialog.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Manuell geprüfter Anbieter");
  await expect(
    dialog.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("900");
  await expect(
    dialog.getByRole("textbox", {
      name: "Begleitung / Aufnahmezeit",
      exact: true,
    }),
  ).toHaveValue("Manuell 10 Stunden");
  expect(
    (await (await page.request.get("/api/state")).json()).offers.some(
      (offer: { name: string }) => offer.name === "Manuell geprüfter Anbieter",
    ),
  ).toBe(false);
  await confirmation.check();
  await dialog
    .getByRole("button", {
      name: "Bestätigt in den Vergleich übernehmen",
      exact: true,
    })
    .click();
  await expect(dialog).toHaveCount(0);
  const saved = (
    await (await page.request.get("/api/state")).json()
  ).offers.find(
    (offer: { name: string }) => offer.name === "Manuell geprüfter Anbieter",
  );
  expect(saved.documentId).toBe(id);
  expect(saved.price).toBe(900);
  expect(saved.team).toBe("2 Fotografen");
  expect(saved.hours).toBe("Manuell 10 Stunden");
  expect(saved.manualFields).toEqual(
    expect.arrayContaining(["name", "price", "hours"]),
  );
  expect(saved.evidence.price[0].quote).toContain("850,00 EUR");
});

test("catering text is reviewed with its stated total and separate scope on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
      "Caterer:\nBrowser-Festservice\nEnthaltene Leistungen:\nBuffet für 200 Personen\nService für sechs Stunden\nNicht enthalten:\nGetränke\nOptionale Leistungen:\nZusätzliche Deko\nZahlungsbedingungen:\n30 % bei Bestätigung\nGesamtpreis: 2.500,– EUR brutto",
    );
  await page
    .getByRole("button", { name: "Text speichern und auswerten" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Browser-Festservice");
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("2500");
  await page
    .getByText("Weitere Angebotsdetails und offene Punkte", { exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Zahlungsbedingungen", exact: true }),
  ).toHaveValue("30 % bei Bestätigung");
  await expect(
    page.getByRole("textbox", {
      name: "Enthaltene Leistungen",
      exact: true,
    }),
  ).toHaveValue("Buffet für 200 Personen\nService für sechs Stunden");
  await expect(
    page.getByRole("textbox", {
      name: "Ausdrücklich nicht enthalten",
      exact: true,
    }),
  ).toHaveValue("Getränke");
  await page.getByLabel("Kategorie", { exact: true }).selectOption("Catering");
  await expect(
    page.getByRole("textbox", {
      name: "Fotografie: Leistungsumfang",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", {
      name: "Videografie: Leistungsumfang",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: /Ich habe Original und Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", { name: "Bestätigt in den Vergleich übernehmen" })
    .click();
  await section(page, "Dienstleister");
  const card = page.getByRole("article", {
    name: "Browser-Festservice",
    exact: true,
  });
  await expect(card).toContainText("2.500");
  await expect(card).toContainText("Buffet für 200 Personen");
  await expect(card).toContainText("Getränke");
  await expect(card).toContainText("Zusätzliche Deko");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("catering-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Browser-Festservice", exact: true }),
  ).toContainText("Buffet für 200 Personen");
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
}, testInfo) => {
  await login(page);
  const before = await (await page.request.get("/api/state")).json();
  await section(page, "Entdecken");
  await expect(page.getByRole("article")).toHaveCount(22);
  await page.getByRole("button", { name: /^Dekoration/ }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  const amani = page.getByRole("article", {
    name: "Amani Events",
    exact: true,
  });
  await expect(amani).toContainText("keinen aktuellen Berlin-Termin");
  await expect(amani.getByRole("link", { name: /^Quelle/ })).toHaveAttribute(
    "href",
    "https://amani.co.uk/about-us",
  );
  await page
    .getByRole("checkbox", { name: "Berlin & Brandenburg", exact: true })
    .check();
  await expect(amani).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Berlin & Brandenburg", exact: true })
    .uncheck();
  await page.getByRole("button", { name: /^Outfits & Styling/ }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  const styling = page.getByRole("article", {
    name: "Vithya Hair and Makeup",
    exact: true,
  });
  await expect(styling).toContainText("London");
  await expect(styling).toContainText("nicht bestätigt");
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await styling.screenshot({ path: testInfo.outputPath("styling-320.png") });
  await page.setViewportSize({ width: 1440, height: 950 });
  await expect(styling.getByRole("link", { name: /^Quelle/ })).toHaveAttribute(
    "href",
    "https://vithyahairandmakeup.com/about/",
  );
  await page
    .getByRole("checkbox", { name: "Berlin & Brandenburg", exact: true })
    .check();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Berlin & Brandenburg", exact: true })
    .uncheck();
  await page.getByRole("button", { name: /^Catering/ }).click();
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(
    page.getByRole("article", { name: "Nandy’s Catering", exact: true }),
  ).toContainText("nicht bestätigt");
  await page
    .getByRole("checkbox", { name: "Berlin & Brandenburg", exact: true })
    .check();
  await expect(
    page.getByRole("article", { name: "Nandy’s Catering", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Berlin & Brandenburg", exact: true })
    .uncheck();
  await page.getByRole("button", { name: /^Location/ }).click();
  await expect(page.getByRole("article")).toHaveCount(11);
  await page
    .getByRole("checkbox", { name: "Eigener Caterer laut Quelle möglich" })
    .check();
  await page.getByLabel("Sitzplätze laut Quelle").selectOption("220");
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(
    page.getByRole("article", { name: "Stadthalle Falkensee", exact: true }),
  ).toContainText("Stand 2017");
  await expect(
    page.getByRole("article", { name: "Alte Turnhalle Berlin", exact: true }),
  ).toContainText("keine Küchennutzung");
  await expect(
    page.getByRole("article", { name: "Villa Schützenhof", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("article", { name: "Alte Turnhalle Berlin", exact: true })
    .screenshot({ path: testInfo.outputPath("turnhalle-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 950 });
  await expect(
    page.getByRole("article", { name: "BOLLE Festsäle", exact: true }),
  ).toBeVisible();
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
  await card.screenshot({
    path: testInfo.outputPath("known-offer-card-390.png"),
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

test("optional cultural planning ideas prepare an editable task without silently assigning rituals or people", async ({
  page,
}, testInfo) => {
  await login(page);
  const before = await (await page.request.get("/api/state")).json();
  await section(page, "Veranstaltungen");
  const ideas = page.getByRole("region", { name: "Optionale Planungsimpulse" });
  await page.setViewportSize({ width: 390, height: 950 });
  await ideas.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({
    path: testInfo.outputPath("planning-ideas-390.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await ideas
    .getByLabel("Für welche Feier?")
    .selectOption({ label: "Reception" });
  const idea = ideas.getByRole("article", {
    name: "Foto- und Filmmomente gemeinsam auswählen",
    exact: true,
  });
  await idea
    .getByRole("button", { name: "Als Aufgabe vorbereiten", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Aufgabe", exact: true }),
  ).toHaveValue("Foto- und Filmmomente gemeinsam auswählen");
  await expect(
    dialog.getByRole("combobox", { name: "Veranstaltung", exact: true }),
  ).toHaveValue("Reception");
  await expect(
    dialog.getByRole("combobox", { name: "Verantwortlich", exact: true }),
  ).toHaveValue("");
  await expect(dialog.getByLabel("Termin", { exact: true })).toHaveValue("");
  const previewState = await (await page.request.get("/api/state")).json();
  expect(previewState.tasks).toEqual(before.tasks);
  await dialog
    .getByRole("button", { name: "Dauerhaft speichern", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    idea.getByRole("button", {
      name: "Schon als Aufgabe vorhanden",
      exact: true,
    }),
  ).toBeDisabled();
  const after = await (await page.request.get("/api/state")).json();
  const prepared = after.tasks.find(
    (task: { title: string }) =>
      task.title === "Foto- und Filmmomente gemeinsam auswählen",
  );
  expect(prepared.event).toBe("Reception");
  expect(prepared.owner).toBe("");
  expect(prepared.done).toBe(false);
  expect(after.events).toEqual(before.events);
  expect(after.providers).toEqual(before.providers);
});

test("per-person quotes retain their pricing unit and never invent a total from the guest count", async ({
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
      "Anbieter: Personenpreis Browser Fixture\nPreis pro Person: 59,90 EUR inkl. MwSt\nGästeanzahl: 200 Personen",
    );
  await page
    .getByRole("button", { name: "Text speichern und auswerten", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Personenpreis Browser Fixture");
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".review-price-notes")).toContainText("59,90 EUR");
  await expect(page.locator(".review-price-notes")).toContainText(
    "Preis pro Person",
  );
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
  await page.reload();
  await section(page, "Dienstleister");
  await page
    .getByRole("searchbox", { name: "Anbieter suchen" })
    .fill("Personenpreis Browser Fixture");
  await page
    .getByRole("button", { name: "Kartenübersicht", exact: true })
    .click();
  const card = page.getByRole("article", {
    name: "Personenpreis Browser Fixture",
    exact: true,
  });
  await expect(card.locator(".offer-card-price")).toContainText(
    "Nicht angegeben",
  );
  await expect(card.locator(".offer-card-pricing-notes")).toContainText(
    "59,90 EUR",
  );
  const state = await (await page.request.get("/api/state")).json();
  const offer = state.offers.find(
    (value: { name: string }) => value.name === "Personenpreis Browser Fixture",
  );
  expect(offer.price).toBeNull();
  expect(offer.pricingNotes).toContain("Preis pro Person");
  expect(offer.evidence.pricingNotes[0].page).toBe(1);
});

test("account connection retries recover an invitation form and a failed invitation keeps entered values", async ({
  page,
}) => {
  await page.route(
    "**/api/auth/status",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic connection failure" }),
      }),
    { times: 1 },
  );
  await page.goto(
    "/?bereich=gaeste#invite=" + "synthetic-invalid-invitation-".repeat(2),
  );
  await expect(page.getByRole("alert")).toContainText("nicht erreichbar");
  await expect(
    page.getByRole("button", { name: "Einladung annehmen", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Verbindung erneut prüfen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Einladung annehmen", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Dein Name", exact: true })
    .fill("Synthetischer Gastzugang");
  await page
    .getByRole("textbox", { name: "E-Mail als Anmeldename", exact: true })
    .fill("not-a-third-account@example.test");
  await page.getByLabel("Passwort").fill(password);
  await page
    .getByRole("button", { name: "Einladung annehmen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Einladung ungültig");
  await expect(
    page.getByRole("textbox", { name: "Dein Name", exact: true }),
  ).toHaveValue("Synthetischer Gastzugang");
  await expect(
    page.getByRole("textbox", { name: "E-Mail als Anmeldename", exact: true }),
  ).toHaveValue("not-a-third-account@example.test");
  await page
    .getByRole("button", { name: "Ich habe bereits einen Zugang", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "E-Mail als Anmeldename", exact: true })
    .fill(email);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/login", async (route) => {
    await waiting;
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Ich habe einen Einladungscode",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByRole("textbox", {
        name: "E-Mail als Anmeldename",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.getByLabel("Passwort", { exact: true })).toBeDisabled();
  } finally {
    release();
  }
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\?bereich=gaeste$/);
  const state = await (await page.request.get("/api/state")).json();
  expect(state.members).toHaveLength(2);
});

test("invitation creation and revocation show recoverable errors without concurrent requests or stale codes", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Synthetic unavailable clipboard");
        },
      },
    }),
  );
  await login(page);
  // Only this local browser view has one member; no live fixture account is deleted.
  await page.route("**/api/state", async (route) => {
    const response = await route.fetch();
    const state = await response.json();
    await route.fulfill({
      response,
      json: {
        ...state,
        members: state.members.filter(
          (member: { email: string }) => member.email === email,
        ),
      },
    });
  });
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let creates = 0,
    revokes = 0;
  await page.route("**/api/invitations", async (route) => {
    if (route.request().method() === "POST") {
      creates++;
      if (creates === 1) await waiting;
      if (creates === 2)
        return route.fulfill({
          status: 503,
          json: { error: "Synthetic invitation generation failure" },
        });
      return route.fulfill({
        json: {
          invitation: `synthetic-code-${creates}-`.repeat(4),
          expires: Date.now() + (creates === 4 ? -1000 : 48 * 60 * 60 * 1000),
        },
      });
    }
    revokes++;
    await route.fulfill({
      status: revokes === 1 ? 503 : 200,
      json:
        revokes === 1 ? { error: "Synthetic revoke failure" } : { ok: true },
    });
  });
  await page.reload();
  await section(page, "Gemeinsam");
  const card = page.locator(".team-card").filter({
    has: page.getByRole("heading", { name: "Eure Zugänge", exact: true }),
  });
  await page.setViewportSize({ width: 320, height: 900 });
  try {
    await card
      .getByRole("button", { name: "Zweiten Zugang einladen", exact: true })
      .click();
    const pending = card.getByRole("button", {
      name: "Einladung wird erstellt …",
      exact: true,
    });
    await expect(pending).toBeDisabled();
    expect(
      await pending.evaluate(
        (button) => button.scrollWidth <= button.clientWidth + 1,
      ),
    ).toBeTruthy();
    await pending.evaluate((button: HTMLButtonElement) => button.click());
    await expect(
      page.getByRole("button", { name: "Passwort ändern", exact: true }),
    ).toBeDisabled();
    expect(creates).toBe(1);
  } finally {
    release();
  }
  await expect(card.getByLabel("Einladungscode", { exact: true })).toHaveValue(
    "synthetic-code-1-".repeat(4),
  );
  await card
    .getByRole("button", { name: "Code kopieren", exact: true })
    .click();
  await expect(card.getByRole("status")).toContainText(
    "markieren und kopieren",
  );
  await card
    .getByRole("button", { name: "Zweiten Zugang einladen", exact: true })
    .click();
  await expect(card.getByRole("alert")).toContainText(
    "Synthetic invitation generation failure",
  );
  await expect(card.getByLabel("Einladungscode", { exact: true })).toHaveCount(
    0,
  );
  await card
    .getByRole("button", { name: "Zweiten Zugang einladen", exact: true })
    .click();
  await expect(card.getByLabel("Einladungscode", { exact: true })).toHaveValue(
    "synthetic-code-3-".repeat(4),
  );
  await card
    .getByRole("button", { name: "Einladung widerrufen", exact: true })
    .click();
  await expect(card.getByRole("alert")).toContainText(
    "Widerruf konnte nicht bestätigt werden",
  );
  await expect(
    card.getByRole("button", { name: "Code kopieren", exact: true }),
  ).toBeDisabled();
  await card.screenshot({
    path: testInfo.outputPath("invitation-retry-320.png"),
  });
  await expect(card.getByLabel("Einladungscode", { exact: true })).toHaveValue(
    "synthetic-code-3-".repeat(4),
  );
  await card
    .getByRole("button", { name: "Einladung widerrufen", exact: true })
    .click();
  await expect(card.getByRole("status")).toContainText("Einladung widerrufen");
  await expect(card.getByLabel("Einladungscode", { exact: true })).toHaveCount(
    0,
  );
  await card
    .getByRole("button", { name: "Zweiten Zugang einladen", exact: true })
    .click();
  await expect(card.getByRole("alert")).toContainText("Code ist abgelaufen");
  await expect(
    card.getByRole("button", { name: "Code kopieren", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(creates).toBe(4);
  expect(revokes).toBe(2);
  await page.unroute("**/api/state");
  expect(
    (await (await page.request.get("/api/state")).json()).members,
  ).toHaveLength(2);
});

test("password changes lock account controls, retain failed input, and clear confirmed input", async ({
  page,
}) => {
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  await section(page, "Gemeinsam");
  const card = page.locator(".team-card").filter({
    has: page.getByRole("heading", {
      name: "Dein Passwort ändern",
      exact: true,
    }),
  });
  await card
    .getByLabel("Bisheriges Passwort", { exact: true })
    .fill("Synthetic current password");
  await card
    .getByLabel("Neues Passwort", { exact: true })
    .fill("Synthetic replacement password");
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  // Isolate UI request/error behavior; real fixture passwords remain unchanged.
  await page.route("**/api/auth/password", async (route) => {
    calls++;
    if (calls === 1) {
      await waiting;
      return route.fulfill({
        status: 503,
        json: { error: "Synthetic password change failure" },
      });
    }
    await route.fulfill({ json: auth });
  });
  try {
    await card
      .getByRole("button", { name: "Passwort ändern", exact: true })
      .click();
    const pending = card.getByRole("button", {
      name: "Passwort wird geändert …",
      exact: true,
    });
    await expect(pending).toBeDisabled();
    await pending.evaluate((button: HTMLButtonElement) => button.click());
    await expect(
      card.getByLabel("Neues Passwort", { exact: true }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", { name: "Abmelden", exact: true }),
    ).toBeDisabled();
    expect(calls).toBe(1);
  } finally {
    release();
  }
  await expect(card.getByRole("alert")).toContainText(
    "Synthetic password change failure",
  );
  await expect(card.getByLabel("Neues Passwort", { exact: true })).toHaveValue(
    "Synthetic replacement password",
  );
  await card
    .getByRole("button", { name: "Passwort ändern", exact: true })
    .click();
  await expect(card.getByRole("status")).toContainText("Passwort geändert");
  await expect(card.getByLabel("Neues Passwort", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    card.getByLabel("Bisheriges Passwort", { exact: true }),
  ).toHaveValue("");
  await expect(
    card.getByRole("button", { name: "Abmelden", exact: true }),
  ).toBeEnabled();
  expect(calls).toBe(2);
});

test("failed sign out stays visible and can be retried safely on a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await login(page);
  await page.route(
    "**/api/auth/logout",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic offline response" }),
      }),
    { times: 1 },
  );
  await section(page, "Gemeinsam");
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Abmelden konnte nicht bestätigt werden" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Schön, dass du da bist.", exact: true }),
  ).toBeVisible();
  const session = await (await page.request.get("/api/auth/me")).status();
  expect(session).toBe(401);
});

test("Excel mapping stays usable on a narrow phone and closing the preview saves no guests", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await login(page);
  await section(page, "Gäste");
  const before = await (await page.request.get("/api/state")).json();
  const open = page.getByRole("button", {
    name: "Excel importieren",
    exact: true,
  });
  await open.click();
  await page.getByLabel("Excel-Gästeliste auswählen").setInputFiles({
    name: "mobile-preview.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: guestWorkbook([
      ["Gästeliste", "Anz.", "Prio", null, null],
      [null, null, "beides", "thaali", "rezeption"],
      [null],
      [
        "Eine lange synthetische Familienbezeichnung für die mobile Vorschau",
        4,
        "x",
      ],
    ]),
  });
  await expect(
    page.getByRole("button", {
      name: "1 Eintrag mit 4 Personen importieren",
      exact: true,
    }),
  ).toBeEnabled();
  const dialog = page.getByRole("dialog");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("guest-import-320.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  const after = await (await page.request.get("/api/state")).json();
  expect(after.guests).toEqual(before.guests);
});

test("renaming a celebration retains shared associations, guest responses and combined booked costs", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  const headers = { "X-CSRF-Token": auth.csrf };
  const before = await (await page.request.get("/api/state")).json();
  const event = before.events.find(
    (value: { name: string }) => value.name === "Reception",
  );
  async function create(kind: string, data: object) {
    const response = await page.request.post(`/api/records/${kind}`, {
      headers,
      data,
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
  const task = await create("tasks", {
    title: "Verknüpfte Testaufgabe",
    event: event.name,
  });
  const provider = await create("providers", {
    name: "Verknüpfter Testservice",
    category: "Foto & Video",
    event: event.name,
  });
  const offer = await create("offers", {
    name: "Verknüpftes Testangebot",
    providerId: provider.id,
    events: [before.events[0].name, event.name],
    confirmed: true,
    price: 1234,
    currency: "EUR",
  });
  const booking = await page.request.post(`/api/offers/${offer.id}/book`, {
    headers,
    data: { amount: 1234, paid: 234, due: "", version: offer.version },
  });
  expect(booking.ok()).toBeTruthy();
  const cost = await booking.json();
  const guest = await create("guests", {
    name: "Verknüpfte Testfamilie",
    type: "Gruppe",
    partySize: 3,
    attendance: { [event.id]: "Vorgesehen" },
  });
  let workflowFailed = false;
  try {
    await page.reload();
    await section(page, "Veranstaltungen");
    await page
      .locator(".event-detail")
      .filter({
        has: page.getByRole("heading", { name: event.name, exact: true }),
      })
      .getByRole("button", { name: "Planung bearbeiten" })
      .click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Veranstaltung", exact: true })
      .fill("Unsere Abendfeier");
    await dialog.getByRole("button", { name: "Dauerhaft speichern" }).click();
    await expect(
      page.getByRole("heading", { name: "Unsere Abendfeier", exact: true }),
    ).toBeVisible();
    let after = await (await page.request.get("/api/state")).json();
    expect(
      after.tasks.find((row: { id: string }) => row.id === task.id).event,
    ).toBe("Unsere Abendfeier");
    expect(
      after.providers.find((row: { id: string }) => row.id === provider.id)
        .event,
    ).toBe("Unsere Abendfeier");
    expect(
      after.offers.find((row: { id: string }) => row.id === offer.id).events,
    ).toEqual([before.events[0].name, "Unsere Abendfeier"]);
    expect(
      after.guests.find((row: { id: string }) => row.id === guest.id),
    ).toEqual(guest);
    const stale = await page.request.put(`/api/records/tasks/${task.id}`, {
      headers,
      data: { ...task, title: "Veraltete Bearbeitung" },
    });
    expect(stale.status()).toBe(409);
    await section(page, "Budget");
    await page
      .getByRole("button", {
        name: "Verknüpftes Testangebot bearbeiten",
        exact: true,
      })
      .click();
    dialog = page.getByRole("dialog");
    await expect(dialog.locator('select[name="event"]')).toHaveValue(
      `${before.events[0].name} + Unsere Abendfeier`,
    );
    await dialog
      .getByRole("spinbutton", {
        name: "Bereits gezahlt in EUR (leer = unbekannt)",
        exact: true,
      })
      .fill("300");
    await dialog.getByRole("button", { name: "Dauerhaft speichern" }).click();
    await expect(dialog).toHaveCount(0);
    after = await (await page.request.get("/api/state")).json();
    const savedCost = after.costs.find(
      (row: { id: string }) => row.id === cost.id,
    );
    expect(savedCost.event).toBe(
      `${before.events[0].name} + Unsere Abendfeier`,
    );
    expect(savedCost.amount).toBe(1234);
    expect(savedCost.paid).toBe(300);
    await section(page, "Veranstaltungen");
    await page
      .locator(".event-detail")
      .filter({
        has: page.getByRole("heading", {
          name: "Unsere Abendfeier",
          exact: true,
        }),
      })
      .getByRole("button", { name: "Planung bearbeiten" })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Veranstaltung", exact: true })
      .fill(before.events[0].name);
    await dialog.getByRole("button", { name: "Dauerhaft speichern" }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Veranstaltungsnamen gibt es bereits",
    );
    page.once("dialog", (prompt) => prompt.accept());
    await dialog.getByRole("button", { name: "Dialog schließen" }).click();
    await section(page, "Dienstleister");
    await page
      .getByRole("button", { name: "Angebot hinzufügen", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Text einfügen", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Angebotstext", exact: true })
      .fill(
        "Anbieter: Neues Testangebot nach Umbenennung\nReception\nGesamtpreis: 2300 EUR",
      );
    await page
      .getByRole("button", { name: "Text speichern und auswerten" })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Anbieter", exact: true }),
    ).toHaveValue("Neues Testangebot nach Umbenennung");
    await page
      .getByText("Weitere Angebotsdetails und offene Punkte", { exact: true })
      .click();
    dialog = page.getByRole("dialog");
    const previousName = dialog.getByRole("checkbox", {
      name: "Reception – weitere Bezeichnung beibehalten",
      exact: true,
    });
    await expect(previousName).toBeChecked();
    await expect(
      dialog.getByRole("checkbox", { name: "Unsere Abendfeier", exact: true }),
    ).not.toBeChecked();
    await page.setViewportSize({ width: 320, height: 900 });
    await dialog
      .locator(".event-checkboxes")
      .screenshot({ path: testInfo.outputPath("offer-event-names-320.png") });
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBeTruthy();
    await previousName.uncheck();
    await expect(previousName).not.toBeChecked();
    await previousName.check();
    await previousName.uncheck();
    await dialog
      .getByRole("checkbox", { name: "Unsere Abendfeier", exact: true })
      .check();
    await dialog
      .getByRole("checkbox", { name: /Ich habe Original und Angaben geprüft/ })
      .check();
    let release!: () => void;
    const saving = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/records/offers", async (route) => {
      await saving;
      await route.continue();
    });
    try {
      await dialog
        .getByRole("button", { name: "Bestätigt in den Vergleich übernehmen" })
        .click();
      await expect(
        dialog.locator('select[aria-label="Kategorie"]'),
      ).toBeDisabled();
      await expect(
        dialog
          .getByRole("status")
          .filter({ hasText: "Geprüftes Angebot wird gespeichert" }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("textbox", { name: "Angebotstext", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Datei hochladen", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Entwurf verwerfen", exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole("button", { name: "Dialog schließen", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      expect(
        await page.evaluate(() => {
          const leaving = new Event("beforeunload", { cancelable: true });
          window.dispatchEvent(leaving);
          return leaving.defaultPrevented;
        }),
      ).toBeTruthy();
    } finally {
      release();
    }
    await expect(dialog).toHaveCount(0);
    await page.unroute("**/api/records/offers");
    after = await (await page.request.get("/api/state")).json();
    const newOffer = after.offers.find(
      (row: { name: string }) =>
        row.name === "Neues Testangebot nach Umbenennung",
    );
    expect(newOffer.events).toEqual(["Unsere Abendfeier"]);
    expect(newOffer.evidence.events[0].quote).toContain("Reception");
    expect(newOffer.manualFields).toContain("events");
  } catch (error) {
    workflowFailed = true;
    throw error;
  } finally {
    if (!workflowFailed) {
      const latest = await (await page.request.get("/api/state")).json();
      const current = latest.events.find(
        (row: { id: string }) => row.id === event.id,
      );
      const restored = await page.request.put(
        `/api/records/events/${event.id}`,
        {
          headers,
          data: { ...current, name: event.name },
        },
      );
      expect(restored.ok()).toBeTruthy();
    }
  }
});

test("planning edits resolve real parallel writes without losing either account and detect another race", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(60000);
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  const created = await page.request.post("/api/records/tasks", {
    headers: { "X-CSRF-Token": auth.csrf },
    data: {
      title: "Gemeinsame Testaufgabe",
      detail: "Ausgangsstand",
      priority: "Normal",
      done: false,
    },
  });
  expect(created.ok()).toBeTruthy();
  const original = await created.json();
  await section(page, "Aufgaben");
  await page
    .getByRole("button", {
      name: "Gemeinsame Testaufgabe bearbeiten",
      exact: true,
    })
    .click();
  const editor = page.getByRole("dialog");
  await editor
    .getByRole("textbox", { name: "Aufgabe", exact: true })
    .fill("Mein Aufgabentitel");
  await editor
    .getByRole("textbox", { name: "Beschreibung", exact: true })
    .fill("Meine neue Beschreibung");
  const partnerContext = await browser.newContext();
  try {
    const partner = await partnerContext.newPage();
    await login(partner, true);
    const partnerAuth = await (
      await partner.request.get("/api/auth/me")
    ).json();
    const remote = await partner.request.put(
      `/api/records/tasks/${original.id}`,
      {
        headers: { "X-CSRF-Token": partnerAuth.csrf },
        data: {
          ...original,
          title: "Gemeinsamer Aufgabentitel",
          priority: "Hoch",
          done: true,
        },
      },
    );
    expect(remote.ok()).toBeTruthy();
    let shared = await remote.json();
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    const conflicts = editor.getByRole("region", {
      name: "Gemeinsame Änderungen prüfen",
    });
    await expect(conflicts).toBeVisible();
    await expect(conflicts).toBeFocused();
    await expect(
      editor.getByRole("textbox", { name: "Aufgabe", exact: true }),
    ).toBeDisabled();
    const apply = conflicts.getByRole("button", {
      name: "Zusammengeführte Fassung prüfen",
      exact: true,
    });
    await expect(apply).toBeDisabled();
    await conflicts
      .getByRole("group", { name: "Aufgabe", exact: true })
      .getByRole("radio", { name: /Meine Eingabe/ })
      .check();
    await page.setViewportSize({ width: 320, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(
      await apply.evaluate(
        (button) => button.scrollWidth <= button.clientWidth + 1,
      ),
    ).toBeTruthy();
    await conflicts.screenshot({
      path: testInfo.outputPath("planning-conflict-320.png"),
    });
    await apply.click();
    await expect(conflicts).toHaveCount(0);
    await expect(
      editor.getByRole("textbox", { name: "Aufgabe", exact: true }),
    ).toBeFocused();
    await expect(
      editor.getByRole("textbox", { name: "Aufgabe", exact: true }),
    ).toHaveValue("Mein Aufgabentitel");
    await expect(
      editor.getByRole("textbox", { name: "Beschreibung", exact: true }),
    ).toHaveValue("Meine neue Beschreibung");
    await expect(editor.getByLabel("Priorität")).toHaveValue("Hoch");
    let state = await (await page.request.get("/api/state")).json();
    expect(
      state.tasks.find((row: { id: string }) => row.id === original.id).title,
    ).toBe("Gemeinsamer Aufgabentitel");
    page.once("dialog", (prompt) => void prompt.dismiss());
    await page.keyboard.press("Escape");
    await expect(editor).toBeVisible();
    const second = await partner.request.put(
      `/api/records/tasks/${original.id}`,
      {
        headers: { "X-CSRF-Token": partnerAuth.csrf },
        data: { ...shared, title: "Noch neuerer gemeinsamer Titel" },
      },
    );
    expect(second.ok()).toBeTruthy();
    shared = await second.json();
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(conflicts).toContainText("Noch neuerer gemeinsamer Titel");
    await conflicts
      .getByRole("group", { name: "Aufgabe", exact: true })
      .getByRole("radio", { name: /Meine Eingabe/ })
      .check();
    await apply.click();
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    state = await (await page.request.get("/api/state")).json();
    const result = state.tasks.find(
      (row: { id: string }) => row.id === original.id,
    );
    expect(result.title).toBe("Mein Aufgabentitel");
    expect(result.detail).toBe("Meine neue Beschreibung");
    expect(result.priority).toBe("Hoch");
    expect(result.done).toBe(true);
    expect(result.version).toBe(shared.version + 1);
  } finally {
    await partnerContext.close();
  }
});

test("parallel guest responses merge per celebration with explicit choices for the same response", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  await login(page);
  const auth = await (await page.request.get("/api/auth/me")).json();
  const before = await (await page.request.get("/api/state")).json();
  const [first, second, third] = before.events;
  const created = await page.request.post("/api/records/guests", {
    headers: { "X-CSRF-Token": auth.csrf },
    data: {
      name: "Parallel Testfamilie",
      partySize: 3,
      type: "Gruppe",
      attendance: Object.fromEntries(
        before.events.map((event: { id: string }) => [event.id, "Vorgesehen"]),
      ),
    },
  });
  expect(created.ok()).toBeTruthy();
  const original = await created.json();
  await section(page, "Gäste");
  await page
    .getByRole("button", {
      name: "Parallel Testfamilie bearbeiten",
      exact: true,
    })
    .click();
  const editor = page.getByRole("dialog");
  await editor
    .getByLabel(`${first.name}: Einladung & Rückmeldung`)
    .selectOption("Zugesagt");
  await editor
    .getByLabel(`${third.name}: Einladung & Rückmeldung`)
    .selectOption("Zugesagt");
  await editor.getByRole("spinbutton", { name: /^Anzahl Personen/ }).fill("5");
  await editor
    .getByRole("textbox", { name: "Essen & Unverträglichkeiten", exact: true })
    .fill("Synthetische Essensnotiz");
  const partnerContext = await browser.newContext();
  try {
    const partner = await partnerContext.newPage();
    await login(partner, true);
    const partnerAuth = await (
      await partner.request.get("/api/auth/me")
    ).json();
    const updated = await partner.request.put(
      `/api/records/guests/${original.id}`,
      {
        headers: { "X-CSRF-Token": partnerAuth.csrf },
        data: {
          ...original,
          partySize: 4,
          notes: "Gemeinsame Testnotiz",
          attendance: {
            ...original.attendance,
            [second.id]: "Abgesagt",
            [third.id]: "Abgesagt",
          },
        },
      },
    );
    expect(updated.ok()).toBeTruthy();
    const shared = await updated.json();
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    const conflicts = editor.getByRole("region", {
      name: "Gemeinsame Änderungen prüfen",
    });
    await expect(conflicts).toBeVisible();
    await conflicts
      .getByRole("button", {
        name: "Eigene Eingaben weiter bearbeiten",
        exact: true,
      })
      .click();
    await expect(conflicts).toHaveCount(0);
    await expect(
      editor.getByRole("spinbutton", { name: /^Anzahl Personen/ }),
    ).toHaveValue("5");
    await expect(
      editor.getByLabel(`${first.name}: Einladung & Rückmeldung`),
    ).toHaveValue("Zugesagt");
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(conflicts).toBeVisible();
    await conflicts
      .getByRole("group", { name: "Anzahl Personen", exact: true })
      .getByRole("radio", { name: /Meine Eingabe/ })
      .check();
    await conflicts
      .getByRole("group", {
        name: `${third.name}: Einladung & Rückmeldung`,
        exact: true,
      })
      .getByRole("radio", { name: /Gemeinsamer Stand/ })
      .check();
    await conflicts
      .getByRole("button", {
        name: "Zusammengeführte Fassung prüfen",
        exact: true,
      })
      .click();
    await expect(
      editor.getByLabel(`${first.name}: Einladung & Rückmeldung`),
    ).toHaveValue("Zugesagt");
    await expect(
      editor.getByLabel(`${second.name}: Einladung & Rückmeldung`),
    ).toHaveValue("Abgesagt");
    await expect(
      editor.getByLabel(`${third.name}: Einladung & Rückmeldung`),
    ).toHaveValue("Abgesagt");
    await expect(
      editor.getByRole("textbox", { name: "Weitere Hinweise", exact: true }),
    ).toHaveValue("Gemeinsame Testnotiz");
    expect(
      (await (await page.request.get("/api/state")).json()).guests.find(
        (row: { id: string }) => row.id === original.id,
      ),
    ).toEqual(shared);
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
    const result = (
      await (await page.request.get("/api/state")).json()
    ).guests.find((row: { id: string }) => row.id === original.id);
    expect(result.partySize).toBe(5);
    expect(result.dietary).toBe("Synthetische Essensnotiz");
    expect(result.notes).toBe("Gemeinsame Testnotiz");
    expect(result.attendance).toEqual({
      ...original.attendance,
      [first.id]: "Zugesagt",
      [second.id]: "Abgesagt",
      [third.id]: "Abgesagt",
    });
    expect(result.version).toBe(shared.version + 1);
    await page
      .getByRole("button", {
        name: "Parallel Testfamilie bearbeiten",
        exact: true,
      })
      .click();
    await editor
      .getByRole("textbox", { name: "Weitere Hinweise", exact: true })
      .fill("Lokale Eingabe nach gemeinsamer Löschung");
    const removed = await partner.request.delete(
      `/api/records/guests/${result.id}`,
      {
        headers: { "X-CSRF-Token": partnerAuth.csrf },
        data: { version: result.version },
      },
    );
    expect(removed.ok()).toBeTruthy();
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(editor.getByRole("alert")).toContainText(
      "inzwischen gelöscht",
    );
    await expect(
      editor.getByRole("textbox", { name: "Weitere Hinweise", exact: true }),
    ).toHaveValue("Lokale Eingabe nach gemeinsamer Löschung");
    expect(
      (await (await page.request.get("/api/state")).json()).guests.some(
        (row: { id: string }) => row.id === result.id,
      ),
    ).toBe(false);
    page.once("dialog", (prompt) => void prompt.accept());
    await editor
      .getByRole("button", { name: "Dialog schließen", exact: true })
      .click();
    await expect(editor).toHaveCount(0);
  } finally {
    await partnerContext.close();
  }
});

test("late background responses never replace newer planning or newer connection errors", async ({
  page,
}) => {
  await login(page);
  await section(page, "Aufgaben");
  let next: "" | "old-state" | "old-error" | "new-error" = "";
  let release!: () => void;
  let captured!: () => void;
  let capture = Promise.resolve();
  let responseFinished = Promise.resolve();
  function hold(mode: "old-state" | "old-error") {
    next = mode;
    capture = new Promise<void>((resolve) => {
      captured = resolve;
    });
    const response = page.waitForResponse(
      (value) =>
        value.url().endsWith("/api/state") &&
        value.headers()["x-synthetic-delayed"] === "yes",
    );
    responseFinished = response.then(async (value) => {
      await value.finished();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );
    });
  }
  await page.route("**/api/state", async (route) => {
    const mode = next;
    next = "";
    if (!mode) return route.continue();
    if (mode === "new-error")
      return route.fulfill({
        status: 503,
        json: { error: "Neue Verbindung unterbrochen" },
      });
    const snapshot =
      mode === "old-state" ? await (await route.fetch()).json() : null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    captured();
    await gate;
    await route.fulfill({
      status: mode === "old-error" ? 503 : 200,
      headers: { "x-synthetic-delayed": "yes" },
      json: snapshot || { error: "Überholter Verbindungsfehler" },
    });
  });
  const focus = () =>
    page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const task = page.getByText("Frisch gespeicherte Planung", { exact: true });
  hold("old-state");
  await focus();
  await capture;
  try {
    await page
      .getByRole("button", { name: "Aufgabe anlegen", exact: true })
      .click();
    const editor = page.getByRole("dialog");
    await editor
      .getByRole("textbox", { name: "Aufgabe", exact: true })
      .fill("Frisch gespeicherte Planung");
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(task).toBeVisible();
  } finally {
    release();
  }
  await responseFinished;
  expect(await task.count()).toBe(1);

  hold("old-error");
  await focus();
  await capture;
  const fresh = page.waitForResponse(
    (value) => value.url().endsWith("/api/state") && value.ok(),
  );
  await focus();
  await (await fresh).finished();
  release();
  await responseFinished;
  expect(await page.getByText(/Überholter Verbindungsfehler/).count()).toBe(0);
  await expect(task).toBeVisible();

  hold("old-state");
  await focus();
  await capture;
  next = "new-error";
  await focus();
  await expect(
    page.getByText(/Keine Verbindung: Neue Verbindung unterbrochen/),
  ).toBeVisible();
  release();
  await responseFinished;
  expect(
    await page
      .getByText(/Keine Verbindung: Neue Verbindung unterbrochen/)
      .isVisible(),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Erneut verbinden", exact: true })
    .click();
  await expect(page.getByText(/Keine Verbindung:/)).toHaveCount(0);
  await expect(task).toBeVisible();
});

test("unsaved planning edits survive canceled close and reload, and cannot be closed during a save", async ({
  page,
}) => {
  test.setTimeout(45000);
  await login(page);
  await section(page, "Aufgaben");
  const before = await (await page.request.get("/api/state")).json();
  await page
    .getByRole("button", { name: "Aufgabe anlegen", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await editor
    .getByRole("textbox", { name: "Aufgabe", exact: true })
    .fill("Geschützte Testnotiz");
  await editor
    .getByRole("textbox", { name: "Beschreibung", exact: true })
    .fill(
      "Diese Änderung darf nicht beim versehentlichen Schließen verloren gehen.",
    );
  await expect(editor.getByRole("status")).toContainText(
    "Noch nicht gespeichert",
  );
  page.once("dialog", async (prompt) => {
    expect(prompt.type()).toBe("confirm");
    await prompt.dismiss();
  });
  await page.keyboard.press("Escape");
  await expect(editor).toBeVisible();
  await expect(
    editor.getByRole("textbox", { name: "Aufgabe", exact: true }),
  ).toHaveValue("Geschützte Testnotiz");
  const promptPromise = page.waitForEvent("dialog");
  const reload = page.reload({ timeout: 5000 }).catch(() => null);
  const prompt = await promptPromise;
  expect(prompt.type()).toBe("beforeunload");
  await prompt.dismiss();
  await reload;
  await expect(editor).toBeVisible();
  expect((await (await page.request.get("/api/state")).json()).tasks).toEqual(
    before.tasks,
  );
  let release!: () => void;
  const saving = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/records/tasks", async (route) => {
    await saving;
    await route.continue();
  });
  try {
    await editor
      .getByRole("button", { name: "Dauerhaft speichern", exact: true })
      .click();
    await expect(
      editor.getByRole("button", { name: "Wird gespeichert …", exact: true }),
    ).toBeDisabled();
    await expect(
      editor.getByRole("textbox", { name: "Aufgabe", exact: true }),
    ).toBeDisabled();
    await editor
      .getByRole("button", { name: "Dialog schließen", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(editor).toBeVisible();
  } finally {
    release();
  }
  await expect(editor).toHaveCount(0);
  await page.unroute("**/api/records/tasks");
  const saved = await (await page.request.get("/api/state")).json();
  expect(saved.tasks.length).toBe(before.tasks.length + 1);
  expect(
    saved.tasks.find(
      (task: { title: string }) => task.title === "Geschützte Testnotiz",
    ).detail,
  ).toContain("versehentlichen Schließen");
  await page
    .getByRole("button", { name: "Aufgabe anlegen", exact: true })
    .click();
  await editor
    .getByRole("textbox", { name: "Aufgabe", exact: true })
    .fill("Wird zurückgenommen");
  await editor.getByRole("textbox", { name: "Aufgabe", exact: true }).fill("");
  await expect(editor.getByRole("status")).toHaveCount(0);
  await editor
    .getByRole("button", { name: "Dialog schließen", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await page
    .getByRole("button", { name: "Aufgabe anlegen", exact: true })
    .click();
  await editor
    .getByRole("textbox", { name: "Aufgabe", exact: true })
    .fill("Bewusst verworfene Testnotiz");
  page.once("dialog", (dialog) => dialog.accept());
  await editor
    .getByRole("button", { name: "Dialog schließen", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  expect((await (await page.request.get("/api/state")).json()).tasks).toEqual(
    saved.tasks,
  );
});
