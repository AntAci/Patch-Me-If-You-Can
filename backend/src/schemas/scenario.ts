import type { CheckResult } from "./events.js";

export interface ScenarioDefinition {
  scenarioId: string;
  patchId: string;
  /** Human-facing task description (e.g. for LLM / agent). */
  task: string;
  /** Repo zone label for UI (Auth, UI, API, Config, Tests). */
  zone: string;
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
  repairAttempts?: Array<{
    summary: string;
    suggestedPatch?: string;
    agentNotes?: string;
    checks: {
      tests: CheckResult;
      lint: CheckResult;
      typecheck: CheckResult;
    };
  }>;
  diagnosisHints: string[];
}

export type ScenarioName =
  | "healthy"
  | "infected-healed"
  | "infected-escalated"
  | "protected-zone-blocked";
