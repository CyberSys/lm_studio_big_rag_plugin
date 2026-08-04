import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";
import {
  listSupportedExtensions,
} from "../utils/supportedExtensions";
import { matchExcludePattern } from "../utils/fileExcludePatterns";
import { buildEffectiveExtensionSet } from "../utils/additionalExtensions";

export interface ScannedFile {
  path: string;
  name: string;
  extension: string;
  mimeType: string | false;
  size: number;
  mtime: Date;
}

export interface ExcludedFileInfo {
  relativePath: string;
  pattern: string;
}

export interface ScanDirectoryOptions {
  excludePatterns?: string[];
  additionalPlainTextExtensions?: ReadonlySet<string>;
  onExcludedFile?: (info: ExcludedFileInfo) => void;
}

/** Normalize and validate the root directory for scanning (resolves path, strips trailing slashes). */
function normalizeRootDir(rootDir: string): string {
  return path.resolve(rootDir.trim()).replace(/[/\\]+$/, "");
}

function toPosixRelativePath(root: string, fullPath: string): string {
  return path.relative(root, fullPath).split(path.sep).join("/");
}

/**
 * Recursively scan a list of root directories for supported files.
 * Missing roots are skipped with a warning; overlapping files (same resolved
 * absolute path reached from multiple roots) are deduplicated.
 */
export async function scanDirectory(
  rootDirs: string[],
  onProgress?: (current: number, total: number) => void,
  options?: ScanDirectoryOptions,
): Promise<ScannedFile[]> {
  const roots = rootDirs
    .map(normalizeRootDir)
    .filter((root) => root !== "");
  const excludePatterns = options?.excludePatterns ?? [];
  const additionalPlainTextExtensions = options?.additionalPlainTextExtensions ?? new Set<string>();
  const onExcludedFile = options?.onExcludedFile;
  const effectiveExtensions = buildEffectiveExtensionSet(additionalPlainTextExtensions);

  const files: ScannedFile[] = [];
  let scannedCount = 0;
  const seenFilePaths = new Set<string>();

  const supportedExtensionsDescription = listSupportedExtensions().join(", ");
  console.log(`[Scanner] Built-in extensions: ${supportedExtensionsDescription}`);
  if (additionalPlainTextExtensions.size > 0) {
    const additionalList = Array.from(additionalPlainTextExtensions.values()).sort().join(", ");
    console.log(`[Scanner] Additional plain-text extensions: ${additionalList}`);
  }
  if (roots.length > 0) {
    console.log(`[Scanner] Scanning ${roots.length} document root(s): ${roots.join(", ")}`);
  }

  async function walk(root: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(root, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(root, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          scannedCount++;

          const ext = path.extname(entry.name).toLowerCase();

          if (effectiveExtensions.has(ext)) {
            const resolvedFullPath = path.resolve(fullPath);
            if (seenFilePaths.has(resolvedFullPath)) {
              continue;
            }
            const relativePosix = toPosixRelativePath(root, fullPath);
            const matchedPattern =
              excludePatterns.length > 0 ? matchExcludePattern(relativePosix, excludePatterns) : null;

            if (matchedPattern !== null) {
              onExcludedFile?.({ relativePath: relativePosix, pattern: matchedPattern });
            } else {
              const stats = await fs.promises.stat(fullPath);
              const mimeType = mime.lookup(fullPath);

              files.push({
                path: fullPath,
                name: entry.name,
                extension: ext,
                mimeType,
                size: stats.size,
                mtime: stats.mtime,
              });
              seenFilePaths.add(resolvedFullPath);
            }
          }

          if (onProgress && scannedCount % 100 === 0) {
            onProgress(scannedCount, files.length);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${root}:`, error);
    }
  }

  for (const root of roots) {
    try {
      await fs.promises.access(root, fs.constants.R_OK);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        console.warn(
          `[Scanner] Documents directory does not exist, skipping: ${root}. ` +
            "Check the path (e.g. spelling and that the folder exists).",
        );
        continue;
      }
      throw err;
    }
    await walk(root);
  }

  if (onProgress) {
    onProgress(scannedCount, files.length);
  }

  return files;
}

/**
 * Check if a file type is supported (built-in plus optional user plain-text extensions).
 */
export function isSupportedFile(
  filePath: string,
  additionalPlainTextExtensions: ReadonlySet<string> = new Set<string>(),
): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return buildEffectiveExtensionSet(additionalPlainTextExtensions).has(ext);
}
