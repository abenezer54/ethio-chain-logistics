import { expect, test } from "@playwright/test";

const importerEmail = process.env.E2E_IMPORTER_EMAIL;
const importerPassword = process.env.E2E_IMPORTER_PASSWORD;

test("landing page is available for prototype evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Ethio-Chain/i).first()).toBeVisible();
  await page.screenshot({
    path: "test-artifacts/chapter-six/landing-page.png",
    fullPage: true,
  });
});

test("importer login reaches dashboard when seeded credentials are provided", async ({ page }) => {
  test.skip(!importerEmail || !importerPassword, "Set E2E_IMPORTER_EMAIL and E2E_IMPORTER_PASSWORD to run the login evidence test.");

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(importerEmail);
  await page.getByLabel(/password/i).fill(importerPassword);
  await page.getByRole("button", { name: /sign in to ethio-chain/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/import/i).first()).toBeVisible();
  await page.screenshot({
    path: "test-artifacts/chapter-six/importer-dashboard.png",
    fullPage: true,
  });
});
