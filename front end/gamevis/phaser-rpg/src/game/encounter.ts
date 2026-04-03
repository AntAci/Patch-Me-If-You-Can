import type { ScenarioRunResult, TimelineEvent } from '../data/types';

export type MutationClass =
  | 'cleanPatch'
  | 'qualityRegression'
  | 'protectedViolation'
  | 'maliciousSignature';

export interface EncounterSeed {
  scenarioId: string;
  patchId: string;
  zone: ScenarioRunResult['zone'];
  task: string;
  mutationClass: MutationClass;
  verdict: ScenarioRunResult['finalVerdict'];
}

export function diagnosisCodeToMutationClass(code: string): MutationClass {
  switch (code) {
    case 'quality_regression':
      return 'qualityRegression';
    case 'protected_zone_violation':
      return 'protectedViolation';
    case 'malicious_signature':
      return 'maliciousSignature';
    default:
      return 'cleanPatch';
  }
}

export function resultToEncounterSeed(
  result: ScenarioRunResult,
): EncounterSeed {
  return {
    scenarioId: result.scenarioId,
    patchId: result.patchId,
    zone: result.zone,
    task: result.task,
    mutationClass: diagnosisCodeToMutationClass(result.diagnosis.code),
    verdict: result.finalVerdict,
  };
}

export function timelineEventToAction(event: TimelineEvent): string {
  switch (event.name) {
    case 'scenario_received':
      return 'spawn';
    case 'checks_started':
      return 'scan';
    case 'patch_quarantined':
      return 'quarantine';
    case 'retry_started':
      return 'heal';
    case 'final_verdict_issued':
      return 'resolve';
    default:
      return 'pulse';
  }
}
