export function findProtectedZoneMatches(
  filesChanged: string[],
  protectedFiles: readonly string[]
): string[] {
  return filesChanged.filter((filePath) =>
    protectedFiles.some((protectedPath) =>
      protectedPath.endsWith("/")
        ? filePath.startsWith(protectedPath)
        : filePath === protectedPath
    )
  );
}
