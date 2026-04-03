import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createLogger, createRotatingFileTransport } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, ".tmp", "rotate.log");
fs.mkdirSync(path.dirname(out), { recursive: true });

const transport = createRotatingFileTransport({
  filePath: out,
  maxBytes: 200,
  maxFiles: 3
});

const log = createLogger({
  name: "rotate",
  level: "info",
  format: "json",
  transport
});

for (let i = 0; i < 50; i++) {
  log.info("line", { i, pad: "x".repeat(40) });
}

transport.close();
console.log("Rotating log:", out);
