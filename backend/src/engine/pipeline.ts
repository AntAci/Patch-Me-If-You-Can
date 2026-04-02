import { classifyHealth } from "./classify.js";
import { generateDiagnosis } from "./diagnosis.js";
import { findProtectedZoneMatches } from "./protected-zone.js";
import { generateTreatment } from "./treatment.js";
import type {
  CheckResult,
  Diagnosis,
  Health,
  ScenarioRunResult,
  TimelineEvent,
  TimelineEventName,
  Treatment,
  Verdict,
  VerificationFailure
} from "../schemas/events.js";
import type { ScenarioDefinition } from "../schemas/scenario.js";
import { PROTECTED_FILES } from "../config/protected-files.js";

const BASE_TIMESTAMP = Date.parse("2026-01-01T00:00:00.000Z");

export interface PipelineOptions {
  verificationFailures?: VerificationFailure[];
}

function createTimelineRecorder() {
  const timeline: TimelineEvent[] = [];
  let tick = 0;

  return {
    timeline,
    push(
      name: TimelineEventName,
      attempt: 0 | 1,
      data?: Record<string, string | number | boolean | null>
    ) {
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

function cloneChecks(checks: {
  tests: CheckResult;
  lint: CheckResult;
  typecheck: CheckResult;
}) {
  return {
    tests: { ...checks.tests },
    lint: { ...checks.lint },
    typecheck: { ...checks.typecheck }
  };
}

export function runPipeline(
  scenario: ScenarioDefinition,
  options: PipelineOptions = {}
): ScenarioRunResult {
  const protectedFiles = scenario.protectedFiles ?? [...PROTECTED_FILES];
  const { timeline, push } = createTimelineRecorder();
  const verificationFailures = options.verificationFailures;

  push("scenario_received", 0, { scenarioId: scenario.scenarioId, patchId: scenario.patchId });
  push("patch_loaded", 0, {
    filesChanged: scenario.patch.filesChanged.join(","),
    diffSummary: scenario.patch.diffSummary
  });
  push("patch_apply_simulated", 0, { applied: true });

  const protectedMatches = findProtectedZoneMatches(
    scenario.patch.filesChanged,
    protectedFiles
  );

  if (protectedMatches.length > 0) {
    push("protected_zone_check_blocked", 0, {
      matchedFiles: protectedMatches.join(",")
    });

    const diagnosis = generateDiagnosis({ scenario, protectedMatches, verificationFailures });
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
      timeline,
      verificationFailures
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
    const diagnosis = generateDiagnosis({ scenario, protectedMatches, verificationFailures });
    const treatment = generateTreatment(diagnosis);
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
      timeline,
      verificationFailures
    });
  }

  const diagnosis = generateDiagnosis({ scenario, protectedMatches, verificationFailures });
  const treatment = generateTreatment(diagnosis);
  push("patch_quarantined", 0, { quarantined: true });
  push("diagnosis_generated", 0, { code: diagnosis.code });
  push("treatment_generated", 0, { strategy: treatment.strategy });

  const retryChecksDef = scenario.retryChecks;
  const shouldRetry =
    (initialHealth === "infected" || initialHealth === "suspicious") &&
    treatment.strategy === "retry_patch" &&
    Boolean(retryChecksDef);

  if (shouldRetry && retryChecksDef) {
    push("retry_started", 1, { strategy: treatment.strategy });
    push("retry_patch_applied", 1, { applied: true });
    push("recheck_started", 1);

    const retryChecks = cloneChecks(retryChecksDef);
    pushCheckEvents(retryChecks, 1, push);

    const retryHealth = classifyHealth({
      checks: retryChecks,
      diagnosisHints: [],
      protectedZoneViolated: false
    });
    push("health_classified", 1, { health: retryHealth });

    const finalVerdict: Verdict = retryHealth === "healthy" ? "released" : "quarantined";
    push("final_verdict_issued", 1, { finalVerdict });

    return buildResult({
      scenario,
      health: retryHealth,
      finalVerdict,
      quarantined: finalVerdict !== "released",
      diagnosis,
      treatment,
      checks: retryChecks,
      protectedMatches,
      retryAttempted: true,
      retrySucceeded: retryHealth === "healthy",
      timeline,
      verificationFailures
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
    timeline,
    verificationFailures
  });
}

function pushCheckEvents(
  checks: { tests: CheckResult; lint: CheckResult; typecheck: CheckResult },
  attempt: 0 | 1,
  push: (
    name: TimelineEventName,
    attempt: 0 | 1,
    data?: Record<string, string | number | boolean | null>
  ) => void
) {
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

function buildResult(input: {
  scenario: ScenarioDefinition;
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
  protectedMatches: string[];
  retryAttempted: boolean;
  retrySucceeded: boolean;
  timeline: TimelineEvent[];
  verificationFailures?: VerificationFailure[];
}): ScenarioRunResult {
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
    timeline: input.timeline,
    diffSummary: scenario.patch.diffSummary
  };
}
