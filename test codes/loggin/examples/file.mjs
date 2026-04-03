import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFileTransport, createLogger } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, ".tmp", "app.log");
fs.mkdirSync(path.dirname(out), { recursive: true });

const transport = createFileTransport({ filePath: out });
const log = createLogger({
  name: "file-example",
  level: "info",
  format: "json",
  transport
});

log.info("written to file", { path: out });
transport.close();

console.log("Wrote:", out);
