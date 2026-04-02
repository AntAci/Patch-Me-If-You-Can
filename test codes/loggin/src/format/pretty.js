import { safeJsonStringify } from "../utils/safeJson.js";

function color(code, s) {
  return `\u001b[${code}m${s}\u001b[0m`;
}

function levelColor(levelName) {
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

function pickMeta(entry) {
  const { time, level, levelName, msg, err, ...rest } = entry;
  return rest;
}

export function formatPrettyLine(entry) {
  const time = entry.time ?? "";
  const name = entry.name ? ` ${entry.name}` : "";
  const levelName = String(entry.levelName ?? "").toUpperCase().padEnd(5, " ");
  const useColor = Boolean(process?.stdout?.isTTY);
  const lvl = useColor ? color(levelColor(entry.levelName), levelName) : levelName;

  let line = `${time} ${lvl}${name}`;
  if (entry.msg) line += ` ${entry.msg}`;
  line += "\n";

  if (entry.err) {
    const e = entry.err;
    const header = e.name ? `${e.name}: ${e.message ?? ""}` : `${e.message ?? ""}`;
    line += useColor ? color(31, header) : header;
    line += "\n";
    if (e.stack) line += String(e.stack) + "\n";
  }

  const meta = pickMeta(entry);
  const keys = Object.keys(meta);
  if (keys.length) {
    line += safeJsonStringify(meta) + "\n";
  }

  return line;
}

