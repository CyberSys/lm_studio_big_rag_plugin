/**
 * Parse the Documents Directory setting into a list of root paths.
 * The setting accepts multiple paths separated by commas and/or new lines;
 * empty entries and surrounding whitespace are ignored.
 */
export function parseDocumentPaths(raw: string | undefined | null): string[] {
  const out: string[] = [];
  const parts = (raw ?? "").split(/[,\r\n]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed !== "") {
      out.push(trimmed);
    }
  }
  return out;
}

/**
 * Parse a list of document roots from env vars / CLI args.
 * Accepts commas, semicolons and new lines as separators (shell-friendly).
 */
export function parseDocumentPathsFromEnv(raw: string | undefined | null): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  return parseDocumentPaths(raw.replace(/;/g, ","));
}
