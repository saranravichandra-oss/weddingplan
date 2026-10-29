import type { Offer } from "./data";
export type OfferDraft = {
  draft: Partial<Offer>;
  documentId: string;
  corrected: string[];
  mode: string;
  text: string;
  applied: string;
  savedAt: string;
};
const prefix = "wedding-ss:offer-draft:";
export const offerDraftKey = (userId: string, source: string) =>
  `${prefix}${userId}:${source}`;
export function readOfferDraft(key: string): OfferDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return value &&
      typeof value.draft === "object" &&
      value.draft !== null &&
      typeof value.documentId === "string" &&
      Array.isArray(value.corrected) &&
      typeof value.text === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function writeOfferDraft(key: string, value: OfferDraft) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function forgetOfferDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
export function clearOfferDrafts(userId: string, documentId?: string) {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (!key.startsWith(`${prefix}${userId}:`)) continue;
      const value = readOfferDraft(key);
      if (documentId === undefined || value?.documentId === documentId)
        sessionStorage.removeItem(key);
    }
  } catch {}
}
