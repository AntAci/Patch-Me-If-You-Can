import { LEVELS, normalizeLevel, numberToLevelName } from "./levels.js";
import { formatJsonLine } from "./format/json.js";
import { formatPrettyLine } from "./format/pretty.js";
import { serializeError } from "./utils/serializeError.js";

function defaultNow() {
  return new Date().toISOString();
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function normalizeArgs(args) {
  let err;
  let msg;
  const objects = [];

  for (const a of args) {
    if (a instanceof Error && !err) {
      err = a;
      continue;
    }
    if (typeof a === "string" && msg === undefined) {
      msg = a;
      continue;
    }
    if (isPlainObject(a)) objects.push(a);
  }

  const data =
    objects.length === 0 ? undefined : Object.assign(Object.create(null), ...objects);

  return { err, msg, data };
}

function makeFormatter(format) {
  const f = (format ?? "json").toLowerCase();
  if (f === "pretty") return formatPrettyLine;
  return formatJsonLine;
}

export function createLogger(options = {}) {
  const {
    name,
    level = "info",
    format = "json",
    transport,
    transports,
    base,
    now = defaultNow,
    context
  } = options;

  const allTransports = [];
  if (transport) allTransports.push(transport);
  if (Array.isArray(transports)) allTransports.push(...transports);
  if (allTransports.length === 0) {
    throw new Error(
      "createLogger requires a transport/transports (e.g. createConsoleTransport())"
    );
  }

  const formatter = makeFormatter(format);
  const baseBindings = Object.assign(Object.create(null), base ?? {});
  if (name) baseBindings.name = name;

  function writeToTransports(line, entry) {
    for (const t of allTransports) {
      try {
        if (typeof t.write === "function") t.write(line, entry);
      } catch {
        // ignore transport errors
      }
    }
  }

  function buildEntry(levelNum, args) {
    const { err, msg, data } = normalizeArgs(args);
    const ctx = context?.get?.() ?? undefined;

    const entry = Object.assign(Object.create(null), baseBindings);
    if (ctx && typeof ctx === "object") Object.assign(entry, ctx);

    entry.time = now();
    entry.level = levelNum;
    entry.levelName = numberToLevelName(levelNum);
    if (msg !== undefined) entry.msg = msg;
    if (data) Object.assign(entry, data);
    if (err) entry.err = serializeError(err);

    return entry;
  }

  let threshold = normalizeLevel(level);

  const logger = {
    setLevel(next) {
      threshold = normalizeLevel(next);
    },
    getLevel() {
      return threshold;
    },
    child(bindings) {
      return createLogger({
        name,
        level: threshold,
        format,
        transport,
        transports: allTransports,
        now,
        context,
        base: Object.assign(Object.create(null), baseBindings, bindings ?? {})
      });
    },
    log(levelLike, ...args) {
      const levelNum = normalizeLevel(levelLike);
      if (levelNum < threshold || threshold >= LEVELS.silent) return;
      const entry = buildEntry(levelNum, args);
      const line = formatter(entry);
      writeToTransports(line, entry);
      return entry;
    },
    trace(...args) {
      return logger.log(LEVELS.trace, ...args);
    },
    debug(...args) {
      return logger.log(LEVELS.debug, ...args);
    },
    info(...args) {
      return logger.log(LEVELS.info, ...args);
    },
    warn(...args) {
      return logger.log(LEVELS.warn, ...args);
    },
    error(...args) {
      return logger.log(LEVELS.error, ...args);
    },
    fatal(...args) {
      return logger.log(LEVELS.fatal, ...args);
    },
    close() {
      for (const t of allTransports) {
        try {
          t.close?.();
        } catch {
          // ignore
        }
      }
    }
  };

  return logger;
}

