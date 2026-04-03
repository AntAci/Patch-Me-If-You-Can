const DEFAULT_POLICY_INSTRUCTIONS = [
    {
        id: "protected-files",
        title: "Protected Files",
        instruction: "Do not touch auth, security, secrets, or credential-handling files unless a human explicitly approves the change.",
        severity: "critical"
    },
    {
        id: "main-sql",
        title: "Main SQL Database",
        instruction: "Do not alter the main SQL database schema, migration history, or production seed data in an automated repair pass.",
        severity: "critical"
    },
    {
        id: "verification",
        title: "Verification Integrity",
        instruction: "Never disable tests, lint, or typecheck to force a pass. Repairs must make the existing checks green.",
        severity: "warn"
    },
    {
        id: "minimal-diff",
        title: "Minimal Diff",
        instruction: "Keep the repair small, reversible, and scoped to the failing behavior. Do not refactor unrelated areas.",
        severity: "info"
    }
];
function toInstruction(text, idx) {
    return {
        id: `custom-${idx + 1}`,
        title: `Operator Rule ${idx + 1}`,
        instruction: text.trim(),
        severity: "warn"
    };
}
export function getPolicyInstructions(raw) {
    const custom = (raw ?? process.env.MAINLINE_POLICY_INSTRUCTIONS ?? "")
        .split("||")
        .map((value) => value.trim())
        .filter(Boolean)
        .map(toInstruction);
    return [...DEFAULT_POLICY_INSTRUCTIONS, ...custom];
}
