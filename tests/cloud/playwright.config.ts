import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: ".",
  testMatch: "app.spec.ts",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: process.env.WEDDING_TEST_URL || "http://127.0.0.1:5193",
    headless: true,
  },
  webServer: process.env.WEDDING_TEST_URL
    ? undefined
    : {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        command: "node tests/cloud/proxy.mjs",
        url: "http://127.0.0.1:5193/api/auth/status",
        reuseExistingServer: false,
      },
});
