import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./engine/pipeline.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCENARIO_FILES = {
    healthy: "healthy.json",
    "infected-healed": "infected-healed.json",
    "protected-zone-blocked": "protected-zone-blocked.json"
};
export async function runScenario(name) {
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
    return runPipeline(parsed);
}
export async function runScenarioDefinition(scenario) {
    return runPipeline(scenario);
}
