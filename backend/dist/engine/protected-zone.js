export function findProtectedZoneMatches(filesChanged, protectedFiles) {
    return filesChanged.filter((filePath) => protectedFiles.some((protectedPath) => protectedPath.endsWith("/")
        ? filePath.startsWith(protectedPath)
        : filePath === protectedPath));
}
