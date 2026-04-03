#!/usr/bin/env node
import { createConsoleTransport, createLogger } from "../src/index.js";

const argv = process.argv.slice(2);
let level = "info";
let format = "json";
const rest = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--level" && argv[i + 1]) {
    level = argv[++i];
    continue;
  }
  if (a === "--format" && argv[i + 1]) {
    format = argv[++i];
    continue;
  }
  if (a === "--help" || a === "-h") {
    console.log(`usage: loggin [--level trace|debug|info|warn|error|fatal] [--format json|pretty] [message...]`);
    process.exit(0);
  }
  rest.push(a);
}

const msg = rest.length ? rest.join(" ") : "hello from loggin";

const log = createLogger({
  name: "cli",
  level,
  format,
  transport: createConsoleTransport()
});

log.info(msg);
