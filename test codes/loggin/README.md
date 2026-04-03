# loggin

Self-contained logging for Node.js 18+. No npm dependencies—only `node:fs`, `node:path`, `node:async_hooks`.

## Layout

- `src/logger.js` — `createLogger`, child loggers, level filtering
- `src/levels.js` — numeric levels and names
- `src/format/` — JSON line and pretty (TTY-colored) output
- `src/transports/` — console, file, rotating file, in-memory (tests)
- `src/context/asyncContext.js` — `AsyncLocalStorage` helpers for request-scoped fields

## Quick start

```bash
cd "test codes/loggin"
npm test
npm run example:basic
```

## Minimal usage

```js
import { createLogger, createConsoleTransport } from "./src/index.js";

const log = createLogger({
  name: "app",
  level: "info",
  format: "pretty",
  transport: createConsoleTransport()
});

log.info("server up", { port: 3000 });
log.error(new Error("failed"), "request", { path: "/api" });
```

## CLI

```bash
node ./bin/loggin.mjs --level info --format pretty "hello world"
```
