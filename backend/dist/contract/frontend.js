/** Maps internal timeline names to demo-friendly labels (biosecurity / control room). */
const TIMELINE_LABELS = {
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
    repair_loop_started: "repair_loop_started",
    repair_attempt_started: "repair_attempt_started",
    repair_patch_generated: "repair_patch_generated",
    repair_patch_applied: "repair_patch_applied",
    recheck_started: "recheck_started",
    repair_attempt_failed: "repair_attempt_failed",
    repair_attempt_succeeded: "repair_attempt_succeeded",
    final_verdict_issued: "verdict_issued"
};
/**
 * Single JSON object for the frontend contract (Person 1 ↔ Person 2).
 */
export function toFrontendContract(result) {
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
        finalVerdict: result.finalVerdict,
        repairAttempts: result.repairAttempts,
        policyInstructions: result.policyInstructions,
        securityAgent: result.securityAgent
    };
}
