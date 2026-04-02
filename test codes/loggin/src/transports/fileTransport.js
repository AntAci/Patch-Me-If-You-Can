import fs from "node:fs";
import path from "node:path";

export function createFileTransport(options) {
  if (!options?.filePath || typeof options.filePath !== "string") {
    throw new Error("createFileTransport({ filePath: string })");
  }

  const { filePath, mkdir = true } = options;
  if (mkdir) fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const stream = fs.createWriteStream(filePath, { flags: "a" });

  return {
    write(line) {
      stream.write(line);
    },
    close() {
      try {
        stream.end();
      } catch {
        // ignore
      }
    }
  };
}
