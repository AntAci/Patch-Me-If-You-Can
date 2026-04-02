export function createConsoleTransport(options = {}) {
  const { stream = process.stdout } = options;

  return {
    write(line) {
      try {
        stream.write(line);
      } catch {
        // ignore
      }
    }
  };
}
