import { test, expect } from "@playwright/test";

test("selected direction A renders all sections on desktop and mobile without errors or page overflow", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const section of [
      "Übersicht",
      "Dienstleister",
      "Gäste",
      "Budget",
      "Aufgaben",
      "Veranstaltungen",
      "Dokumente",
    ]) {
      await expect(
        page.getByRole("group", { name: "Dashboard-Entwurf wählen" }),
      ).toHaveCount(0);
      await page
        .getByRole("navigation", { name: "Hauptnavigation" })
        .getByRole("button", { name: section, exact: true })
        .click();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(
        page.getByText("2027", { exact: true }).first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});

test("unknown price remains unknown and an offer does not change booked costs", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Anbieter", exact: true })
    .fill("Unser Angebot");
  await page
    .getByRole("checkbox", { name: /Ich habe die Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", { name: "Für den Vergleich übernehmen" })
    .click();
  await expect(
    page.getByRole("columnheader", { name: /Unser Angebot/ }),
  ).toBeVisible();
  await expect(page.locator(".price-cell")).toHaveText("Nicht angegeben");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Budget", exact: true })
    .click();
  await expect(
    page.locator(".stat").filter({ hasText: "Bekannt beauftragt" }),
  ).toContainText("1.000");
  await page.reload();
  await expect(
    page.getByRole("columnheader", { name: /Unser Angebot/ }),
  ).toHaveCount(0);
});

test("demo offers are explicit, inspectable, and remain separated", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Dienstleister", exact: true })
    .click();
  await expect(page.getByText("Demo-Studio A", { exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Demo-Angebote zeigen" }).check();
  await expect(page.getByText("Demo-Studio A", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Angaben prüfen" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("ERFUNDENES BEISPIEL");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Demo-Angebote zeigen" }).uncheck();
  await expect(page.getByText("Demo-Studio A", { exact: true })).toHaveCount(0);
});

test("scenario distinguishes missing input from explicit zero and counts the hall once", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Budget", exact: true })
    .click();
  await expect(page.locator(".scenario-result")).toContainText(
    "Noch unvollständig",
  );
  await page
    .getByRole("spinbutton", { name: "Weitere feste Kosten" })
    .fill("0");
  await page.getByRole("spinbutton", { name: "Kosten pro Gast" }).fill("100");
  await expect(page.locator(".scenario-result strong")).toHaveText(/21.000/);
  await page.getByRole("button", { name: "220 Gäste", exact: true }).click();
  await expect(page.locator(".scenario-result strong")).toHaveText(/23.000/);
  await page.getByRole("spinbutton", { name: "Kosten pro Gast" }).fill("");
  await expect(page.locator(".scenario-result")).toContainText(
    "Noch unvollständig",
  );
});

test("uploads support local previews and reject unsupported formats", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await page
    .getByLabel("Angebotsdatei auswählen")
    .setInputFiles({
      name: "angebot.html",
      mimeType: "text/html",
      buffer: Buffer.from("<h1>Test</h1>"),
    });
  await expect(page.getByRole("alert")).toContainText("nicht unterstützt");
  await page
    .getByLabel("Angebotsdatei auswählen")
    .setInputFiles({
      name: "angebot.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Mein echtes Angebot: Angaben noch offen."),
    });
  await expect(page.locator(".document-text")).toContainText(
    "Mein echtes Angebot",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Anbieter", exact: true })
    .fill("Unser Anbieter");
  await page
    .getByRole("checkbox", { name: /Ich habe die Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", { name: "Für den Vergleich übernehmen" })
    .click();
  await expect(
    page.getByRole("cell", { name: "angebot.txt · manuell erfasst" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Dokumente", exact: true })
    .click();
  await expect(page.getByText("angebot.txt", { exact: true })).toBeVisible();
});

test("event tabs and task completion work across sections", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Veranstaltungen", exact: true })
    .click();
  await page.getByRole("tab", { name: /Tamilische Zeremonie/ }).click();
  await expect(page.locator(".event-detail")).toContainText("keine vorgegeben");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Aufgaben", exact: true })
    .click();
  const task = page.getByRole("button", {
    name: "Foto- und Videoangebote vergleichen: als erledigt markieren",
  });
  await task.click();
  await expect(
    page.getByRole("button", {
      name: "Foto- und Videoangebote vergleichen: wieder öffnen",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("button", { name: "Übersicht", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Foto- und Videoangebote vergleichen: wieder öffnen",
    }),
  ).toBeVisible();
});
