export const attendanceValues: readonly [
  "Nicht angegeben",
  "Nicht eingeladen",
  "Vorgesehen",
  "Eingeladen",
  "Zugesagt",
  "Abgesagt",
];
export function guestKey(name: string): string;
export function peopleCount(guests: { partySize?: number }[]): number;
