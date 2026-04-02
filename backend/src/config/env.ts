import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MainlineEnv {
  openAiApiKey?: string;
  openAiModel: string;
  openAiBaseUrl: string;
  llmProvider: "openai" | "none";
  backendUrl: string;
  liveWorkspace?: string;
  port: number;
  enableLiveMutations: boolean;
  enableAutoRepair: boolean;
}

let loaded = false;
let cachedEnv: MainlineEnv | undefined;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseDotEnv(content: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }

  return entries;
}

export function loadMainlineEnv(): MainlineEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  if (!loaded) {
    loaded = true;
    const envPath = path.join(__dirname, "..", "..", "..", ".env");
    if (existsSync(envPath)) {
      const parsed = parseDotEnv(readFileSync(envPath, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  }

  cachedEnv = {
    openAiApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
    openAiModel: process.env.OPENAI_MODEL || "openai/gpt-5-mini",
    openAiBaseUrl:
      process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
    llmProvider:
      process.env.MAINLINE_LLM_PROVIDER === "openai" ? "openai" : "none",
    backendUrl:
      process.env.MAINLINE_BACKEND_URL ?? "http://127.0.0.1:3847/cursor/hook",
    liveWorkspace: process.env.MAINLINE_LIVE_WORKSPACE,
    port: Number(process.env.PORT) || 3847,
    enableLiveMutations: parseBoolean(
      process.env.MAINLINE_ENABLE_LIVE_MUTATIONS,
      true
    ),
    enableAutoRepair: parseBoolean(
      process.env.MAINLINE_ENABLE_AUTO_REPAIR,
      true
    )
  };

  return cachedEnv;
}
