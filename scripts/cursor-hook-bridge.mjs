#!/usr/bin/env node
/**
 * Cursor hooks bridge → Mainline Immunity backend (POST /cursor/hook).
 * Reads JSON from stdin (Cursor hook payload), forwards to the server, writes JSON to stdout.
 * If the backend is down, still prints a safe default so Cursor does not break.
 *
 * Env: MAINLINE_BACKEND_URL (default http://127.0.0.1:3847/cursor/hook)
 */
const event = process.argv[2] ?? "unknown";

/** Read hook JSON from stdin (Cursor pipes JSON here). `fs.readFile(0)` is unreliable on Node 20+. */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

let stdin = "";
try {
  stdin = await readStdin();
} catch {
  stdin = "";
}

let payload = {};
try {
  payload = JSON.parse(stdin || "{}");
} catch {
  payload = { parseError: true, raw: String(stdin).slice(0, 8000) };
}

const url = process.env.MAINLINE_BACKEND_URL ?? "http://127.0.0.1:3847/cursor/hook";

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, payload })
  });
  if (!res.ok) {
    await res.text().catch(() => "");
  }
} catch {
  /* backend not running — hooks still must exit 0 with valid stdout */
}

/**
 * Cursor expects JSON on stdout per hook type. Observer hooks use `{}`.
 * @see https://cursor.com/docs/hooks
 */
const outByEvent = {
  afterAgentResponse: {},
  afterShellExecution: {},
  afterFileEdit: {},
  stop: {},
  afterAgentThought: {},
  afterMCPExecution: {},
  beforeReadFile: {},
  beforeShellExecution: {},
  beforeMCPExecution: {},
  beforeSubmitPrompt: {},
  beforeTabFileRead: {}
};

const fallback = outByEvent[event] ?? {};
process.stdout.write(JSON.stringify(fallback));
