export const attendanceValues = [
  "Nicht angegeben",
  "Nicht eingeladen",
  "Vorgesehen",
  "Eingeladen",
  "Zugesagt",
  "Abgesagt",
];
export const guestKey = (name) =>
  name.trim().replace(/\s+/g, " ").toLowerCase();
export const peopleCount = (guests) =>
  guests.reduce((sum, guest) => sum + (guest.partySize ?? 1), 0);
