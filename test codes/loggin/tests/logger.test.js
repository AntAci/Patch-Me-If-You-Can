import assert from "node:assert/strict";
import test from "node:test";

import {
  createAsyncContext,
  createLogger,
  createMemoryTransport,
  LEVELS,
  normalizeLevel
} from "../src/index.js";

test("normalizeLevel", () => {
  assert.equal(normalizeLevel("INFO"), LEVELS.info);
  assert.equal(normalizeLevel(40), 40);
});

test("level filter", () => {
  const mem = createMemoryTransport();
  const log = createLogger({
    level: "warn",
    format: "json",
    transport: mem
  });
  log.info("nope");
  log.warn("yes");
  assert.equal(mem.entries.length, 1);
  assert.equal(mem.entries[0].levelName, "warn");
});

test("child bindings", () => {
  const mem = createMemoryTransport();
  const root = createLogger({
    level: "info",
    format: "json",
    transport: mem,
    base: { svc: "api" }
  });
  const child = root.child({ route: "/x" });
  child.info("hit");
  assert.equal(mem.entries[0].svc, "api");
  assert.equal(mem.entries[0].route, "/x");
});

test("async context", async () => {
  const mem = createMemoryTransport();
  const ac = createAsyncContext();
  const log = createLogger({
    level: "info",
    format: "json",
    transport: mem,
    context: ac
  });

  await new Promise((resolve) => {
    ac.run({ rid: "a" }, () => {
      log.info("one");
      resolve();
    });
  });

  assert.equal(mem.entries[0].rid, "a");
});
