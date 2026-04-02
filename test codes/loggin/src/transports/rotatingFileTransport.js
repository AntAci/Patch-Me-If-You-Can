import fs from "node:fs";
import path from "node:path";

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function safeStatSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

export function createRotatingFileTransport(options) {
  if (!options || typeof options !== "object") {
    throw new Error("createRotatingFileTransport requires options");
  }

  const {
    filePath,
    maxBytes = 1024 * 1024,
    maxFiles = 5,
    mkdir = true
  } = options;

  if (!filePath || typeof filePath !== "string") {
    throw new Error("createRotatingFileTransport requires { filePath: string }");
  }

  if (mkdir) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  let stream = fs.createWriteStream(filePath, { flags: "a" });
  let size = safeStatSize(filePath);

  function rotatedPath(i) {
    return `${filePath}.${i}`;
  }

  function rotate() {
    try {
      stream.end();
    } catch {
      // ignore
    }

    for (let i = maxFiles - 1; i >= 1; i--) {
      const src = rotatedPath(i);
      const dst = rotatedPath(i + 1);
      if (fileExists(src)) {
        try {
          fs.renameSync(src, dst);
        } catch {
          // ignore
        }
      }
    }

    if (fileExists(filePath)) {
      try {
        fs.renameSync(filePath, rotatedPath(1));
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

