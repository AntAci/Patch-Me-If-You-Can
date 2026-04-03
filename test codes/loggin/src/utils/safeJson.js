export function safeJsonStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (typeof v === "function") return `[Function ${v.name || "anonymous"}]`;
      if (v && typeof v === "object") {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }
      return v;
    },
    0
  );
}
