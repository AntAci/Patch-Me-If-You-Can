import { fileURLToPath } from "node:url";
import { runScenario } from "../runner.js";
import type { ScenarioName } from "../schemas/scenario.js";
import { toFrontendContract } from "../contract/frontend.js";

export async function runScenarioCli(argv: string[]): Promise<void> {
  let livePath: string | undefined;
  let contractOnly = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--live") {
      livePath = argv[++i];
    } else if (a === "--contract") {
      contractOnly = true;
    } else if (a?.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else if (a) {
      positional.push(a);
    }
  }

  const scenarioName = positional[0] as ScenarioName | undefined;

  if (!scenarioName) {
    console.error(
      "Usage: node dist/cli/run-scenario.js <healthy|infected-healed|protected-zone-blocked> [--contract] [--live <path>]"
    );
    process.exit(1);
  }

  const knownScenarios = new Set<ScenarioName>([
    "healthy",
    "infected-healed",
    "protected-zone-blocked"
  ]);

  if (!knownScenarios.has(scenarioName)) {
    console.error(`Unknown scenario: ${scenarioName}`);
    process.exit(1);
  }

  const result = await runScenario(scenarioName, livePath ? { liveWorkspacePath: livePath } : {});
  const output = contractOnly ? toFrontendContract(result) : result;
  console.log(JSON.stringify(output, null, 2));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  await runScenarioCli(process.argv.slice(2));
}
