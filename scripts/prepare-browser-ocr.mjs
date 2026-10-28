import { mkdir, copyFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const root = "public/ocr";
await mkdir(join(root, "core"), { recursive: true });
await mkdir(join(root, "lang"), { recursive: true });
const tesseractRoot = dirname(require.resolve("tesseract.js/package.json"));
await copyFile(
  join(tesseractRoot, "dist", "worker.min.js"),
  join(root, "worker.min.js"),
);
const core = dirname(require.resolve("tesseract.js-core/package.json"));
for (const file of await readdir(core))
  if (/^tesseract-core.*\.(?:js|wasm)$/.test(file))
    await copyFile(join(core, file), join(root, "core", file));
for (const language of ["deu", "eng"])
  await copyFile(
    join(
      require(`@tesseract.js-data/${language}`).langPath,
      `${language}.traineddata.gz`,
    ),
    join(root, "lang", `${language}.traineddata.gz`),
  );
console.log("Browser-OCR assets prepared locally.");
