import { createConsoleTransport, createLogger } from "../src/index.js";

const log = createLogger({
  name: "basic",
  level: "trace",
  format: "pretty",
  transport: createConsoleTransport()
});

log.trace("trace", { n: 1 });
log.debug("debug");
log.info("hello", { answer: 42 });
log.warn("warn", { tag: "demo" });
log.error(new Error("boom"), "failed");
