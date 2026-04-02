export function createMemoryTransport() {
  const entries = [];
  const lines = [];

  return {
    entries,
    lines,
    write(line, entry) {
      lines.push(line);
      if (entry) entries.push(entry);
    },
    clear() {
      entries.length = 0;
      lines.length = 0;
    }
  };
}

