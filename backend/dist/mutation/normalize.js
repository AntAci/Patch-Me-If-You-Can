function extractStrings(input) {
    if (typeof input === "string") {
        return [input];
    }
    if (Array.isArray(input)) {
        return input.flatMap((value) => extractStrings(value));
    }
    if (!input || typeof input !== "object") {
        return [];
    }
    const record = input;
    const candidates = [
        record.filePath,
        record.file,
        record.path,
        record.relativePath,
        record.target,
        record.uri,
        record.files,
        record.paths,
        record.editedFiles,
        record.touchedFiles
    ];
    return candidates.flatMap((value) => extractStrings(value));
}
function normalizeFiles(payload) {
    const files = extractStrings(payload)
        .map((value) => value.replace(/^file:\/\//, ""))
        .filter((value) => value.includes("/") || value.includes("."))
        .filter((value) => !value.startsWith("http://") && !value.startsWith("https://"));
    return [...new Set(files)].slice(0, 20);
}
function inferZone(filesChanged) {
    const combined = filesChanged.join(" ").toLowerCase();
    if (combined.includes("auth") || combined.includes("login"))
        return "Auth";
    if (combined.includes("api") || combined.includes("server"))
        return "API";
    if (combined.includes("config") || combined.includes("env"))
        return "Config";
    if (combined.includes("test") || combined.includes("spec"))
        return "Tests";
    return "UI";
}
function summarizeDiff(filesChanged, event) {
    if (filesChanged.length === 0) {
        return `Cursor hook ${event} reported a mutation, but no file paths were provided.`;
    }
    if (filesChanged.length === 1) {
        return `Cursor hook ${event} modified ${filesChanged[0]}.`;
    }
    return `Cursor hook ${event} modified ${filesChanged.length} files: ${filesChanged.join(", ")}.`;
}
export function normalizeHookMutation(input) {
    const filesChanged = normalizeFiles(input.payload);
    if (input.event !== "afterFileEdit") {
        return null;
    }
    const zone = inferZone(filesChanged);
    return {
        task: filesChanged.length > 0
            ? `Cursor mutation touching ${filesChanged[0]}`
            : "Cursor mutation from afterFileEdit",
        zone,
        filesChanged,
        diffSummary: summarizeDiff(filesChanged, input.event)
    };
}
