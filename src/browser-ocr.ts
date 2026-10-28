import { createWorker } from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Analysis } from "./data";
GlobalWorkerOptions.workerSrc = pdfWorker;
export async function readDocument(
  file: Blob,
  mime: string,
  progress: (message: string) => void,
): Promise<Analysis["pages"]> {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  async function recognize(image: Blob | HTMLCanvasElement) {
    if (!worker) {
      progress("Texterkennung wird auf deinem Gerät gestartet …");
      worker = await createWorker("deu+eng", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr/core",
        langPath: "/ocr/lang",
        workerBlobURL: false,
        logger: (message) => {
          if (message.status === "recognizing text")
            progress(
              `Text wird erkannt: ${Math.round(message.progress * 100)} %`,
            );
        },
      });
    }
    const { data } = await worker.recognize(image);
    return { text: data.text, confidence: data.confidence };
  }
  try {
    if (mime === "text/plain")
      return [{ page: 1, text: await file.text(), method: "Textdatei" }];
    if (mime === "application/pdf") {
      const loading = getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        useSystemFonts: true,
      });
      const pdf = await loading.promise;
      try {
        if (pdf.numPages > 20)
          throw new Error(
            "Maximal 20 PDF-Seiten. Bitte das Dokument aufteilen.",
          );
        const pages: Analysis["pages"] = [];
        for (let number = 1; number <= pdf.numPages; number++) {
          progress(`Seite ${number} von ${pdf.numPages} wird gelesen …`);
          const page = await pdf.getPage(number),
            content = await page.getTextContent();
          const lines = new Map<
            number,
            { str: string; transform: number[] }[]
          >();
          for (const item of content.items) {
            if (!("str" in item) || !item.str.trim()) continue;
            const y = Math.round(item.transform[5] / 3) * 3;
            if (!lines.has(y)) lines.set(y, []);
            lines.get(y)!.push(item);
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
            confidence: number | undefined;
          if (text.replace(/\s/g, "").length < 100) {
            const viewport = page.getViewport({ scale: 2 });
            if (viewport.width * viewport.height > 20000000)
              throw new Error("Die PDF-Seite ist zu groß. Bitte verkleinern.");
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d")!;
            await page.render({ canvasContext: context, canvas, viewport })
              .promise;
            const recognized = await recognize(canvas);
            if (recognized.text.trim()) text = recognized.text;
            confidence = recognized.confidence;
            method = "OCR";
            canvas.width = 0;
            canvas.height = 0;
          }
          pages.push({
            page: number,
            text,
            method,
            ...(confidence === undefined ? {} : { confidence }),
          });
          page.cleanup();
        }
        return pages;
      } finally {
        await loading.destroy();
      }
    }
    const bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (pixels > 20000000)
      throw new Error(
        "Das Bild ist größer als 20 Megapixel. Bitte verkleinern.",
      );
    return [{ page: 1, ...(await recognize(file)), method: "OCR" }];
  } finally {
    if (worker) await worker.terminate();
  }
}
