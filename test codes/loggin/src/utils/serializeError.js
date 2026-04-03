export function serializeError(err) {
  if (!err || typeof err !== "object") return { message: String(err) };

  const out = Object.create(null);
  out.name = err.name ?? "Error";
  out.message = err.message ?? "";
  if (typeof err.stack === "string") out.stack = err.stack;

  for (const key of Object.keys(err)) {
    if (key in out) continue;
    try {
      out[key] = err[key];
    } catch {
      // ignore non-enumerable / accessor issues
    }
  }

  return out;
}
