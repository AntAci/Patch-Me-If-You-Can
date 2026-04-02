import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./engine/pipeline.js";
import type { ScenarioDefinition, ScenarioName } from "./schemas/scenario.js";
import type { ScenarioRunResult } from "./schemas/events.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIO_FILES: Record<ScenarioName, string> = {
  healthy: "healthy.json",
  "infected-healed": "infected-healed.json",
  "protected-zone-blocked": "protected-zone-blocked.json"
};

export async function runScenario(name: ScenarioName): Promise<ScenarioRunResult> {
  const fileName = SCENARIO_FILES[name];
  let raw: string | undefined;

  for (const scenarioPath of [
    path.join(__dirname, "scenarios", fileName),
    path.join(__dirname, "..", "src", "scenarios", fileName)
  ]) {
    try {
      raw = await readFile(scenarioPath, "utf8");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (!raw) {
    throw new Error(`Scenario fixture not found for ${name}`);
  }

  const parsed = JSON.parse(raw) as ScenarioDefinition;
  return runPipeline(parsed);
}

export async function runScenarioDefinition(
  scenario: ScenarioDefinition
): Promise<ScenarioRunResult> {
  return runPipeline(scenario);
}
