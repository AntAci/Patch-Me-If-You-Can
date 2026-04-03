export type Health = "healthy" | "suspicious" | "infected";
export type Verdict = "released" | "quarantined" | "blocked";
export type CheckStatus = "passed" | "failed" | "skipped";

export type VerificationCategory = "test" | "lint" | "typecheck";

export interface VerificationFailure {
  category: VerificationCategory;
  message: string;
  file?: string;
  raw?: string;
}

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
  | "repair_loop_started"
  | "repair_attempt_started"
  | "repair_patch_generated"
  | "repair_patch_applied"
  | "recheck_started"
  | "repair_attempt_failed"
  | "repair_attempt_succeeded"
  | "final_verdict_issued";

export interface TimelineEvent {
  name: TimelineEventName;
  at: string;
  attempt: number;
  data?: Record<string, string | number | boolean | null>;
}

export interface CheckResult {
  status: CheckStatus;
  summary: string;
  /** Present when checks run against a real workspace (live mode). */
  rawOutput?: string;
}

export interface Diagnosis {
  code:
    | "clean_patch"
    | "quality_regression"
    | "protected_zone_violation"
    | "malicious_signature"
    | "lint_regression"
    | "type_regression"
    | "mixed_regression";
  summary: string;
  evidence: string[];
  /** Human-readable symptoms for UI / contract. */
  symptoms: string[];
  failingFile?: string | null;
  failureType?: string | null;
  likelyCause?: string | null;
}

export interface Treatment {
  prompt: string;
  strategy: "none" | "retry_patch";
  whatBroke?: string;
  whatNotToTouch?: string;
  whatMustBeFixed?: string;
  whatVerificationFailed?: string;
  suggestedPatch?: string;
}

export interface PolicyInstruction {
  id: string;
  title: string;
  instruction: string;
  severity: "info" | "warn" | "critical";
}

export interface SecurityAgentInfo {
  name: string;
  mode: "deterministic" | "llm";
  maxRepairAttempts: number;
}

export interface RepairAttempt {
  attempt: number;
  status: "completed" | "failed";
  verdict: Verdict | "retrying";
  summary: string;
  treatmentPrompt: string;
  suggestedPatch?: string;
  checks: {
    tests: CheckResult;
    lint: CheckResult;
    typecheck: CheckResult;
  };
  at: string;
}

/** Shared frontend contract (Person 1 ↔ Person 2). */
export interface MainlineImmunityContract {
  patchId: string;
  task: string;
  zone: string;
  status: Health;
  symptoms: string[];
  diagnosis: string;
  treatment: string;
  timeline: string[];
  finalVerdict: Verdict;
  repairAttempts: RepairAttempt[];
  policyInstructions: PolicyInstruction[];
  securityAgent: SecurityAgentInfo;
}

export type ScenarioSource = "scenario" | "cursor_hook";

export interface LlmUsage {
  provider: "openai" | "none";
  model: string;
  used: boolean;
  repairAttempted: boolean;
  lastError?: string;
}

export interface ScenarioRunResult {
  scenarioId: string;
  patchId: string;
  task: string;
  zone: string;
  source?: ScenarioSource;
  mutationId?: string;
  status: Health;
  /** Convenience copy of diagnosis.symptoms */
  symptoms: string[];
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
  /** Normalized failures when running live verification. */
  verificationFailures?: VerificationFailure[];
  protectedZone: {
    violated: boolean;
    matchedFiles: string[];
  };
  retry: {
    attempted: boolean;
    succeeded: boolean;
  };
  repairAttempts: RepairAttempt[];
  policyInstructions: PolicyInstruction[];
  securityAgent: SecurityAgentInfo;
  hookEvents?: string[];
  filesChanged?: string[];
  timeline: TimelineEvent[];
  /** Risk / observability (nice-to-have). */
  diffSummary?: string;
  llm?: LlmUsage;
}
