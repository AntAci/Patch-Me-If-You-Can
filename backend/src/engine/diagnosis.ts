import type { Diagnosis } from "../schemas/events.js";
import type { ScenarioDefinition } from "../schemas/scenario.js";

interface DiagnosisInput {
  scenario: ScenarioDefinition;
  protectedMatches: string[];
}

export function generateDiagnosis(input: DiagnosisInput): Diagnosis {
  const hints = input.scenario.diagnosisHints.map((hint) => hint.toLowerCase());

  if (input.protectedMatches.length > 0) {
    return {
      code: "protected_zone_violation",
      summary: "Patch attempted to modify files in a protected zone.",
      evidence: input.protectedMatches
    };
  }

  const maliciousEvidence = hints.filter((hint) =>
    ["malicious", "exfiltration", "auth bypass"].some((token) =>
      hint.includes(token)
    )
  );

  if (maliciousEvidence.length > 0) {
    return {
      code: "malicious_signature",
      summary: "Patch contains signals consistent with a malicious or unsafe mutation.",
      evidence: maliciousEvidence
    };
  }

  if (input.scenario.initialChecks.tests.status === "failed") {
    return {
      code: "quality_regression",
      summary: "Patch introduced a regression that broke the test suite.",
      evidence: [
        input.scenario.initialChecks.tests.summary,
        input.scenario.patch.diffSummary
      ]
    };
  }

  return {
    code: "clean_patch",
    summary: "Patch passed the deterministic verification pipeline.",
    evidence: [input.scenario.patch.diffSummary]
  };
}
