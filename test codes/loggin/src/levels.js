export const LEVELS = Object.freeze({
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 70
});

export function normalizeLevel(level) {
  if (typeof level === "number" && Number.isFinite(level)) return level;
  if (typeof level !== "string") return LEVELS.info;
  const key = level.trim().toLowerCase();
  return LEVELS[key] ?? LEVELS.info;
}

export function levelToNumber(level) {
  return normalizeLevel(level);
}

export function numberToLevelName(num) {
  const n = normalizeLevel(num);
  const entries = Object.entries(LEVELS).sort((a, b) => a[1] - b[1]);
  for (let i = entries.length - 1; i >= 0; i--) {
    const [name, val] = entries[i];
    if (n >= val) return name;
  }
  return "info";
}
