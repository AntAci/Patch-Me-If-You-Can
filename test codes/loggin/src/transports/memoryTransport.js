export function createMemoryTransport() {
  const lines = [];
  const entries = [];

  return {
    lines,
    entries,
    write(line, entry) {
      lines.push(line);
      if (entry) entries.push(entry);
    },
    clear() {
      lines.length = 0;
      entries.length = 0;
    }
  };
}
