export type Section =
  | "Übersicht"
  | "Dienstleister"
  | "Gäste"
  | "Budget"
  | "Aufgaben"
  | "Veranstaltungen"
  | "Dokumente"
  | "Gemeinsam";
export const events = ["Standesamt", "Tamilische Zeremonie", "Reception"];
export const categories = [
  "Foto & Video",
  "Catering",
  "Location",
  "Musik",
  "Outfits & Styling",
  "Sonstiges",
];
export type User = { id: string; name: string; email: string };
export type Stored = {
  id: string;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
};
export type Evidence = Record<string, { page: number; quote: string }[]>;
export type Offer = Stored & {
  name: string;
  providerId: string | null;
  category: string;
  events: string[];
  price: number | null;
  currency: string;
  basis: string;
  hours: string;
  team: string;
  photos: string;
  video: string;
  delivery: string;
  deposit: number | null;
  balance: number | null;
  paymentTerms: string;
  extras: string;
  included: string;
  excluded: string;
  optional: string;
  questions: string;
  contact: string;
  offerDate: string;
  validity: string;
  extraHours: string;
  packageName: string;
  source: string;
  documentId: string | null;
  evidence: Evidence;
  manualFields: string[];
  status: string;
  decision: string;
  confirmed: true;
};
export type Provider = Stored & {
  name: string;
  category: string;
  event: string;
  website: string;
  email: string;
  phone: string;
  region: string;
  notes: string;
  status: string;
  nextAction: string;
};
export type Task = Stored & {
  title: string;
  detail: string;
  category: string;
  priority: string;
  done: boolean;
  owner: string;
  due: string;
  event: string;
};
export type Guest = Stored & {
  name: string;
  household: string;
  type: string;
  dietary: string;
  notes: string;
  attendance: Record<string, string>;
  table: string;
};
export type Cost = Stored & {
  label: string;
  category: string;
  event: string;
  stage: string;
  amount: number | null;
  paid: number | null;
  due: string;
  offerId: string | null;
  notes: string;
};
export type WeddingEvent = Stored & {
  name: string;
  date: string;
  location: string;
  guests: number | null;
  notes: string;
  traditions: string;
  status: string;
};
export type Budget = Stored & {
  target: number | null;
  limit: number | null;
  guests: number;
  fixed: number | null;
  perGuest: number | null;
};
export type Analysis = {
  fields: Partial<Offer>;
  evidence: Evidence;
  warnings: string[];
  engine: string;
  analyzedAt: string;
  pages: { page: number; text: string; method: string; confidence?: number }[];
};
export type Document = {
  id: string;
  name: string;
  mime: string;
  size: number;
  status: "queued" | "running" | "complete" | "error";
  progress: string;
  error?: string;
  createdAt?: string;
  analysis?: Analysis | null;
};
export type AppState = {
  tasks: Task[];
  providers: Provider[];
  offers: Offer[];
  guests: Guest[];
  costs: Cost[];
  events: WeddingEvent[];
  settings: Budget[];
  documents: Document[];
  members: User[];
  network: string[];
  paidApiCalls: false;
};
export type Kind =
  "tasks" | "providers" | "offers" | "guests" | "costs" | "events" | "settings";
export const money = (value: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
export const price = (value: number | null, currency = "EUR") =>
  value === null
    ? "Nicht angegeben"
    : currency === "EUR"
      ? money(value)
      : `${value.toLocaleString("de-DE")} ${currency}`;
export const dateText = (value: string) =>
  value
    ? new Intl.DateTimeFormat("de-DE").format(new Date(value + "T12:00:00"))
    : "Noch offen";
export const emptyOffer: Omit<Offer, keyof Stored> = {
  name: "",
  providerId: null,
  category: "Foto & Video",
  events: [],
  price: null,
  currency: "Nicht angegeben",
  basis: "Nicht angegeben",
  hours: "",
  team: "",
  photos: "",
  video: "",
  delivery: "",
  deposit: null,
  balance: null,
  paymentTerms: "",
  extras: "",
  included: "",
  excluded: "",
  optional: "",
  questions: "",
  contact: "",
  offerDate: "",
  validity: "",
  extraHours: "",
  packageName: "",
  source: "",
  documentId: null,
  evidence: {},
  manualFields: [],
  status: "Geprüft",
  decision: "",
  confirmed: true,
};
