// Produces a local signing key. No private material is written to stdout.
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
const directory = ".wedding-cloud";
mkdirSync(directory, { recursive: true, mode: 0o700 });
const path = directory + "/migration-signing.json";
if (!existsSync(path)) {
  const pair = generateKeyPairSync("ed25519");
  writeFileSync(
    path,
    JSON.stringify({
      privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }),
      publicKey: pair.publicKey.export({ format: "jwk" }),
    }),
    { mode: 0o600, flag: "wx" },
  );
}
const { publicKey } = JSON.parse(readFileSync(path, "utf8"));
console.log(JSON.stringify({ publicKey }));
