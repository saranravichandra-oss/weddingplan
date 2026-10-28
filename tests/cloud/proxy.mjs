// Local integration harness for the deployed backend, never the local SQLite app.
import express from "express";
import fs from "node:fs";
import { GET as proxy } from "../../api/index.mjs";
const config = JSON.parse(
  fs.readFileSync(".wedding-cloud/config.json", "utf8"),
);
process.env.WEDDING_BACKEND_URL = config.backendUrl;
process.env.WEDDING_BACKEND_PUBLIC_KEY = config.publishableKey;
const csp = JSON.parse(fs.readFileSync("vercel.json", "utf8")).headers[0]
  .headers;
const app = express();
app.use((req, res, next) => {
  for (const { key, value } of csp) res.setHeader(key, value);
  next();
});
app.use(
  "/api",
  express.raw({ type: () => true, limit: "3mb" }),
  async (req, res) => {
    const result = await proxy(
      new Request("http://127.0.0.1:5193/api" + req.url, {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD"].includes(req.method)
          ? undefined
          : req.body?.length
            ? req.body
            : undefined,
      }),
    );
    res.status(result.status);
    for (const [key, value] of result.headers) res.setHeader(key, value);
    res.end(Buffer.from(await result.arrayBuffer()));
  },
);
app.use(express.static("dist-cloud"));
app.get("/{*path}", (req, res) =>
  res.sendFile("index.html", { root: process.cwd() + "/dist-cloud" }),
);
app.listen(5193, "127.0.0.1");
