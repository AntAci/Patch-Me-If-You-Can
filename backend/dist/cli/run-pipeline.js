#!/usr/bin/env node
/**
 * Repo runner entry — same behavior as run-scenario (scripted + optional --live).
 */
import { runScenarioCli } from "./run-scenario.js";
await runScenarioCli(process.argv.slice(2));
