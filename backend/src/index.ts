export { runScenario, runScenarioDefinition } from "./runner.js";
export { PROTECTED_FILES } from "./config/protected-files.js";
export type {
  CheckResult,
  CheckStatus,
  Diagnosis,
  Health,
  ScenarioRunResult,
  TimelineEvent,
  TimelineEventName,
  Treatment,
  Verdict
} from "./schemas/events.js";
export type { ScenarioDefinition, ScenarioName } from "./schemas/scenario.js";
