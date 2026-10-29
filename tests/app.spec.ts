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
    .getByRole("button", { name, exact: true })
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
  const family = page
    .getByRole("row")
    .filter({
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
