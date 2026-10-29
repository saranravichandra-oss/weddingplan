import { test, expect } from "@playwright/test";
import { offerImage, scannedPdf } from "../fixtures.mjs";
test("cloud upload, browser OCR, private originals and shared persistence work", async ({
  page,
  browser,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect((await request.get("/api/state")).status()).toBe(401);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "E-Mail als Anmeldename" })
    .fill("cloud-fixture@example.test");
  await page
    .getByLabel("Passwort", { exact: true })
    .fill("Synthetic-Cloud-Test-2027");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Hauptnavigation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  const image = offerImage();
  await page.getByLabel("Angebotsdatei auswählen").setInputFiles({
    name: "cloud-fixture.png",
    mimeType: "image/png",
    buffer: image.png,
  });
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Teststudio", { timeout: 90000 });
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("3200");
  await expect(
    page.getByAltText("Gespeichertes Originalangebot"),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("cloud-offer-review.png"),
    fullPage: true,
  });
  await page
    .getByRole("checkbox", { name: /Ich habe Original und Angaben geprüft/ })
    .check();
  await page
    .getByRole("button", { name: "Bestätigt in den Vergleich übernehmen" })
    .click();
  await expect(
    page.getByRole("columnheader", { name: /Teststudio/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Weitere Angebotsdetails anzeigen", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Dienstleister", exact: true })
    .click();
  await expect(
    page.getByRole("columnheader", { name: /Teststudio/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Angebot hinzufügen", exact: true })
    .click();
  await page.getByLabel("Angebotsdatei auswählen").setInputFiles({
    name: "cloud-scan.pdf",
    mimeType: "application/pdf",
    buffer: scannedPdf(image.jpg),
  });
  await expect(
    page.getByRole("textbox", { name: "Anbieter", exact: true }),
  ).toHaveValue("Teststudio", { timeout: 90000 });
  await expect(
    page.getByRole("spinbutton", { name: "Gesamtpreis", exact: true }),
  ).toHaveValue("3200");
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  const me = await (await page.request.get("/api/auth/me")).json();
  const invitation = await (
    await page.request.post("/api/invitations", {
      headers: { "X-CSRF-Token": me.csrf },
    })
  ).json();
  expect(invitation.invitation).toBeTruthy();
  const second = await browser.newContext();
  const accepted = await second.request.post("/api/auth/accept", {
    data: {
      name: "Cloud Partner Test",
      email: "cloud-partner@example.test",
      password: "Synthetic-Cloud-Test-2027",
      invitation: invitation.invitation,
    },
  });
  expect(accepted.ok()).toBeTruthy();
  expect(
    (
      await page.request.post("/api/auth/accept", {
        data: {
          name: "Reuse",
          email: "reuse@example.test",
          password: "Synthetic-Cloud-Test-2027",
          invitation: invitation.invitation,
        },
      })
    ).status(),
  ).toBe(409);
  const partner = await second.newPage();
  await partner.goto("/");
  await partner
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Dienstleister", exact: true })
    .click();
  await expect(
    partner.getByRole("columnheader", { name: /Teststudio/ }),
  ).toBeVisible();
  await second.close();
  expect(errors).toEqual([]);
});
