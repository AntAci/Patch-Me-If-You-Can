import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline, type PipelineOptions } from "./engine/pipeline.js";
import { runChecksInWorkspace } from "./engine/verification.js";
import type { ScenarioDefinition, ScenarioName } from "./schemas/scenario.js";
import type { ScenarioRunResult } from "./schemas/events.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIO_FILES: Record<ScenarioName, string> = {
  healthy: "healthy.json",
  "infected-healed": "infected-healed.json",
  "infected-escalated": "infected-escalated.json",
  "protected-zone-blocked": "protected-zone-blocked.json"
};

export interface RunScenarioOptions {
  /** When set, runs real npm test / lint / tsc in this directory and feeds results into the pipeline. */
  liveWorkspacePath?: string;
}

export interface RunScenarioDefinitionOptions extends PipelineOptions {
  liveWorkspacePath?: string;
}

export async function runScenario(
  name: ScenarioName,
  options: RunScenarioOptions = {}
): Promise<ScenarioRunResult> {
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
  const livePath = options.liveWorkspacePath ?? process.env.MAINLINE_LIVE_WORKSPACE;

  if (livePath) {
    const live = await runChecksInWorkspace(livePath);
    const merged: ScenarioDefinition = {
      ...parsed,
      initialChecks: live.checks
    };
    const pipelineOptions: PipelineOptions = {
      verificationFailures: live.failures
    };
    return runPipeline(merged, pipelineOptions);
  }

  return runPipeline(parsed);
}

export async function runScenarioDefinition(
  scenario: ScenarioDefinition,
  options: RunScenarioDefinitionOptions = {}
): Promise<ScenarioRunResult> {
  const livePath = options.liveWorkspacePath ?? process.env.MAINLINE_LIVE_WORKSPACE;

  if (livePath) {
    const live = await runChecksInWorkspace(livePath);
    const merged: ScenarioDefinition = {
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
