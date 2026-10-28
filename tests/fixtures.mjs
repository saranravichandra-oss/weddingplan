import { createCanvas } from "@napi-rs/canvas";
export function offerImage() {
  const canvas = createCanvas(1400, 850),
    context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, 1400, 850);
  context.fillStyle = "#111";
  context.font = "34px Arial";
  [
    "TESTDOKUMENT - KEIN ECHTES ANGEBOT",
    "Anbieter: Teststudio",
    "Gesamtpreis: 3.200,00 EUR brutto",
    "Anzahlung: 500 EUR",
    "Begleitung: 10 Stunden",
    "Team: 1 Fotograf und 1 Videograf",
    "Video: Highlightfilm 5 Minuten",
    "Fahrtkosten: nicht angegeben",
    "Reception",
  ].forEach((line, index) => context.fillText(line, 60, 80 + index * 73));
  return {
    png: canvas.toBuffer("image/png"),
    jpg: canvas.toBuffer("image/jpeg"),
  };
}
export function scannedPdf(jpg) {
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 425] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
    ),
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width 1400 /Height 850 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,
      ),
      jpg,
      Buffer.from("\nendstream"),
    ]),
    Buffer.from(
      "<< /Length 29 >>\nstream\nq 700 0 0 425 0 0 cm /Im0 Do Q\nendstream",
    ),
  ];
  const chunks = [Buffer.from("%PDF-1.4\n")],
    offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      object,
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(chunk);
    length += chunk.length;
  });
  chunks.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
        .join(
          "",
        )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`,
    ),
  );
  return Buffer.concat(chunks);
}
