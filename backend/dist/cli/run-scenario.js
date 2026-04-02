import { runScenario } from "../runner.js";
const scenarioName = process.argv[2];
if (!scenarioName) {
    console.error('Usage: node dist/cli/run-scenario.js <healthy|infected-healed|protected-zone-blocked>');
    process.exit(1);
}
const knownScenarios = new Set([
    "healthy",
    "infected-healed",
    "protected-zone-blocked"
]);
if (!knownScenarios.has(scenarioName)) {
    console.error(`Unknown scenario: ${scenarioName}`);
    process.exit(1);
}
const result = await runScenario(scenarioName);
console.log(JSON.stringify(result, null, 2));
