import { randomUUID } from "node:crypto";
const mutations = new Map();
const orderedMutationIds = [];
const MAX_MUTATIONS = 100;
const recentHooks = [];
export function createMutationSeed(input) {
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
export function upsertMutation(record) {
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
export function recordHookEvent(event) {
    recentHooks.unshift(event);
    if (recentHooks.length > MAX_MUTATIONS) {
        recentHooks.length = MAX_MUTATIONS;
    }
    return event;
}
export function listRecentHookEvents(limit = 100) {
    return recentHooks.slice(0, limit);
}
export function attachHookEventToMostRecentMutation(event, maxAgeMs = 30000) {
    const [latestId] = orderedMutationIds;
    if (!latestId)
        return undefined;
    const latest = mutations.get(latestId);
    if (!latest)
        return undefined;
    const ageMs = Date.now() - Date.parse(latest.updatedAt);
    if (ageMs > maxAgeMs)
        return undefined;
    latest.hookEvents.push(event);
    latest.updatedAt = new Date().toISOString();
    mutations.set(latest.mutationId, latest);
    return latest;
}
export function getRecentMutations(limit = 20) {
    return orderedMutationIds
        .slice(0, limit)
        .map((id) => mutations.get(id))
        .filter((value) => Boolean(value));
}
export function getMutationById(mutationId) {
    return mutations.get(mutationId);
}
