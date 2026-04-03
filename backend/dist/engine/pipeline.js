import { getPolicyInstructions } from "../config/policy.js";
import { PROTECTED_FILES } from "../config/protected-files.js";
import { classifyHealth } from "./classify.js";
import { generateDiagnosis } from "./diagnosis.js";
import { findProtectedZoneMatches } from "./protected-zone.js";
import { generateTreatment } from "./treatment.js";
const BASE_TIMESTAMP = Date.parse("2026-01-01T00:00:00.000Z");
const DEFAULT_MAX_REPAIR_ATTEMPTS = 3;
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
function resolveSecurityAgent(input) {
    return (input ?? {
        name: "Mainline Sentinel",
        mode: "deterministic",
        maxRepairAttempts: DEFAULT_MAX_REPAIR_ATTEMPTS
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
    const { scenario } = input;
    return {
        scenarioId: scenario.scenarioId,
        patchId: scenario.patchId,
        task: scenario.task,
        zone: scenario.zone,
        source: "scenario",
        status: input.health,
        symptoms: input.diagnosis.symptoms,
        health: input.health,
        finalVerdict: input.finalVerdict,
        quarantined: input.quarantined,
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        checks: input.checks,
        verificationFailures: input.verificationFailures,
        protectedZone: {
            violated: input.protectedMatches.length > 0,
            matchedFiles: input.protectedMatches
        },
        retry: {
            attempted: input.retryAttempted,
            succeeded: input.retrySucceeded
        },
        repairAttempts: input.repairAttempts,
        policyInstructions: getPolicyInstructions(input.policyInstructionsRaw),
        securityAgent: input.securityAgent,
        timeline: input.timeline,
        diffSummary: scenario.patch.diffSummary
    };
}
export function runPipeline(scenario, options = {}) {
    const protectedFiles = scenario.protectedFiles ?? [...PROTECTED_FILES];
    const { timeline, push } = createTimelineRecorder();
    const verificationFailures = options.verificationFailures;
    const securityAgent = resolveSecurityAgent(options.securityAgent);
    const repairAttempts = [];
    push("scenario_received", 0, {
        scenarioId: scenario.scenarioId,
        patchId: scenario.patchId
    });
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
        const diagnosis = generateDiagnosis({
            scenario,
            protectedMatches,
            verificationFailures
        });
        const treatment = generateTreatment(diagnosis);
        const checks = cloneChecks(scenario.initialChecks);
        push("health_classified", 0, { health: "infected" });
        push("patch_quarantined", 0, { quarantined: true });
        push("diagnosis_generated", 0, { code: diagnosis.code });
        push("treatment_generated", 0, { strategy: treatment.strategy });
        push("final_verdict_issued", 0, { finalVerdict: "blocked" });
        return buildResult({
            scenario,
            health: "infected",
            finalVerdict: "blocked",
            quarantined: true,
            diagnosis,
            treatment,
            checks,
            protectedMatches,
            retryAttempted: false,
            retrySucceeded: false,
            repairAttempts,
            timeline,
            verificationFailures,
            policyInstructionsRaw: options.policyInstructionsRaw,
            securityAgent
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
    const diagnosis = generateDiagnosis({
        scenario,
        protectedMatches,
        verificationFailures
    });
    const treatment = generateTreatment(diagnosis);
    if (initialHealth === "healthy") {
        push("diagnosis_generated", 0, { code: diagnosis.code });
        push("treatment_generated", 0, { strategy: treatment.strategy });
        push("final_verdict_issued", 0, { finalVerdict: "released" });
        return buildResult({
            scenario,
            health: "healthy",
            finalVerdict: "released",
            quarantined: false,
            diagnosis,
            treatment,
            checks: initialChecks,
            protectedMatches,
            retryAttempted: false,
            retrySucceeded: false,
            repairAttempts,
            timeline,
            verificationFailures,
            policyInstructionsRaw: options.policyInstructionsRaw,
            securityAgent
        });
    }
    push("patch_quarantined", 0, { quarantined: true });
    push("diagnosis_generated", 0, { code: diagnosis.code });
    push("treatment_generated", 0, { strategy: treatment.strategy });
    const scriptedAttempts = scenario.repairAttempts ?? [];
    const maxAttempts = Math.min(securityAgent.maxRepairAttempts, scriptedAttempts.length);
    if (treatment.strategy === "retry_patch" && scriptedAttempts.length > 0) {
        push("repair_loop_started", 0, {
            maxAttempts,
            agent: securityAgent.name
        });
        let finalChecks = initialChecks;
        let finalHealth = initialHealth;
        let finalVerdict = "quarantined";
        for (let idx = 0; idx < maxAttempts; idx += 1) {
            const attemptNumber = idx + 1;
            const scripted = scriptedAttempts[idx];
            if (!scripted) {
                break;
            }
            push("repair_attempt_started", attemptNumber, {
                attempt: attemptNumber,
                agent: securityAgent.name
            });
            push("repair_patch_generated", attemptNumber, {
                suggested: scripted.suggestedPatch ? true : false
            });
            push("repair_patch_applied", attemptNumber, { applied: true });
            push("recheck_started", attemptNumber);
            const attemptChecks = cloneChecks(scripted.checks);
            pushCheckEvents(attemptChecks, attemptNumber, push);
            const attemptHealth = classifyHealth({
                checks: attemptChecks,
                diagnosisHints: [],
                protectedZoneViolated: false
            });
            finalChecks = attemptChecks;
            finalHealth = attemptHealth;
            finalVerdict = attemptHealth === "healthy" ? "released" : "quarantined";
            repairAttempts.push({
                attempt: attemptNumber,
                status: attemptHealth === "healthy" ? "completed" : "failed",
                verdict: attemptHealth === "healthy" ? "released" : "retrying",
                summary: scripted.summary,
                treatmentPrompt: scripted.agentNotes ?? treatment.prompt,
                suggestedPatch: scripted.suggestedPatch,
                checks: attemptChecks,
                at: new Date(BASE_TIMESTAMP + timeline.length * 1000).toISOString()
            });
            push("health_classified", attemptNumber, { health: attemptHealth });
            if (attemptHealth === "healthy") {
                push("repair_attempt_succeeded", attemptNumber, {
                    attempt: attemptNumber
                });
                push("final_verdict_issued", attemptNumber, {
                    finalVerdict: "released"
                });
                return buildResult({
                    scenario,
                    health: finalHealth,
                    finalVerdict,
                    quarantined: false,
                    diagnosis,
                    treatment,
                    checks: finalChecks,
                    protectedMatches,
                    retryAttempted: true,
                    retrySucceeded: true,
                    repairAttempts,
                    timeline,
                    verificationFailures,
                    policyInstructionsRaw: options.policyInstructionsRaw,
                    securityAgent
                });
            }
            push("repair_attempt_failed", attemptNumber, {
                attempt: attemptNumber
            });
        }
        push("final_verdict_issued", repairAttempts.length, {
            finalVerdict: finalVerdict
        });
        return buildResult({
            scenario,
            health: finalHealth,
            finalVerdict,
            quarantined: true,
            diagnosis,
            treatment,
            checks: finalChecks,
            protectedMatches,
            retryAttempted: repairAttempts.length > 0,
            retrySucceeded: false,
            repairAttempts,
            timeline,
            verificationFailures,
            policyInstructionsRaw: options.policyInstructionsRaw,
            securityAgent
        });
    }
    push("final_verdict_issued", 0, { finalVerdict: "quarantined" });
    return buildResult({
        scenario,
        health: initialHealth,
        finalVerdict: "quarantined",
        quarantined: true,
        diagnosis,
        treatment,
        checks: initialChecks,
        protectedMatches,
        retryAttempted: false,
        retrySucceeded: false,
        repairAttempts,
        timeline,
        verificationFailures,
        policyInstructionsRaw: options.policyInstructionsRaw,
        securityAgent
    });
}
