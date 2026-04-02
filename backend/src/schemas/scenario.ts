import type { CheckResult } from "./events.js";

export interface ScenarioDefinition {
  scenarioId: string;
  patchId: string;
  task: string;
  zone: "Auth" | "UI" | "API" | "Config" | "Tests";
  patch: {
    filesChanged: string[];
    diffSummary: string;
  };
  protectedFiles?: string[];
  initialChecks: {
    tests: CheckResult;
    lint: CheckResult;
    typecheck: CheckResult;
  };
  retryChecks?: {
    tests: CheckResult;
    lint: CheckResult;
    typecheck: CheckResult;
  };
  diagnosisHints: string[];
}

export type ScenarioName =
  | "healthy"
  | "infected-healed"
  | "protected-zone-blocked";
