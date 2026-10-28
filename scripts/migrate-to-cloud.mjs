import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { sign } from "node:crypto";
import { extractOffer } from "../server/extract.mjs";
const config = JSON.parse(readFileSync(".wedding-cloud/config.json", "utf8"));
const signing = JSON.parse(
  readFileSync(".wedding-cloud/migration-signing.json", "utf8"),
);
if (!existsSync(".wedding-cloud/migrating.lock"))
  throw new Error(
    "Vor der Übernahme muss die lokale Planung gegen gleichzeitige Änderungen gesperrt sein.",
  );
const snapshotPath = ".wedding-cloud/snapshot.json";
let snapshot;
if (existsSync(snapshotPath))
  snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
else {
  const db = new DatabaseSync(".wedding-data/wedding.sqlite", {
    readOnly: true,
  });
  db.exec("BEGIN");
  const users = db.prepare("select * from users").all();
  const records = db
    .prepare("select * from records")
    .all()
    .map((record) => ({ ...record, data: JSON.parse(record.data) }));
  const history = db
    .prepare("select * from record_history")
    .all()
    .map((record) => ({ ...record, data: JSON.parse(record.data) }));
  const invitations = db.prepare("select * from invitations").all();
  const documents = db
    .prepare("select * from documents")
    .all()
    .map((doc) => {
      const analysis = doc.analysis ? JSON.parse(doc.analysis) : null;
      return {
        ...doc,
        analysis: analysis?.pages?.length
          ? extractOffer(analysis.pages)
          : analysis,
        status: analysis?.pages?.length ? "complete" : "error",
        progress: analysis?.pages?.length
          ? "Prüfbereit"
          : "Bitte erneut auswerten",
      };
    });
  db.exec("COMMIT");
  db.close();
  if (!users.length)
    throw new Error(
      "Bitte zuerst den bestehenden privaten Zugang lokal einrichten.",
    );
  snapshot = { users, records, history, invitations, documents };
  writeFileSync(snapshotPath, JSON.stringify(snapshot));
}
async function send(path, data) {
  const payload = JSON.stringify(data);
  const signature = sign(
    null,
    Buffer.from(payload),
    signing.privateKey,
  ).toString("base64url");
  const response = await fetch(config.backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.publishableKey,
      "x-wedding-path": path,
      "x-wedding-signature": signature,
    },
    body: payload,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      `Geschützte Migration fehlgeschlagen (${response.status}): ${result.error || "Cloud-Verbindung prüfen"}`,
    );
  return result;
}
const marker = ".wedding-cloud/migration-result.json";
if (!existsSync(marker)) {
  await send("/migration", snapshot);
  writeFileSync(
    marker,
    JSON.stringify({ phase: "files", migratedAt: new Date().toISOString() }),
  );
}
if (JSON.parse(readFileSync(marker, "utf8")).phase === "complete") {
  console.log("Die Migration ist bereits abgeschlossen.");
  process.exit(0);
}
for (const doc of snapshot.documents) {
  if (basename(doc.filename) !== doc.filename)
    throw new Error("Ungültiger lokaler Dateiname.");
  const base64 = readFileSync(
    resolve(".wedding-data/documents", doc.filename),
  ).toString("base64");
  await send("/migration-file", { id: doc.id, base64 });
}
await send("/migration-finish", {});
writeFileSync(
  marker,
  JSON.stringify(
    {
      phase: "complete",
      migratedAt: new Date().toISOString(),
      siteUrl: config.siteUrl,
      users: snapshot.users.length,
      records: snapshot.records.length,
      documents: snapshot.documents.length,
    },
    null,
    2,
  ),
);
console.log(
  "Geschützte Migration abgeschlossen:",
  JSON.stringify({
    users: snapshot.users.length,
    records: snapshot.records.length,
    documents: snapshot.documents.length,
  }),
);
