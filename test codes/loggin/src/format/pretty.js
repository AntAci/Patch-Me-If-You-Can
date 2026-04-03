import { safeJsonStringify } from "../utils/safeJson.js";

function ansi(code, s) {
  return `\u001b[${code}m${s}\u001b[0m`;
}

function levelCode(levelName) {
  switch (levelName) {
    case "trace":
      return 90;
    case "debug":
      return 36;
    case "info":
      return 32;
    case "warn":
      return 33;
    case "error":
      return 31;
    case "fatal":
      return 41;
    default:
      return 37;
  }
}

function restMeta(entry) {
  const { time, level, levelName, msg, err, ...rest } = entry;
  return rest;
}

export function formatPrettyLine(entry) {
  const useColor = Boolean(process?.stdout?.isTTY);
  const time = entry.time ?? "";
  const name = entry.name ? ` ${entry.name}` : "";
  const lvlRaw = String(entry.levelName ?? "").toUpperCase().padEnd(5, " ");
  const lvl = useColor ? ansi(levelCode(entry.levelName), lvlRaw) : lvlRaw;

  let out = `${time} ${lvl}${name}`;
  if (entry.msg) out += ` ${entry.msg}`;
  out += "\n";

  if (entry.err) {
    const e = entry.err;
    const head = e.name ? `${e.name}: ${e.message ?? ""}` : String(e.message ?? "");
    out += (useColor ? ansi(31, head) : head) + "\n";
    if (e.stack) out += String(e.stack) + "\n";
  }

  const meta = restMeta(entry);
  const keys = Object.keys(meta);
  if (keys.length) out += safeJsonStringify(meta) + "\n";

  return out;
}
