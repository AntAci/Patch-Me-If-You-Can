import { createServer } from "node:http";
import type { ScenarioName } from "../schemas/scenario.js";
import { runScenario } from "../runner.js";
import { toFrontendContract } from "../contract/frontend.js";

const SCENARIOS = new Set<ScenarioName>([
  "healthy",
  "infected-healed",
  "protected-zone-blocked"
]);

export interface ServerOptions {
  port?: number;
  /** When set, GET /scenario/:name runs live checks in this directory. */
  liveWorkspacePath?: string;
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(payload);
}

export function createMainlineServer(options: ServerOptions = {}) {
  const live = options.liveWorkspacePath ?? process.env.MAINLINE_LIVE_WORKSPACE;

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }

    if (url.pathname === "/health" && req.method === "GET") {
      json(res, 200, { ok: true, service: "mainline-immunity" });
      return;
    }

    const scenarioMatch = url.pathname.match(/^\/scenario\/([^/]+)\/?$/);
    if (scenarioMatch && req.method === "GET") {
      const name = scenarioMatch[1] as ScenarioName;
      if (!SCENARIOS.has(name)) {
        json(res, 404, { error: "unknown_scenario", name });
        return;
      }
      try {
        const result = await runScenario(name, live ? { liveWorkspacePath: live } : {});
        const contract = url.searchParams.get("format") === "full" ? result : toFrontendContract(result);
        json(res, 200, contract);
      } catch (e) {
        json(res, 500, { error: String(e) });
      }
      return;
    }

    if (url.pathname === "/scenarios" && req.method === "GET") {
      json(res, 200, { scenarios: [...SCENARIOS] });
      return;
    }

    json(res, 404, { error: "not_found", path: url.pathname });
  });
}

export function listenMainlineServer(options: ServerOptions = {}) {
  const port = options.port ?? (Number(process.env.PORT) || 3847);
  const server = createMainlineServer(options);
  return new Promise<{ port: number; close: () => Promise<void> }>((resolve, reject) => {
    server.listen(port, () => {
      resolve({
        port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res(undefined)));
          })
      });
    });
    server.on("error", reject);
  });
}
