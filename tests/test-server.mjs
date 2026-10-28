import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const directory = resolve(process.env.WEDDING_DATA_DIR || "");
if (!directory.startsWith(resolve(".test-data-browser-")))
  throw new Error("Invalid browser test directory");
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "test-server.pid"), String(process.pid), {
  flag: "wx",
});
process.argv.push("--production");
await import("../server/index.mjs");
