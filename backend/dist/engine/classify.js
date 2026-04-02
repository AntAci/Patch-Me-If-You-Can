export function classifyHealth(input) {
    if (input.protectedZoneViolated) {
        return "infected";
    }
    const hints = input.diagnosisHints.map((hint) => hint.toLowerCase());
    const hasMaliciousHint = hints.some((hint) => ["malicious", "exfiltration", "auth bypass"].some((token) => hint.includes(token)));
    const results = [
        input.checks.tests.status,
        input.checks.lint.status,
        input.checks.typecheck.status
    ];
    const failureCount = results.filter((status) => status === "failed").length;
    const hasSoftRiskHint = hints.some((hint) => ["unsafe", "suspicious", "risky", "needs review"].some((token) => hint.includes(token)));
    if (hasMaliciousHint || input.checks.tests.status === "failed" || failureCount > 1) {
        return "infected";
    }
    if (failureCount === 1 || hasSoftRiskHint) {
        return "suspicious";
    }
    return "healthy";
}
