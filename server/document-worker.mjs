import { parentPort, workerData } from "node:worker_threads";
import { readFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createWorker } from "tesseract.js";
import { loadImage } from "@napi-rs/canvas";
import { extractOffer } from "./extract.mjs";
const require = createRequire(import.meta.url);
let ocr;
function progress(message) {
  parentPort.postMessage({ type: "progress", message });
}
async function recognize(buffer) {
  if (!ocr) {
    progress("Lokale Texterkennung wird gestartet …");
    const directory = join(workerData.directory, "ocr");
    mkdirSync(directory, { recursive: true });
    for (const language of ["deu", "eng"]) {
      const path = join(directory, `${language}.traineddata.gz`);
      if (!existsSync(path))
        copyFileSync(
          join(
            require(`@tesseract.js-data/${language}`).langPath,
            `${language}.traineddata.gz`,
          ),
          path,
        );
    }
    ocr = await createWorker("deu+eng", 1, {
      langPath: directory,
      cachePath: directory,
      gzip: true,
      errorHandler: () => {},
    });
  }
  const { data } = await ocr.recognize(buffer);
  return { text: data.text, confidence: data.confidence };
}
try {
  const buffer = readFileSync(workerData.path);
  const pages = [];
  if (workerData.mime === "text/plain") {
    pages.push({ page: 1, text: buffer.toString("utf8"), method: "Textdatei" });
  } else if (workerData.mime === "application/pdf") {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const root = require
      .resolve("pdfjs-dist/package.json")
      .replace(/package\.json$/, "");
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      standardFontDataUrl: join(root, "standard_fonts") + "/",
      cMapUrl: join(root, "cmaps") + "/",
      cMapPacked: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    if (pdf.numPages > 20) throw new Error("Seitenlimit");
    for (let i = 1; i <= pdf.numPages; i++) {
      progress(`Seite ${i} von ${pdf.numPages} wird gelesen …`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines = new Map();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        if (!lines.has(y)) lines.set(y, []);
        lines.get(y).push(item);
      }
      let text = [...lines.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, row]) =>
          row
            .sort((a, b) => a.transform[4] - b.transform[4])
            .map((item) => item.str)
            .join(" "),
        )
        .join("\n");
      let method = "PDF-Text",
        confidence;
      // Mixed PDFs may contain only a page number/watermark as text. OCR sparse pages.
      if (text.replace(/\s/g, "").length < 100) {
        progress(`Seite ${i}: lokale OCR für gescanntes Dokument …`);
        const viewport = page.getViewport({ scale: 2 });
        if (viewport.width * viewport.height > 20000000)
          throw new Error("Bildlimit");
        const canvas = pdf.canvasFactory.create(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
        await page.render({ canvasContext: canvas.context, viewport }).promise;
        const result = await recognize(canvas.canvas.toBuffer("image/png"));
        if (result.text.trim()) text = result.text;
        confidence = result.confidence;
        method = "OCR";
        pdf.canvasFactory.destroy(canvas);
      }
      pages.push({ page: i, text, method, confidence });
      page.cleanup();
    }
    await loadingTask.destroy();
  } else {
    const image = await loadImage(buffer);
    if (image.width * image.height > 20000000) throw new Error("Bildlimit");
    const result = await recognize(buffer);
    pages.push({ page: 1, ...result, method: "OCR" });
  }
  if (!pages.some((page) => page.text.trim())) throw new Error("KeinText");
  parentPort.postMessage({ type: "done", analysis: extractOffer(pages) });
} catch (error) {
  const known = {
    Seitenlimit:
      "Maximal 20 PDF-Seiten pro Auswertung. Das Original bleibt gespeichert; bitte aufteilen oder manuell erfassen.",
    Bildlimit:
      "Die Bildauflösung ist zu groß. Bitte auf höchstens 20 Megapixel verkleinern.",
    KeinText:
      "Kein lesbarer Text erkannt. Bitte die Bildqualität prüfen oder Angaben manuell erfassen.",
  };
  parentPort.postMessage({
    type: "error",
    message:
      known[error.message] ||
      "Das Dokument konnte nicht vollständig ausgewertet werden. Das Original bleibt gespeichert. Bitte manuell erfassen oder ein lesbares, unverschlüsseltes PDF verwenden.",
  });
} finally {
  if (ocr) await ocr.terminate();
}
