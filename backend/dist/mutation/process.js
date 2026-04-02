import { PROTECTED_FILES } from "../config/protected-files.js";
import { loadMainlineEnv } from "../config/env.js";
import { runScenarioDefinition } from "../runner.js";
import { getModelClient } from "../llm/client.js";
function passedCheck(summary) {
    return { status: "passed", summary };
}
function appendTimelineEvent(timeline, event) {
    return [...timeline, event];
}
function buildScenarioFromMutation(mutation) {
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
function withMetadata(result, mutation, llm) {
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
export async function processMutation(mutation) {
    const env = loadMainlineEnv();
    const scenario = buildScenarioFromMutation(mutation);
    let result = await runScenarioDefinition(scenario, env.liveWorkspace ? { liveWorkspacePath: env.liveWorkspace } : {});
    let llm = {
        provider: env.llmProvider,
        model: env.openAiModel,
        used: false,
        repairAttempted: false
    };
    const client = getModelClient();
    const eligibleForLlm = env.enableAutoRepair &&
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
                symptoms: enriched.symptoms && enriched.symptoms.length > 0
                    ? enriched.symptoms
                    : result.diagnosis.symptoms
            },
            symptoms: enriched.symptoms && enriched.symptoms.length > 0
                ? enriched.symptoms
                : result.symptoms,
            treatment: {
                ...result.treatment,
                prompt: enriched.treatment_prompt || result.treatment.prompt,
                suggestedPatch: enriched.suggested_patch || undefined
            },
            timeline
        };
    }
    catch (error) {
        llm = {
            provider: env.llmProvider,
            model: env.openAiModel,
            used: false,
            repairAttempted: false,
            lastError: String(error)
        };
    }
    return withMetadata(result, mutation, llm);
}
