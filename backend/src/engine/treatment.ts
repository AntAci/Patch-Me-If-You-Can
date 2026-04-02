import type { Diagnosis, Treatment } from "../schemas/events.js";

export function generateTreatment(diagnosis: Diagnosis): Treatment {
  const notToTouch =
    "Do not modify protected auth, security, or secrets paths; keep the diff minimal.";

  switch (diagnosis.code) {
    case "protected_zone_violation":
      return {
        strategy: "none",
        prompt:
          "Remove all edits that touch protected files or directories and resubmit the patch without auth, security, or secrets changes.",
        whatBroke: "Protected-zone policy blocked the change set.",
        whatNotToTouch: "Protected paths listed in symptoms.",
        whatMustBeFixed: "Re-implement the feature without crossing policy boundaries.",
        whatVerificationFailed: "protected_zone_check_blocked"
      };
    case "quality_regression":
      return {
        strategy: "retry_patch",
        prompt:
          "Produce a repaired patch that preserves the intended feature change while reverting the failing logic paths and restoring all broken tests.",
        whatBroke: diagnosis.symptoms[0] ?? diagnosis.summary,
        whatNotToTouch: notToTouch,
        whatMustBeFixed: "Restore passing tests while keeping intended behavior.",
        whatVerificationFailed: "tests"
      };
    case "lint_regression":
      return {
        strategy: "retry_patch",
        prompt:
          "Fix lint violations without disabling rules; keep behavior identical unless the rule requires a safe refactor.",
        whatBroke: diagnosis.symptoms[0] ?? diagnosis.summary,
        whatNotToTouch: notToTouch,
        whatMustBeFixed: "Resolve all reported lint errors in touched files.",
        whatVerificationFailed: "lint"
      };
    case "type_regression":
      return {
        strategy: "retry_patch",
        prompt:
          "Align types with the project API: fix return contracts, nullability, and imports without weakening types.",
        whatBroke: diagnosis.symptoms[0] ?? diagnosis.summary,
        whatNotToTouch: notToTouch,
        whatMustBeFixed: "Make `tsc --noEmit` pass with zero errors.",
        whatVerificationFailed: "typecheck"
      };
    case "mixed_regression":
      return {
        strategy: "retry_patch",
        prompt:
          "Address every failing gate: restore tests, fix lint, and fix types in one coherent patch.",
        whatBroke: diagnosis.summary,
        whatNotToTouch: notToTouch,
        whatMustBeFixed: "Green tests, lint, and typecheck.",
        whatVerificationFailed: "tests, lint, typecheck"
      };
    case "malicious_signature":
      return {
        strategy: "retry_patch",
        prompt:
          "Remove any unsafe, hidden, or privilege-escalating logic, keep only the legitimate feature behavior, and return a minimal safe diff.",
        whatBroke: diagnosis.summary,
        whatNotToTouch: notToTouch,
        whatMustBeFixed: "Eliminate unsafe patterns; pass all checks.",
        whatVerificationFailed: "policy_heuristic"
      };
    case "clean_patch":
    default:
      return {
        strategy: "none",
        prompt: "No treatment required.",
        whatBroke: undefined,
        whatNotToTouch: undefined,
        whatMustBeFixed: undefined,
        whatVerificationFailed: undefined
      };
  }
}
