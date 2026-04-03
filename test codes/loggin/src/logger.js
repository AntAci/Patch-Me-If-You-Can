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

function pickFormatter(format) {
  const f = (format ?? "json").toLowerCase();
  return f === "pretty" ? formatPrettyLine : formatJsonLine;
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

  const list = [];
  if (transport) list.push(transport);
  if (Array.isArray(transports)) list.push(...transports);
  if (list.length === 0) {
    throw new Error(
      "createLogger needs transport or transports (e.g. createConsoleTransport())"
    );
  }

  const formatter = pickFormatter(format);
  const bindings = Object.assign(Object.create(null), base ?? {});
  if (name) bindings.name = name;

  let threshold = normalizeLevel(level);

  function emit(line, entry) {
    for (const t of list) {
      try {
        if (typeof t.write === "function") t.write(line, entry);
      } catch {
        // transport failure must not throw
      }
    }
  }

  function buildEntry(levelNum, args) {
    const { err, msg, data } = normalizeArgs(args);
    const ctx = context?.get?.();
    const entry = Object.assign(Object.create(null), bindings);
    if (ctx && typeof ctx === "object") Object.assign(entry, ctx);

    entry.time = now();
    entry.level = levelNum;
    entry.levelName = numberToLevelName(levelNum);
    if (msg !== undefined) entry.msg = msg;
    if (data) Object.assign(entry, data);
    if (err) entry.err = serializeError(err);
    return entry;
  }

  const logger = {
    setLevel(next) {
      threshold = normalizeLevel(next);
    },
    getLevel() {
      return threshold;
    },
    child(extra) {
      return createLogger({
        name,
        level: threshold,
        format,
        transports: list,
        now,
        context,
        base: Object.assign(Object.create(null), bindings, extra ?? {})
      });
    },
    log(levelLike, ...args) {
      const levelNum = normalizeLevel(levelLike);
      if (levelNum < threshold || threshold >= LEVELS.silent) return;
      const entry = buildEntry(levelNum, args);
      emit(formatter(entry), entry);
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
      for (const t of list) {
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
