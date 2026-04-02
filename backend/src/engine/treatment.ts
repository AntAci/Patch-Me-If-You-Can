import type { Diagnosis, Treatment } from "../schemas/events.js";

export function generateTreatment(diagnosis: Diagnosis): Treatment {
  switch (diagnosis.code) {
    case "protected_zone_violation":
      return {
        strategy: "none",
        prompt:
          "Remove all edits that touch protected files or directories and resubmit the patch without auth, security, or secrets changes."
      };
    case "quality_regression":
      return {
        strategy: "retry_patch",
        prompt:
          "Produce a repaired patch that preserves the intended feature change while reverting the failing logic paths and restoring all broken tests."
      };
    case "malicious_signature":
      return {
        strategy: "retry_patch",
        prompt:
          "Remove any unsafe, hidden, or privilege-escalating logic, keep only the legitimate feature behavior, and return a minimal safe diff."
      };
    case "clean_patch":
    default:
      return {
        strategy: "none",
        prompt: "No treatment required."
      };
  }
}
