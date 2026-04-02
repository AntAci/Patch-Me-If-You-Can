import { spawn } from "node:child_process";
import type { CheckResult, VerificationFailure, VerificationCategory } from "../schemas/events.js";

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: false,
      env: { ...process.env, CI: "1", FORCE_COLOR: "0" }
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function toCheckResult(
  exitCode: number,
  stdout: string,
  stderr: string,
  label: string
): CheckResult {
  const rawOutput = [stdout, stderr].filter(Boolean).join("\n").trim();
  const summary =
    exitCode === 0
      ? `${label} passed`
      : `${label} failed (exit ${exitCode})`;
  return {
    status: exitCode === 0 ? "passed" : "failed",
    summary: rawOutput ? `${summary}: ${rawOutput.slice(0, 400)}` : summary,
    rawOutput: rawOutput || undefined
  };
}

function firstLines(text: string, max = 8): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

function extractFileFromLine(line: string): string | undefined {
  const m = line.match(/([^\s()]+\.(?:ts|tsx|js|jsx|mts|cts))\(/);
  if (m) return m[1];
  const m2 = line.match(/([^:\s]+\.(?:ts|tsx|js|jsx)):\d+/);
  return m2?.[1];
}

export function normalizeFailures(
  category: VerificationCategory,
  raw: string
): VerificationFailure[] {
  const lines = firstLines(raw, 12);
  if (lines.length === 0) {
    return [{ category, message: "Check failed (no output captured)." }];
  }
  return lines.map((line) => ({
    category,
    message: line.slice(0, 500),
    file: extractFileFromLine(line),
    raw: line
  }));
}

export interface LiveChecksResult {
  checks: {
    tests: CheckResult;
    lint: CheckResult;
    typecheck: CheckResult;
  };
  failures: VerificationFailure[];
}

/**
 * Runs npm test, npm run lint, and npx tsc --noEmit in the given workspace.
 * Requires those scripts to exist; failures are captured for diagnosis.
 */
export async function runChecksInWorkspace(workspaceRoot: string): Promise<LiveChecksResult> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";

  const testRun = await run(npm, ["test", "--silent"], workspaceRoot).catch((e) => ({
    code: 1,
    stdout: "",
    stderr: String(e)
  }));
  const lintRun = await run(npm, ["run", "lint", "--silent"], workspaceRoot).catch((e) => ({
    code: 1,
    stdout: "",
    stderr: String(e)
  }));
  const tscRun = await run(npx, ["tsc", "--noEmit", "-p", "tsconfig.json"], workspaceRoot).catch(
    (e) => ({
      code: 1,
      stdout: "",
      stderr: String(e)
    })
  );

  const tests = toCheckResult(
    testRun.code,
    testRun.stdout,
    testRun.stderr,
    "Tests"
  );
  const lint = toCheckResult(
    lintRun.code,
    lintRun.stdout,
    lintRun.stderr,
    "Lint"
  );
  const typecheck = toCheckResult(
    tscRun.code,
    tscRun.stdout,
    tscRun.stderr,
    "Typecheck"
  );

  const failures: VerificationFailure[] = [];
  if (tests.status === "failed") {
    failures.push(...normalizeFailures("test", tests.rawOutput ?? tests.summary));
  }
  if (lint.status === "failed") {
    failures.push(...normalizeFailures("lint", lint.rawOutput ?? lint.summary));
  }
  if (typecheck.status === "failed") {
    failures.push(...normalizeFailures("typecheck", typecheck.rawOutput ?? typecheck.summary));
  }

  return {
    checks: { tests, lint, typecheck },
    failures
  };
}
