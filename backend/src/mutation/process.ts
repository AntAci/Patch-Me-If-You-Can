import { PROTECTED_FILES } from "../config/protected-files.js";
import { loadMainlineEnv } from "../config/env.js";
import { runScenarioDefinition } from "../runner.js";
import type {
  CheckResult,
  LlmUsage,
  ScenarioRunResult,
  TimelineEvent
} from "../schemas/events.js";
import type { ScenarioDefinition } from "../schemas/scenario.js";
import type { MutationRecord } from "./store.js";
import { getModelClient } from "../llm/client.js";

function passedCheck(summary: string): CheckResult {
  return { status: "passed", summary };
}

function appendTimelineEvent(
  timeline: TimelineEvent[],
  event: TimelineEvent
): TimelineEvent[] {
  return [...timeline, event];
}

function buildScenarioFromMutation(mutation: MutationRecord): ScenarioDefinition {
  return {
    scenarioId: mutation.mutationId,
    patchId: mutation.mutationId.toUpperCase(),
    task: mutation.task,
    zone: mutation.zone,
    patch: {
      filesChanged: mutation.filesChanged,
      diffSummary: mutation.diffSummary
    },
    protectedFiles: [...PROTECTED_FILES],
    initialChecks: {
      tests: passedCheck("Live verification not configured; defaulted to pass."),
      lint: passedCheck("Live verification not configured; defaulted to pass."),
      typecheck: passedCheck("Live verification not configured; defaulted to pass.")
    },
    diagnosisHints: ["cursor_hook"]
  };
}

function withMetadata(
  result: ScenarioRunResult,
  mutation: MutationRecord,
  llm: LlmUsage
): ScenarioRunResult {
  return {
    ...result,
    source: "cursor_hook",
    mutationId: mutation.mutationId,
    filesChanged: mutation.filesChanged,
    hookEvents: mutation.hookEvents.map((event) => event.event),
    diffSummary: mutation.diffSummary,
    llm
  };
}

export async function processMutation(
  mutation: MutationRecord
): Promise<ScenarioRunResult> {
  const env = loadMainlineEnv();
  const scenario = buildScenarioFromMutation(mutation);
  const client = getModelClient();
  const securityAgent = {
    name: env.securityAgentName,
    mode: client ? "llm" as const : "deterministic" as const,
    maxRepairAttempts: env.maxRepairAttempts
  };
  let result = await runScenarioDefinition(
    scenario,
    {
      ...(env.liveWorkspace ? { liveWorkspacePath: env.liveWorkspace } : {}),
      policyInstructionsRaw: env.policyInstructionsRaw,
      securityAgent
    }
  );

  let llm: LlmUsage = {
    provider: env.llmProvider,
    model: env.openAiModel,
    used: false,
    repairAttempted: false
  };
  const eligibleForLlm =
    env.enableAutoRepair &&
    client &&
    result.finalVerdict !== "blocked" &&
    result.health !== "healthy";

  if (!eligibleForLlm) {
    return withMetadata(result, mutation, llm);
  }

  try {
    const enriched = await client.enrich({
      mutationId: mutation.mutationId,
      filesChanged: mutation.filesChanged,
      result
    });

    llm = {
      provider: env.llmProvider,
      model: env.openAiModel,
      used: true,
      repairAttempted: Boolean(enriched.suggested_patch?.trim())
    };

    const timeline = appendTimelineEvent(result.timeline, {
      name: "treatment_generated",
      at: new Date().toISOString(),
      attempt: 1,
      data: {
        llm: true,
        repairSuggested: Boolean(enriched.suggested_patch?.trim())
      }
    });

    result = {
      ...result,
      diagnosis: {
        ...result.diagnosis,
        summary: enriched.diagnosis_summary || result.diagnosis.summary,
        symptoms:
          enriched.symptoms && enriched.symptoms.length > 0
            ? enriched.symptoms
            : result.diagnosis.symptoms
      },
      symptoms:
        enriched.symptoms && enriched.symptoms.length > 0
          ? enriched.symptoms
          : result.symptoms,
      treatment: {
        ...result.treatment,
        prompt: enriched.treatment_prompt || result.treatment.prompt,
        suggestedPatch: enriched.suggested_patch || undefined
      },
      securityAgent,
      timeline
    };
  } catch (error) {
    llm = {
      provider: env.llmProvider,
      model: env.openAiModel,
      used: false,
      repairAttempted: false,
      lastError: String(error)
    };
  }

  return withMetadata(
    {
      ...result,
      securityAgent
    },
    mutation,
    llm
  );
}
