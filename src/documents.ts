import { api, json } from "./api";
export const cloudMode = import.meta.env.MODE === "cloud";
export async function uploadDocument(
  file: File,
  progress: (message: string) => void,
): Promise<{ id: string }> {
  if (!cloudMode) {
    const body = new FormData();
    body.set("file", file);
    return api<{ id: string }>("/documents", { method: "POST", body });
  }
  const mime =
    file.type ||
    (
      {
        pdf: "application/pdf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        txt: "text/plain",
      } as Record<string, string>
    )[file.name.split(".").pop()?.toLowerCase() || ""];
  if (!mime)
    throw new Error(
      "Dateiformat nicht unterstützt. Bitte PDF, Bild oder UTF-8-Text verwenden.",
    );
  const ticket = await api<{ id: string; uploadUrl: string }>(
    "/documents/upload-ticket",
    { method: "POST", body: json({ name: file.name, mime, size: file.size }) },
  );
  try {
    const uploaded = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mime, "x-upsert": "false" },
      body: file,
    });
    if (!uploaded.ok)
      throw new Error(
        "Das Original konnte nicht vollständig gespeichert werden. Bitte erneut versuchen.",
      );
    await api(`/documents/${ticket.id}/complete`, { method: "POST" });
  } catch (error) {
    await api(`/documents/${ticket.id}`, { method: "DELETE" }).catch(() => {});
    throw error;
  }
  void analyzeDocument(ticket.id, file, mime, progress).catch(() => {});
  return { id: ticket.id };
}
export async function analyzeDocument(
  id: string,
  file: Blob | undefined,
  mime: string,
  progress: (message: string) => void,
): Promise<void> {
  try {
    let original: Blob;
    if (file) original = file;
    else {
      const response = await fetch(`/api/documents/${id}/file`, {
        credentials: "same-origin",
      });
      if (!response.ok)
        throw new Error("Original nicht erreichbar. Bitte erneut hochladen.");
      original = await response.blob();
    }
    const { readDocument } = await import("./browser-ocr");
    const pages = await readDocument(original, mime, progress);
    await api(`/documents/${id}/analysis`, {
      method: "POST",
      body: json({ pages }),
    });
    progress("Prüfbereit");
  } catch (error) {
    const message =
      (error as Error).message ||
      "Texterkennung fehlgeschlagen. Bitte Angaben manuell ergänzen.";
    await api(`/documents/${id}/analysis`, {
      method: "POST",
      body: json({ error: message }),
    }).catch(() => {});
    progress(message);
    throw error;
  }
}
