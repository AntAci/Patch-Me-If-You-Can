# loggin

`loggin` is a small, dependency-free logging toolkit you can drop into Node.js scripts.

## Features

- Multiple log levels (`trace` → `fatal`, plus `silent`)
- JSON logs (machine-friendly) and pretty logs (human-friendly)
- Pluggable transports (console, file, rotating file, memory)
- Child loggers with persistent bindings (e.g. `service`, `requestId`)
- Optional async context tracking via `AsyncLocalStorage`

## Quick start

From inside this folder:

```bash
npm test
npm run example:basic
```

## Usage

```js
import { createLogger } from "./src/index.js";
import { createConsoleTransport } from "./src/index.js";

const log = createLogger({
  name: "demo",
  level: "info",
  format: "pretty",
  transport: createConsoleTransport()
});

log.info("hello", { answer: 42 });
log.warn("careful!");
log.error(new Error("boom"), "something failed");
```

## Examples

- `npm run example:basic`
- `npm run example:file`
- `npm run example:http`

