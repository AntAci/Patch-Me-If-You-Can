import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import os from "node:os";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Simulates accepting work from an agent: returns metadata for the pipeline.
 * In a full integration this would call the model; here it is deterministic.
 */
export function generatePatch(task) {
    return { ...task };
}
/**
 * Applies a patch into an isolated temp working directory (simulated branch).
 * Writes diff to disk for audit; does not run `git apply` to keep the demo hermetic.
 */
export async function applyPatchInTempWorkdir(task) {
    const base = path.join(os.tmpdir(), `mainline-immunity-${task.patchId}-${randomBytes(4).toString("hex")}`);
    await mkdir(base, { recursive: true });
    if (task.diffText) {
        await writeFile(path.join(base, "incoming.patch"), task.diffText, "utf8");
    }
    await writeFile(path.join(base, "TASK.txt"), `${task.task}\n`, "utf8");
    return { workdir: base, applied: true };
}
/** Resolve backend package root (for running npm scripts against this repo). */
export function resolveBackendRoot() {
    return path.join(__dirname, "..", "..");
}
