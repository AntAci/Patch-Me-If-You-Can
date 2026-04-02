import { randomUUID } from "node:crypto";
import type { ScenarioRunResult } from "../schemas/events.js";

export interface HookEventRecord {
  at: string;
  event: string;
  payload: unknown;
}

export interface MutationRecord {
  mutationId: string;
  source: "cursor_hook";
  status: "received" | "processing" | "completed" | "failed";
  task: string;
  zone: string;
  filesChanged: string[];
  diffSummary: string;
  createdAt: string;
  updatedAt: string;
  hookEvents: HookEventRecord[];
  result?: ScenarioRunResult;
  error?: string;
}

const mutations = new Map<string, MutationRecord>();
const orderedMutationIds: string[] = [];
const MAX_MUTATIONS = 100;
const recentHooks: HookEventRecord[] = [];

export function createMutationSeed(input: {
  task: string;
  zone: string;
  filesChanged: string[];
  diffSummary: string;
  hookEvent: HookEventRecord;
}): MutationRecord {
  const timestamp = new Date().toISOString();
  return {
    mutationId: randomUUID(),
    source: "cursor_hook",
    status: "received",
    task: input.task,
    zone: input.zone,
    filesChanged: input.filesChanged,
    diffSummary: input.diffSummary,
    createdAt: timestamp,
    updatedAt: timestamp,
    hookEvents: [input.hookEvent]
  };
}

export function upsertMutation(record: MutationRecord): MutationRecord {
  record.updatedAt = new Date().toISOString();
  const exists = mutations.has(record.mutationId);
  mutations.set(record.mutationId, record);
  if (!exists) {
    orderedMutationIds.unshift(record.mutationId);
    if (orderedMutationIds.length > MAX_MUTATIONS) {
      const removed = orderedMutationIds.pop();
      if (removed) {
        mutations.delete(removed);
      }
    }
  }
  return record;
}

export function recordHookEvent(event: HookEventRecord): HookEventRecord {
  recentHooks.unshift(event);
  if (recentHooks.length > MAX_MUTATIONS) {
    recentHooks.length = MAX_MUTATIONS;
  }
  return event;
}

export function listRecentHookEvents(limit = 100): HookEventRecord[] {
  return recentHooks.slice(0, limit);
}

export function attachHookEventToMostRecentMutation(
  event: HookEventRecord,
  maxAgeMs = 30000
): MutationRecord | undefined {
  const [latestId] = orderedMutationIds;
  if (!latestId) return undefined;
  const latest = mutations.get(latestId);
  if (!latest) return undefined;
  const ageMs = Date.now() - Date.parse(latest.updatedAt);
  if (ageMs > maxAgeMs) return undefined;
  latest.hookEvents.push(event);
  latest.updatedAt = new Date().toISOString();
  mutations.set(latest.mutationId, latest);
  return latest;
}

export function getRecentMutations(limit = 20): MutationRecord[] {
  return orderedMutationIds
    .slice(0, limit)
    .map((id) => mutations.get(id))
    .filter((value): value is MutationRecord => Boolean(value));
}

export function getMutationById(mutationId: string): MutationRecord | undefined {
  return mutations.get(mutationId);
}
