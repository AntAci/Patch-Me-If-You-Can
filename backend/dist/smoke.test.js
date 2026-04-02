import { test } from "node:test";
import assert from "node:assert/strict";
import { runScenario } from "./runner.js";
import { generateDiagnosis } from "./engine/diagnosis.js";
import { normalizeHookMutation } from "./mutation/normalize.js";
import { createMutationSeed } from "./mutation/store.js";
import { processMutation } from "./mutation/process.js";
test("healthy scenario releases", async () => {
    const r = await runScenario("healthy");
    assert.equal(r.finalVerdict, "released");
    assert.equal(r.health, "healthy");
});
test("protected zone blocks", async () => {
    const r = await runScenario("protected-zone-blocked");
    assert.equal(r.finalVerdict, "blocked");
    assert.equal(r.protectedZone.violated, true);
});
test("infected-healed repairs after retry", async () => {
    const r = await runScenario("infected-healed");
    assert.equal(r.finalVerdict, "released");
    assert.equal(r.retry.attempted, true);
    assert.equal(r.retry.succeeded, true);
});
test("diagnosis merges verificationFailures when tests fail (live data not dropped)", () => {
    const scenario = {
        scenarioId: "live-test",
        patchId: "PATCH-LIVE",
        task: "task",
        zone: "Tests",
        patch: {
            filesChanged: ["src/foo.ts"],
            diffSummary: "diff"
        },
        initialChecks: {
            tests: { status: "failed", summary: "3 tests failed" },
            lint: { status: "passed", summary: "ok" },
            typecheck: { status: "passed", summary: "ok" }
        },
        diagnosisHints: []
    };
    const vf = [
        { category: "test", message: "expected 1 === 2", file: "src/foo.ts" }
    ];
    const d = generateDiagnosis({
        scenario,
        protectedMatches: [],
        verificationFailures: vf
    });
    assert.equal(d.code, "quality_regression");
    assert.ok(d.symptoms.some((s) => s.includes("[test]")));
    assert.ok(d.symptoms.some((s) => s.includes("src/foo.ts")));
    assert.equal(d.failingFile, "src/foo.ts");
});
test("diagnosis is mixed_regression when lint and typecheck fail but tests pass", () => {
    const scenario = {
        scenarioId: "lint-type-mixed",
        patchId: "PATCH-LT",
        task: "task",
        zone: "API",
        patch: {
            filesChanged: ["src/api.ts"],
            diffSummary: "diff"
        },
        initialChecks: {
            tests: { status: "passed", summary: "all tests passed" },
            lint: { status: "failed", summary: "2 eslint errors" },
            typecheck: { status: "failed", summary: "TS2322 in api.ts" }
        },
        diagnosisHints: []
    };
    const d = generateDiagnosis({ scenario, protectedMatches: [] });
    assert.equal(d.code, "mixed_regression");
    assert.equal(d.failureType, "mixed");
    assert.ok(d.symptoms.some((s) => s.includes("eslint")));
    assert.ok(d.symptoms.some((s) => s.includes("TS2322")));
});
test("afterFileEdit hook normalizes into a processed cursor mutation", async () => {
    const hookEvent = {
        at: new Date().toISOString(),
        event: "afterFileEdit",
        payload: {
            filePath: "src/features/search.ts"
        }
    };
    const normalized = normalizeHookMutation(hookEvent);
    assert.ok(normalized);
    const mutation = createMutationSeed({
        task: normalized.task,
        zone: normalized.zone,
        filesChanged: normalized.filesChanged,
        diffSummary: normalized.diffSummary,
        hookEvent
    });
    const result = await processMutation(mutation);
    assert.equal(result.source, "cursor_hook");
    assert.equal(result.mutationId, mutation.mutationId);
    assert.deepEqual(result.filesChanged, ["src/features/search.ts"]);
});
test("protected auth mutation is blocked from cursor mutation processing", async () => {
    const hookEvent = {
        at: new Date().toISOString(),
        event: "afterFileEdit",
        payload: {
            filePath: "src/auth/session.ts"
        }
    };
    const normalized = normalizeHookMutation(hookEvent);
    assert.ok(normalized);
    const mutation = createMutationSeed({
        task: normalized.task,
        zone: normalized.zone,
        filesChanged: normalized.filesChanged,
        diffSummary: normalized.diffSummary,
        hookEvent
    });
    const result = await processMutation(mutation);
    assert.equal(result.finalVerdict, "blocked");
});
