import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./engine/pipeline.js";
import { runChecksInWorkspace } from "./engine/verification.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCENARIO_FILES = {
    healthy: "healthy.json",
    "infected-healed": "infected-healed.json",
    "protected-zone-blocked": "protected-zone-blocked.json"
};
export async function runScenario(name, options = {}) {
    const fileName = SCENARIO_FILES[name];
    let raw;
    for (const scenarioPath of [
        path.join(__dirname, "scenarios", fileName),
        path.join(__dirname, "..", "src", "scenarios", fileName)
    ]) {
        try {
            raw = await readFile(scenarioPath, "utf8");
            break;
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }
    if (!raw) {
        throw new Error(`Scenario fixture not found for ${name}`);
    }
    const parsed = JSON.parse(raw);
    const livePath = options.liveWorkspacePath ?? process.env.MAINLINE_LIVE_WORKSPACE;
    if (livePath) {
        const live = await runChecksInWorkspace(livePath);
        const merged = {
            ...parsed,
            initialChecks: live.checks
        };
        const pipelineOptions = {
            verificationFailures: live.failures
        };
        return runPipeline(merged, pipelineOptions);
    }
    return runPipeline(parsed);
}
export async function runScenarioDefinition(scenario, options = {}) {
    const livePath = options.liveWorkspacePath ?? process.env.MAINLINE_LIVE_WORKSPACE;
    if (livePath) {
        const live = await runChecksInWorkspace(livePath);
        const merged = {
            ...scenario,
            initialChecks: live.checks
        };
        return runPipeline(merged, {
            ...options,
            verificationFailures: live.failures
        });
    }
    return runPipeline(scenario, options);
}
