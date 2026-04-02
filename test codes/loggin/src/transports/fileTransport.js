import fs from "node:fs";
import path from "node:path";

export function createFileTransport(options) {
  if (!options || typeof options !== "object") {
    throw new Error("createFileTransport requires { filePath }");
  }

  const { filePath, mkdir = true } = options;
  if (!filePath || typeof filePath !== "string") {
    throw new Error("createFileTransport requires { filePath: string }");
  }

  if (mkdir) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

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

