import { loadMainlineEnv } from "../config/env.js";
import type { ScenarioRunResult } from "../schemas/events.js";

export interface LlmEnrichmentInput {
  mutationId: string;
  filesChanged: string[];
  result: ScenarioRunResult;
}

interface LlmStructuredResponse {
  diagnosis_summary?: string;
  symptoms?: string[];
  treatment_prompt?: string;
  suggested_patch?: string;
}

export interface ModelClient {
  enrich(input: LlmEnrichmentInput): Promise<LlmStructuredResponse>;
}

class OpenAiModelClient implements ModelClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string
  ) {}

  async enrich(input: LlmEnrichmentInput): Promise<LlmStructuredResponse> {
    const prompt = [
      "You are the repair planner for Mainline Immunity.",
      "Return JSON only.",
      "Schema:",
      '{"diagnosis_summary":"string","symptoms":["string"],"treatment_prompt":"string","suggested_patch":"string"}',
      `Mutation ID: ${input.mutationId}`,
      `Files changed: ${input.filesChanged.join(", ") || "unknown"}`,
      `Zone: ${input.result.zone}`,
      `Health: ${input.result.health}`,
      `Verdict: ${input.result.finalVerdict}`,
      `Diagnosis: ${input.result.diagnosis.summary}`,
      `Symptoms: ${input.result.symptoms.join(" | ")}`,
      `Protected files matched: ${input.result.protectedZone.matchedFiles.join(", ") || "none"}`,
      `Verification summaries: tests=${input.result.checks.tests.summary}; lint=${input.result.checks.lint.summary}; typecheck=${input.result.checks.typecheck.summary}`,
      "If a repair is unsafe or blocked, set suggested_patch to an empty string and explain why in treatment_prompt."
    ].join("\n");

    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "http://localhost",
        "X-Title": "Mainline Immunity"
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
    };
    const text = payload.output_text?.trim();
    if (!text) {
      throw new Error("OpenAI response did not include output_text");
    }

    return JSON.parse(text) as LlmStructuredResponse;
  }
}

export function getModelClient(): ModelClient | null {
  const env = loadMainlineEnv();
  if (env.llmProvider !== "openai" || !env.openAiApiKey) {
    return null;
  }
  return new OpenAiModelClient(
    env.openAiApiKey,
    env.openAiModel,
    env.openAiBaseUrl
  );
}
