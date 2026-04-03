import { createServer } from "node:http";
import { loadMainlineEnv } from "../config/env.js";
import { runScenario } from "../runner.js";
import { toFrontendContract } from "../contract/frontend.js";
import { attachHookEventToMostRecentMutation, createMutationSeed, getMutationById, getRecentMutations, listRecentHookEvents, recordHookEvent, upsertMutation } from "../mutation/store.js";
import { normalizeHookMutation } from "../mutation/normalize.js";
import { processMutation } from "../mutation/process.js";
const SCENARIOS = new Set([
    "healthy",
    "infected-healed",
    "infected-escalated",
    "protected-zone-blocked"
]);
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
function scheduleTimelineBroadcast(send, result, mutationId) {
    const now = Date.now();
    const events = result.timeline.filter((event, idx) => !(idx === 0 && event.name === "scenario_received"));
    events.forEach((event, idx) => {
        const delay = 250 + idx * 320;
        setTimeout(() => {
            send({
                type: "timeline_event",
                event: {
                    ...event,
                    at: new Date(now + delay).toISOString(),
                    data: {
                        ...(event.data ?? {}),
                        mutationId,
                        zone: result.zone,
                        diagnosisCode: result.diagnosis.code,
                        health: result.health
                    }
                }
            });
        }, delay);
    });
}
async function runNamedScenario(name, liveWorkspacePath, format = "full") {
    const result = await runScenario(name, liveWorkspacePath ? { liveWorkspacePath } : {});
    return format === "contract" ? toFrontendContract(result) : result;
}
export function createMainlineServer(options = {}) {
    const env = loadMainlineEnv();
    const live = options.liveWorkspacePath ?? env.liveWorkspace;
    const server = createServer(async (req, res) => {
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
            json(res, 200, {
                ok: true,
                service: "mainline-immunity",
                llmProvider: env.llmProvider,
                liveMutations: env.enableLiveMutations
            });
            return;
        }
        if (url.pathname === "/scenarios" && req.method === "GET") {
            json(res, 200, { scenarios: [...SCENARIOS] });
            return;
        }
        if (url.pathname === "/api/scenarios" && req.method === "GET") {
            json(res, 200, [...SCENARIOS]);
            return;
        }
        const scenarioMatch = url.pathname.match(/^\/scenario\/([^/]+)\/?$/);
        const legacyScenarioMatch = url.pathname.match(/^\/api\/run\/([^/]+)\/?$/);
        const scenarioName = scenarioMatch?.[1] ??
            legacyScenarioMatch?.[1];
        if (scenarioName &&
            (req.method === "GET" ||
                (legacyScenarioMatch && req.method === "POST"))) {
            if (!SCENARIOS.has(scenarioName)) {
                json(res, 404, { error: "unknown_scenario", name: scenarioName });
                return;
            }
            try {
                const format = url.searchParams.get("format") === "contract" ? "contract" : "full";
                json(res, 200, await runNamedScenario(scenarioName, live, format));
            }
            catch (error) {
                json(res, 500, { error: String(error) });
            }
            return;
        }
        if (url.pathname === "/mutations/recent" && req.method === "GET") {
            json(res, 200, { mutations: getRecentMutations() });
            return;
        }
        const mutationMatch = url.pathname.match(/^\/mutation\/([^/]+)\/?$/);
        if (mutationMatch && req.method === "GET") {
            const mutation = getMutationById(mutationMatch[1]);
            if (!mutation) {
                json(res, 404, { error: "unknown_mutation", mutationId: mutationMatch[1] });
                return;
            }
            json(res, 200, mutation);
            return;
        }
        if (url.pathname === "/cursor/hook/recent" && req.method === "GET") {
            json(res, 200, { hooks: listRecentHookEvents() });
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
            const hookEvent = {
                at: new Date().toISOString(),
                event: parsed.event ?? "unknown",
                payload: parsed.payload ?? parsed
            };
            recordHookEvent(hookEvent);
            const normalized = normalizeHookMutation(hookEvent);
            if (!normalized || !env.enableLiveMutations) {
                sendRealtime({
                    type: "hook_event",
                    hook: hookEvent
                });
            }
            if (!env.enableLiveMutations || !normalized) {
                attachHookEventToMostRecentMutation(hookEvent);
                json(res, 200, {
                    ok: true,
                    received: true,
                    event: hookEvent.event,
                    ingested: false
                });
                return;
            }
            const mutation = upsertMutation(createMutationSeed({
                task: normalized.task,
                zone: normalized.zone,
                filesChanged: normalized.filesChanged,
                diffSummary: normalized.diffSummary,
                hookEvent
            }));
            mutation.status = "processing";
            upsertMutation(mutation);
            sendRealtime({
                type: "timeline_event",
                event: {
                    name: "scenario_received",
                    at: new Date().toISOString(),
                    attempt: 0,
                    data: {
                        scenarioId: mutation.mutationId,
                        patchId: mutation.mutationId.toUpperCase(),
                        mutationId: mutation.mutationId,
                        zone: mutation.zone,
                        filesChanged: mutation.filesChanged.join(", ")
                    }
                }
            });
            sendRealtime({
                type: "mutation_status",
                mutationId: mutation.mutationId,
                status: "processing",
                zone: mutation.zone,
                task: mutation.task,
                at: new Date().toISOString()
            });
            try {
                mutation.result = await processMutation(mutation);
                mutation.status = "completed";
                upsertMutation(mutation);
                sendRealtime({
                    type: "mutation_status",
                    mutationId: mutation.mutationId,
                    status: "completed",
                    zone: mutation.zone,
                    task: mutation.task,
                    at: new Date().toISOString()
                });
                scheduleTimelineBroadcast(sendRealtime, mutation.result, mutation.mutationId);
                json(res, 200, {
                    ok: true,
                    received: true,
                    event: hookEvent.event,
                    ingested: true,
                    mutationId: mutation.mutationId,
                    verdict: mutation.result.finalVerdict
                });
            }
            catch (error) {
                mutation.status = "failed";
                mutation.error = String(error);
                upsertMutation(mutation);
                sendRealtime({
                    type: "mutation_status",
                    mutationId: mutation.mutationId,
                    status: "failed",
                    zone: mutation.zone,
                    task: mutation.task,
                    at: new Date().toISOString(),
                    error: mutation.error
                });
                json(res, 500, {
                    error: "mutation_processing_failed",
                    mutationId: mutation.mutationId,
                    detail: String(error)
                });
            }
            return;
        }
        json(res, 404, { error: "not_found", path: url.pathname });
    });
    function sendRealtime(payload) {
        void payload;
    }
    return server;
}
export function listenMainlineServer(options = {}) {
    const env = loadMainlineEnv();
    const port = options.port ?? env.port;
    const server = createMainlineServer(options);
    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            const address = server.address();
            const actualPort = address && typeof address === "object" ? address.port : port;
            resolve({
                port: actualPort,
                close: () => new Promise((res, rej) => {
                    server.close((err) => (err ? rej(err) : res(undefined)));
                })
            });
        });
        server.on("error", reject);
    });
}
