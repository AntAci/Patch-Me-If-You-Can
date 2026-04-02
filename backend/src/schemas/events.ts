export type Health = "healthy" | "suspicious" | "infected";
export type Verdict = "released" | "quarantined" | "blocked";
export type CheckStatus = "passed" | "failed" | "skipped";

export type TimelineEventName =
  | "scenario_received"
  | "patch_loaded"
  | "patch_apply_simulated"
  | "protected_zone_check_passed"
  | "protected_zone_check_blocked"
  | "checks_started"
  | "test_check_completed"
  | "lint_check_completed"
  | "typecheck_completed"
  | "health_classified"
  | "patch_quarantined"
  | "diagnosis_generated"
  | "treatment_generated"
  | "retry_started"
  | "retry_patch_applied"
  | "recheck_started"
  | "final_verdict_issued";

export interface TimelineEvent {
  name: TimelineEventName;
  at: string;
  attempt: 0 | 1;
  data?: Record<string, string | number | boolean | null>;
}

export interface CheckResult {
  status: CheckStatus;
  summary: string;
}

export interface Diagnosis {
  code:
    | "clean_patch"
    | "quality_regression"
    | "protected_zone_violation"
    | "malicious_signature";
  summary: string;
  evidence: string[];
}

export interface Treatment {
  prompt: string;
  strategy: "none" | "retry_patch";
}

export interface ScenarioRunResult {
  scenarioId: string;
  health: Health;
  finalVerdict: Verdict;
  quarantined: boolean;
  diagnosis: Diagnosis;
  treatment: Treatment;
  checks: {
    tests: CheckResult;
    lint: CheckResult;
    typecheck: CheckResult;
  };
  protectedZone: {
    violated: boolean;
    matchedFiles: string[];
  };
  retry: {
    attempted: boolean;
    succeeded: boolean;
  };
  timeline: TimelineEvent[];
}
