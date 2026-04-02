import { classifyHealth } from "./classify.js";
import { generateDiagnosis } from "./diagnosis.js";
import { findProtectedZoneMatches } from "./protected-zone.js";
import { generateTreatment } from "./treatment.js";
import { PROTECTED_FILES } from "../config/protected-files.js";
const BASE_TIMESTAMP = Date.parse("2026-01-01T00:00:00.000Z");
function createTimelineRecorder() {
    const timeline = [];
    let tick = 0;
    return {
        timeline,
        push(name, attempt, data) {
            timeline.push({
                name,
                attempt,
                at: new Date(BASE_TIMESTAMP + tick * 1000).toISOString(),
                ...(data ? { data } : {})
            });
            tick += 1;
        }
    };
}
function cloneChecks(checks) {
    return {
        tests: { ...checks.tests },
        lint: { ...checks.lint },
        typecheck: { ...checks.typecheck }
    };
}
export function runPipeline(scenario) {
    const protectedFiles = scenario.protectedFiles ?? [...PROTECTED_FILES];
    const { timeline, push } = createTimelineRecorder();
    push("scenario_received", 0, { scenarioId: scenario.scenarioId, patchId: scenario.patchId });
    push("patch_loaded", 0, {
        filesChanged: scenario.patch.filesChanged.join(","),
        diffSummary: scenario.patch.diffSummary
    });
    push("patch_apply_simulated", 0, { applied: true });
    const protectedMatches = findProtectedZoneMatches(scenario.patch.filesChanged, protectedFiles);
    if (protectedMatches.length > 0) {
        push("protected_zone_check_blocked", 0, {
            matchedFiles: protectedMatches.join(",")
        });
        const diagnosis = generateDiagnosis({ scenario, protectedMatches });
        const treatment = generateTreatment(diagnosis);
        const checks = cloneChecks(scenario.initialChecks);
        push("health_classified", 0, { health: "infected" });
        push("patch_quarantined", 0, { quarantined: true });
        push("diagnosis_generated", 0, { code: diagnosis.code });
        push("treatment_generated", 0, { strategy: treatment.strategy });
        push("final_verdict_issued", 0, { finalVerdict: "blocked" });
        return buildResult({
            scenarioId: scenario.scenarioId,
            health: "infected",
            finalVerdict: "blocked",
            quarantined: true,
            diagnosis,
            treatment,
            checks,
            protectedMatches,
            retryAttempted: false,
            retrySucceeded: false,
            timeline
        });
    }
    push("protected_zone_check_passed", 0, { violated: false });
    push("checks_started", 0);
    const initialChecks = cloneChecks(scenario.initialChecks);
    pushCheckEvents(initialChecks, 0, push);
    const initialHealth = classifyHealth({
        checks: initialChecks,
        diagnosisHints: scenario.diagnosisHints,
        protectedZoneViolated: false
    });
    push("health_classified", 0, { health: initialHealth });
    if (initialHealth === "healthy") {
        const diagnosis = generateDiagnosis({ scenario, protectedMatches });
        const treatment = generateTreatment(diagnosis);
        push("diagnosis_generated", 0, { code: diagnosis.code });
        push("treatment_generated", 0, { strategy: treatment.strategy });
        push("final_verdict_issued", 0, { finalVerdict: "released" });
        return buildResult({
            scenarioId: scenario.scenarioId,
            health: "healthy",
            finalVerdict: "released",
            quarantined: false,
            diagnosis,
            treatment,
            checks: initialChecks,
            protectedMatches,
            retryAttempted: false,
            retrySucceeded: false,
            timeline
        });
    }
    const diagnosis = generateDiagnosis({ scenario, protectedMatches });
    const treatment = generateTreatment(diagnosis);
    push("patch_quarantined", 0, { quarantined: true });
    push("diagnosis_generated", 0, { code: diagnosis.code });
    push("treatment_generated", 0, { strategy: treatment.strategy });
    if (initialHealth === "infected" && treatment.strategy === "retry_patch" && scenario.retryChecks) {
        push("retry_started", 1, { strategy: treatment.strategy });
        push("retry_patch_applied", 1, { applied: true });
        push("recheck_started", 1);
        const retryChecks = cloneChecks(scenario.retryChecks);
        pushCheckEvents(retryChecks, 1, push);
        const retryHealth = classifyHealth({
            checks: retryChecks,
            diagnosisHints: [],
            protectedZoneViolated: false
        });
        push("health_classified", 1, { health: retryHealth });
        const finalVerdict = retryHealth === "healthy" ? "released" : "quarantined";
        push("final_verdict_issued", 1, { finalVerdict });
        return buildResult({
            scenarioId: scenario.scenarioId,
            health: retryHealth,
            finalVerdict,
            quarantined: finalVerdict !== "released",
            diagnosis,
            treatment,
            checks: retryChecks,
            protectedMatches,
            retryAttempted: true,
            retrySucceeded: retryHealth === "healthy",
            timeline
        });
    }
    push("final_verdict_issued", 0, { finalVerdict: "quarantined" });
    return buildResult({
        scenarioId: scenario.scenarioId,
        health: initialHealth,
        finalVerdict: "quarantined",
        quarantined: true,
        diagnosis,
        treatment,
        checks: initialChecks,
        protectedMatches,
        retryAttempted: false,
        retrySucceeded: false,
        timeline
    });
}
function pushCheckEvents(checks, attempt, push) {
    push("test_check_completed", attempt, {
        status: checks.tests.status,
        summary: checks.tests.summary
    });
    push("lint_check_completed", attempt, {
        status: checks.lint.status,
        summary: checks.lint.summary
    });
    push("typecheck_completed", attempt, {
        status: checks.typecheck.status,
        summary: checks.typecheck.summary
    });
}
function buildResult(input) {
    return {
        scenarioId: input.scenarioId,
        health: input.health,
        finalVerdict: input.finalVerdict,
        quarantined: input.quarantined,
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        checks: input.checks,
        protectedZone: {
            violated: input.protectedMatches.length > 0,
            matchedFiles: input.protectedMatches
        },
        retry: {
            attempted: input.retryAttempted,
            succeeded: input.retrySucceeded
        },
        timeline: input.timeline
    };
}
