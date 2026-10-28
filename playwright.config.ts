import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const testDataDirectory = resolve(`.test-data-browser-${Date.now()}`);

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  globalTeardown: "./tests/teardown.mjs",
  use: { baseURL: "http://127.0.0.1:5180", headless: true },
  webServer: {
    command: "node tests/test-server.mjs",
    url: "http://127.0.0.1:5180/api/auth/status",
    env: {
      PORT: "5180",
      HOST: "127.0.0.1",
      WEDDING_DATA_DIR: testDataDirectory,
    },
    reuseExistingServer: false,
  },
});
