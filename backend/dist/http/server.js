import { createServer } from "node:http";
import { runScenario } from "../runner.js";
import { toFrontendContract } from "../contract/frontend.js";
const SCENARIOS = new Set([
    "healthy",
    "infected-healed",
    "protected-zone-blocked"
]);
/** Ring buffer of Cursor hook events (for demo / debugging). */
const CURSOR_HOOK_LOG = [];
const CURSOR_HOOK_LOG_MAX = 100;
function json(res, status, body) {
    const payload = JSON.stringify(body, null, 2);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
    });
    res.end(payload);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}
export function createMainlineServer(options = {}) {
    const live = options.liveWorkspacePath ?? process.env.MAINLINE_LIVE_WORKSPACE;
    return createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        if (req.method === "OPTIONS") {
            res.writeHead(204, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
            const name = scenarioMatch[1];
            if (!SCENARIOS.has(name)) {
                json(res, 404, { error: "unknown_scenario", name });
                return;
            }
            try {
                const result = await runScenario(name, live ? { liveWorkspacePath: live } : {});
                const contract = url.searchParams.get("format") === "full" ? result : toFrontendContract(result);
                json(res, 200, contract);
            }
            catch (e) {
                json(res, 500, { error: String(e) });
            }
            return;
        }
        if (url.pathname === "/scenarios" && req.method === "GET") {
            json(res, 200, { scenarios: [...SCENARIOS] });
            return;
        }
        /** Cursor IDE hooks bridge (see `.cursor/hooks.json` + `scripts/cursor-hook-bridge.mjs`). */
        if (url.pathname === "/cursor/hook" && req.method === "POST") {
            let bodyText = "";
            try {
                bodyText = await readBody(req);
            }
            catch {
                json(res, 400, { error: "read_body_failed" });
                return;
            }
            let parsed = {};
            try {
                parsed = JSON.parse(bodyText || "{}");
            }
            catch {
                json(res, 400, { error: "invalid_json" });
                return;
            }
            const event = parsed.event ?? "unknown";
            CURSOR_HOOK_LOG.push({
                at: new Date().toISOString(),
                event,
                payload: parsed.payload ?? parsed
            });
            if (CURSOR_HOOK_LOG.length > CURSOR_HOOK_LOG_MAX) {
                CURSOR_HOOK_LOG.splice(0, CURSOR_HOOK_LOG.length - CURSOR_HOOK_LOG_MAX);
            }
            json(res, 200, { ok: true, received: true, event });
            return;
        }
        if (url.pathname === "/cursor/hook/recent" && req.method === "GET") {
            json(res, 200, { hooks: [...CURSOR_HOOK_LOG].reverse() });
            return;
        }
        json(res, 404, { error: "not_found", path: url.pathname });
    });
}
export function listenMainlineServer(options = {}) {
    const port = options.port ?? (Number(process.env.PORT) || 3847);
    const server = createMainlineServer(options);
    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            resolve({
                port,
                close: () => new Promise((res, rej) => {
                    server.close((err) => (err ? rej(err) : res(undefined)));
                })
            });
        });
        server.on("error", reject);
    });
}
