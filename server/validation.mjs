import { z } from "zod";
const text = z.string().trim().max(4000);
const short = z.string().trim().max(200);
const name = short.min(1);
const amount = z.number().finite().min(0).max(100000000).nullable();
const date = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(new Date(value + "T00:00:00Z").valueOf()) &&
        new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value),
    { message: "Bitte ein gültiges Kalenderdatum eintragen." },
  );
const source = z.object({
  page: z.number().int().min(1).max(1000),
  quote: z.string().max(2000),
});
export const schemas = {
  tasks: z.object({
    title: name,
    detail: text.default(""),
    category: short.default(""),
    priority: z.enum(["Hoch", "Normal", "Niedrig"]).default("Normal"),
    done: z.boolean().default(false),
    owner: short.default(""),
    due: date.default(""),
    event: short.default(""),
  }),
  providers: z.object({
    name,
    category: short,
    event: short.default(""),
    website: z
      .union([z.literal(""), z.url().refine((v) => /^https?:\/\//i.test(v))])
      .default(""),
    email: z.union([z.literal(""), z.email()]).default(""),
    phone: short.default(""),
    region: short.default(""),
    notes: text.default(""),
    status: z
      .enum([
        "Gefunden",
        "Angefragt",
        "Im Gespräch",
        "Angebot erhalten",
        "Favorit",
        "Gebucht",
        "Abgesagt",
      ])
      .default("Gefunden"),
    nextAction: short.default(""),
  }),
  offers: z.object({
    name,
    providerId: z.string().nullable().default(null),
    category: short.default("Foto & Video"),
    events: z.array(short).max(20).default([]),
    price: amount.default(null),
    currency: z
      .enum(["EUR", "USD", "GBP", "Nicht angegeben"])
      .default("Nicht angegeben"),
    basis: z
      .enum(["Brutto", "Netto", "Nicht angegeben"])
      .default("Nicht angegeben"),
    hours: text.default(""),
    team: text.default(""),
    photos: text.default(""),
    video: text.default(""),
    delivery: text.default(""),
    deposit: amount.default(null),
    balance: amount.default(null),
    paymentTerms: text.default(""),
    extras: text.default(""),
    included: text.default(""),
    excluded: text.default(""),
    optional: text.default(""),
    questions: text.default(""),
    contact: text.default(""),
    offerDate: short.default(""),
    validity: short.default(""),
    extraHours: text.default(""),
    packageName: short.default(""),
    eventDate: short.default(""),
    venue: short.default(""),
    guestCount: short.default(""),
    photoPrice: amount.default(null),
    videoPrice: amount.default(null),
    source: text.default(""),
    documentId: z.string().nullable().default(null),
    evidence: z.record(z.string().max(50), z.array(source).max(30)).default({}),
    manualFields: z.array(z.string().max(50)).max(100).default([]),
    status: z
      .enum(["Geprüft", "Favorit", "Gebucht", "Abgesagt"])
      .default("Geprüft"),
    decision: text.default(""),
    confirmed: z.literal(true),
  }),
  guests: z.object({
    name,
    household: short.default(""),
    type: z.enum(["Erwachsen", "Kind", "Begleitung"]).default("Erwachsen"),
    dietary: text.default(""),
    notes: text.default(""),
    attendance: z
      .record(
        z.string().max(200),
        z.enum(["Nicht eingeladen", "Eingeladen", "Zugesagt", "Abgesagt"]),
      )
      .default({}),
    table: short.default(""),
  }),
  costs: z
    .object({
      label: name,
      category: short.default(""),
      event: short.default(""),
      stage: z.enum(["Geschätzt", "Angebot", "Beauftragt"]),
      amount,
      paid: amount.default(null),
      due: date.default(""),
      offerId: z.string().nullable().default(null),
      notes: text.default(""),
    })
    .refine((d) => d.amount === null || d.paid === null || d.paid <= d.amount, {
      message: "Gezahlt darf den Gesamtpreis nicht überschreiten.",
    })
    .refine(
      (d) => d.stage === "Beauftragt" || d.paid === null || d.paid === 0,
      {
        message: "Zahlungen gehören zu beauftragten Kosten.",
      },
    ),
  events: z.object({
    name,
    position: z.number().int().min(0).max(100).default(99),
    date: date.default(""),
    location: short.default(""),
    guests: z.number().int().min(0).max(10000).nullable().default(null),
    notes: text.default(""),
    traditions: text.default(""),
    status: short.default("In Planung"),
  }),
  settings: z
    .object({
      target: amount,
      limit: amount,
      guests: z.number().int().min(1).max(10000),
      fixed: amount,
      perGuest: amount,
    })
    .refine(
      (d) => d.target === null || d.limit === null || d.target <= d.limit,
      { message: "Das Zielbudget darf nicht über der Obergrenze liegen." },
    ),
};
export const accountSchema = z.object({
  name,
  email: z
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(200),
});
export const loginSchema = z.object({
  email: z
    .email()
    .max(200)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200),
});
