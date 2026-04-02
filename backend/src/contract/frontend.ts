import type { MainlineImmunityContract, ScenarioRunResult } from "../schemas/events.js";

/** Maps internal timeline names to demo-friendly labels (biosecurity / control room). */
const TIMELINE_LABELS: Record<string, string> = {
  scenario_received: "mutation_detected",
  patch_loaded: "patch_loaded",
  patch_apply_simulated: "patch_applied",
  protected_zone_check_passed: "zone_check_passed",
  protected_zone_check_blocked: "zone_blocked",
  checks_started: "verification_started",
  test_check_completed: "tests_finished",
  lint_check_completed: "lint_finished",
  typecheck_completed: "typecheck_finished",
  health_classified: "health_classified",
  patch_quarantined: "quarantined",
  diagnosis_generated: "diagnosis_complete",
  treatment_generated: "treatment_issued",
  retry_started: "healing_pass",
  retry_patch_applied: "retry_patch_applied",
  recheck_started: "recheck_started",
  final_verdict_issued: "verdict_issued"
};

/**
 * Single JSON object for the frontend contract (Person 1 ↔ Person 2).
 */
export function toFrontendContract(result: ScenarioRunResult): MainlineImmunityContract {
  const timeline = result.timeline.map((e) => TIMELINE_LABELS[e.name] ?? e.name);
  return {
    patchId: result.patchId,
    task: result.task,
    zone: result.zone,
    status: result.health,
    symptoms: result.symptoms,
    diagnosis: result.diagnosis.summary,
    treatment: result.treatment.prompt,
    timeline,
    finalVerdict: result.finalVerdict
  };
}
