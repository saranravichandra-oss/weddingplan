import type { Section } from "./data";
export const sectionPaths: Record<Section, string> = {
  Übersicht: "uebersicht",
  Dienstleister: "dienstleister",
  Entdecken: "entdecken",
  Gäste: "gaeste",
  Budget: "budget",
  Aufgaben: "aufgaben",
  Veranstaltungen: "veranstaltungen",
  Dokumente: "dokumente",
  Gemeinsam: "gemeinsam",
};
export function currentSection(): Section {
  return (
    (Object.entries(sectionPaths).find(
      ([, path]) =>
        path === new URLSearchParams(location.search).get("bereich"),
    )?.[0] as Section) || "Übersicht"
  );
}
export function sectionHref(section: Section) {
  const url = new URL(location.href);
  url.searchParams.set("bereich", sectionPaths[section]);
  url.hash = "";
  return url.pathname + url.search;
}
