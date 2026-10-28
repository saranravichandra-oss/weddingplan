import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, copyFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const source = resolve(process.env.WEDDING_DATA_DIR || ".wedding-data");
const destination = resolve(
  process.env.WEDDING_BACKUP_DIR || ".wedding-backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
const db = new DatabaseSync(join(source, "wedding.sqlite"), { readOnly: true });
await mkdir(join(destination, "documents"), { recursive: true, mode: 0o700 });
await backup(db, join(destination, "wedding.sqlite"));
db.close();
const snapshot = new DatabaseSync(join(destination, "wedding.sqlite"), {
  readOnly: true,
});
for (const doc of snapshot.prepare("SELECT filename FROM documents").all())
  await copyFile(
    join(source, "documents", doc.filename),
    join(destination, "documents", doc.filename),
  );
snapshot.close();
console.log("Vollständiges lokales Backup erstellt:", destination);
