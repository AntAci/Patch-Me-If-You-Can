import { createConsoleTransport, createLogger } from "../src/index.js";

const log = createLogger({
  name: "basic-example",
  level: "trace",
  format: "pretty",
  transport: createConsoleTransport()
});

log.trace("trace message", { a: 1 });
log.debug("debug message");
log.info("hello", { answer: 42 });
log.warn("watch out", { feature: "demo" });
log.error(new Error("boom"), "something failed");

