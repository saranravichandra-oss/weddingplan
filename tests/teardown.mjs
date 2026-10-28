import { resolve, join } from "node:path";
import { rm, readFile } from "node:fs/promises";
export default async function teardown(config) {
  const directory =
    config.webServer?.[0]?.env?.WEDDING_DATA_DIR ||
    config.webServer?.env?.WEDDING_DATA_DIR;
  if (!directory) return;
  const absolute = resolve(directory);
  if (!absolute.startsWith(resolve(".test-data-browser-")))
    throw new Error("Unsafe test cleanup path");
  // Global teardown runs before Playwright's web-server cleanup. Close our own
  // fixture server first, otherwise SQLite files remain locked on Windows.
  const pid = Number(
    await readFile(join(absolute, "test-server.pid"), "utf8").catch(() => ""),
  );
  if (Number.isInteger(pid) && pid > 1 && pid !== process.pid) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
    for (let count = 0; count < 50; count++) {
      try {
        process.kill(pid, 0);
      } catch {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  await rm(absolute, {
    recursive: true,
    force: true,
    maxRetries: 2,
    retryDelay: 200,
  }).catch(() => {});
}
