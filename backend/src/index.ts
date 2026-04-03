export { runScenario, runScenarioDefinition, type RunScenarioOptions } from "./runner.js";
export { PROTECTED_FILES } from "./config/protected-files.js";
export { runPipeline, type PipelineOptions } from "./engine/pipeline.js";
export { classifyHealth } from "./engine/classify.js";
export { generateDiagnosis } from "./engine/diagnosis.js";
export { generateTreatment } from "./engine/treatment.js";
export { findProtectedZoneMatches } from "./engine/protected-zone.js";
export { runChecksInWorkspace, normalizeFailures } from "./engine/verification.js";
export { generatePatch, applyPatchInTempWorkdir, resolveBackendRoot } from "./patch/ingest.js";
export { toFrontendContract } from "./contract/frontend.js";
export { createMainlineServer, listenMainlineServer, type ServerOptions } from "./http/server.js";
export { loadMainlineEnv, type MainlineEnv } from "./config/env.js";
export {
  attachHookEventToMostRecentMutation,
  createMutationSeed,
  getMutationById,
  getRecentMutations,
  listRecentHookEvents,
  recordHookEvent,
  upsertMutation,
  type MutationRecord,
  type HookEventRecord
} from "./mutation/store.js";
export { normalizeHookMutation } from "./mutation/normalize.js";
export { processMutation } from "./mutation/process.js";
export type {
  CheckResult,
  CheckStatus,
  Diagnosis,
  Health,
  LlmUsage,
  MainlineImmunityContract,
  PolicyInstruction,
  RepairAttempt,
  ScenarioRunResult,
  SecurityAgentInfo,
  ScenarioSource,
  TimelineEvent,
  TimelineEventName,
  Treatment,
  Verdict,
  VerificationFailure
} from "./schemas/events.js";
export type { ScenarioDefinition, ScenarioName } from "./schemas/scenario.js";
