import crypto from "node:crypto";
import http from "node:http";

import { createAsyncContext, createConsoleTransport, createLogger } from "../src/index.js";

const ctx = createAsyncContext();
const log = createLogger({
  name: "http",
  level: "info",
  format: "pretty",
  transport: createConsoleTransport(),
  context: ctx
});

const server = http.createServer((req, res) => {
  ctx.run({ requestId: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()) }, () => {
    log.info("request", { method: req.method, url: req.url });
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok\n");
  });
});

server.listen(0, () => {
  const { port } = server.address();
  log.info("listening", { port });
  console.log("Try: curl http://127.0.0.1:" + port + "/");
  server.close();
});
