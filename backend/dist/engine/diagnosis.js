function pickPrimaryFile(scenario) {
    const [first] = scenario.patch.filesChanged;
    return first ?? null;
}
function verificationFailureLines(verificationFailures) {
    if (!verificationFailures?.length)
        return [];
    return verificationFailures.map((f) => `[${f.category}] ${f.message}${f.file ? ` (${f.file})` : ""}`);
}
function pickFailingFileFromVerification(verificationFailures, fallback) {
    return verificationFailures?.find((f) => f.file)?.file ?? fallback;
}
export function generateDiagnosis(input) {
    const { scenario, protectedMatches, verificationFailures } = input;
    const hints = scenario.diagnosisHints.map((hint) => hint.toLowerCase());
    const failingFile = pickPrimaryFile(scenario);
    if (protectedMatches.length > 0) {
        const symptoms = [
            `Protected zone touched: ${protectedMatches.join(", ")}`,
            "Policy blocks edits to auth, security, or secrets paths."
        ];
        return {
            code: "protected_zone_violation",
            summary: "Patch attempted to modify files in a protected zone.",
            evidence: protectedMatches,
            symptoms,
            failingFile,
            failureType: "policy_violation",
            likelyCause: "Change set intersects immutable or high-risk paths."
        };
    }
    const maliciousEvidence = hints.filter((hint) => ["malicious", "exfiltration", "auth bypass"].some((token) => hint.includes(token)));
    if (maliciousEvidence.length > 0) {
        return {
            code: "malicious_signature",
            summary: "Patch contains signals consistent with a malicious or unsafe mutation.",
            evidence: maliciousEvidence,
            symptoms: maliciousEvidence.map((e) => `Signal: ${e}`),
            failingFile,
            failureType: "security_signal",
            likelyCause: "Heuristic or policy matched unsafe patterns."
        };
    }
    const testsFailed = scenario.initialChecks.tests.status === "failed";
    const lintFailed = scenario.initialChecks.lint.status === "failed";
    const typeFailed = scenario.initialChecks.typecheck.status === "failed";
    const vfLines = verificationFailureLines(verificationFailures);
    const vfFile = pickFailingFileFromVerification(verificationFailures, failingFile);
    if (testsFailed && (lintFailed || typeFailed)) {
        const symptoms = [
            scenario.initialChecks.tests.summary,
            lintFailed ? scenario.initialChecks.lint.summary : "",
            typeFailed ? scenario.initialChecks.typecheck.summary : "",
            ...vfLines
        ].filter(Boolean);
        return {
            code: "mixed_regression",
            summary: "Multiple verification gates failed after the patch.",
            evidence: symptoms,
            symptoms,
            failingFile: vfFile,
            failureType: "mixed",
            likelyCause: "Patch introduced breaking behavior across tests and static analysis."
        };
    }
    if (testsFailed) {
        const symptoms = [
            scenario.initialChecks.tests.summary,
            `Diff context: ${scenario.patch.diffSummary}`,
            ...vfLines
        ];
        const evidence = [
            scenario.initialChecks.tests.summary,
            scenario.patch.diffSummary,
            ...vfLines
        ];
        return {
            code: "quality_regression",
            summary: "Patch introduced a regression that broke the test suite.",
            evidence,
            symptoms,
            failingFile: vfFile,
            failureType: "test_failure",
            likelyCause: "Behavior change broke existing expectations or contracts."
        };
    }
    /** Lint + typecheck both failed while tests passed: mixed static-analysis regression. */
    if (lintFailed && typeFailed) {
        const symptoms = [
            scenario.initialChecks.lint.summary,
            scenario.initialChecks.typecheck.summary,
            ...vfLines
        ].filter(Boolean);
        return {
            code: "mixed_regression",
            summary: "Multiple verification gates failed after the patch.",
            evidence: symptoms,
            symptoms,
            failingFile: vfFile,
            failureType: "mixed",
            likelyCause: "Patch introduced issues in both lint and typecheck without failing the test suite."
        };
    }
    if (lintFailed) {
        const symptoms = [scenario.initialChecks.lint.summary, ...vfLines];
        const evidence = [scenario.initialChecks.lint.summary, scenario.patch.diffSummary, ...vfLines];
        return {
            code: "lint_regression",
            summary: "Lint gate reported new or unresolved issues.",
            evidence,
            symptoms,
            failingFile: vfFile,
            failureType: "lint_error",
            likelyCause: "Style, unused code, or rule violations introduced by the patch."
        };
    }
    if (typeFailed) {
        const symptoms = [scenario.initialChecks.typecheck.summary, ...vfLines];
        const evidence = [
            scenario.initialChecks.typecheck.summary,
            scenario.patch.diffSummary,
            ...vfLines
        ];
        return {
            code: "type_regression",
            summary: "TypeScript typecheck failed after the patch.",
            evidence,
            symptoms,
            failingFile: vfFile,
            failureType: "type_error",
            likelyCause: "Return types, nullability, or API contracts no longer line up."
        };
    }
    if (verificationFailures && verificationFailures.length > 0) {
        const symptoms = verificationFailureLines(verificationFailures);
        return {
            code: "mixed_regression",
            summary: "Live verification reported structured failures.",
            evidence: symptoms,
            symptoms,
            failingFile: verificationFailures.find((f) => f.file)?.file ?? failingFile,
            failureType: "live_verification",
            likelyCause: "One or more checks failed in the workspace runner."
        };
    }
    return {
        code: "clean_patch",
        summary: "Patch passed the deterministic verification pipeline.",
        evidence: [scenario.patch.diffSummary],
        symptoms: ["All gates passed.", scenario.patch.diffSummary],
        failingFile,
        failureType: null,
        likelyCause: null
    };
}
