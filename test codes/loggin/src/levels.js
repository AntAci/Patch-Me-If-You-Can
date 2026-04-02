export const LEVELS = Object.freeze({
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 70
});

const ORDERED = Object.entries(LEVELS).sort((a, b) => a[1] - b[1]);

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
  let best = "info";
  let bestVal = -Infinity;
  for (const [name, val] of ORDERED) {
    if (val <= n && val >= bestVal) {
      best = name;
      bestVal = val;
    }
  }
  return best;
}
