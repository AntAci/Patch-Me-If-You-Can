import { test } from "node:test";
import assert from "node:assert/strict";
import { runScenario } from "./runner.js";

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
