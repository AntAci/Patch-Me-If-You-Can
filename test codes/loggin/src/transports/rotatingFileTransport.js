import fs from "node:fs";
import path from "node:path";

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function statSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

export function createRotatingFileTransport(options) {
  if (!options?.filePath || typeof options.filePath !== "string") {
    throw new Error("createRotatingFileTransport({ filePath: string, ... })");
  }

  const { filePath, maxBytes = 1024 * 1024, maxFiles = 5, mkdir = true } = options;

  if (mkdir) fs.mkdirSync(path.dirname(filePath), { recursive: true });

  let stream = fs.createWriteStream(filePath, { flags: "a" });
  let size = statSize(filePath);

  function rotated(i) {
    return `${filePath}.${i}`;
  }

  function rotate() {
    try {
      stream.end();
    } catch {
      // ignore
    }

    for (let i = maxFiles - 1; i >= 1; i--) {
      const src = rotated(i);
      const dst = rotated(i + 1);
      if (exists(src)) {
        try {
          fs.renameSync(src, dst);
        } catch {
          // ignore
        }
      }
    }

    if (exists(filePath)) {
      try {
        fs.renameSync(filePath, rotated(1));
      } catch {
        // ignore
      }
    }

    stream = fs.createWriteStream(filePath, { flags: "a" });
    size = 0;
  }

  return {
    write(line) {
      const bytes = Buffer.byteLength(line);
      if (size + bytes > maxBytes) rotate();
      stream.write(line);
      size += bytes;
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
