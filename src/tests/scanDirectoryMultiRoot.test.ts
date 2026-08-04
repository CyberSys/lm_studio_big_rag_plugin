import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { scanDirectory } from "../ingestion/fileScanner";

function makeTempRoots(): { rootA: string; rootB: string; cleanup: () => void } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "big-rag-scan-"));
  const rootA = path.join(base, "docsA");
  const rootB = path.join(base, "docsB");
  fs.mkdirSync(path.join(rootA, "sub"), { recursive: true });
  fs.mkdirSync(rootB, { recursive: true });
  fs.writeFileSync(path.join(rootA, "a.txt"), "hello a");
  fs.writeFileSync(path.join(rootA, "sub", "a2.txt"), "hello a2");
  fs.writeFileSync(path.join(rootB, "b.txt"), "hello b");
  const cleanup = () => fs.rmSync(base, { recursive: true, force: true });
  return { rootA, rootB, cleanup };
}

test("scanDirectory merges multiple roots", async () => {
  const { rootA, rootB, cleanup } = makeTempRoots();
  try {
    const files = await scanDirectory([rootA, rootB]);
    const names = files.map((f) => path.basename(f.path)).sort();
    assert.deepEqual(names, ["a.txt", "a2.txt", "b.txt"]);
  } finally {
    cleanup();
  }
});

test("scanDirectory deduplicates overlapping roots", async () => {
  const { rootA, rootB, cleanup } = makeTempRoots();
  try {
    const files = await scanDirectory([rootA, rootA, rootB, rootB]);
    const names = files.map((f) => path.basename(f.path)).sort();
    assert.deepEqual(names, ["a.txt", "a2.txt", "b.txt"]);
  } finally {
    cleanup();
  }
});

test("scanDirectory skips missing roots with a warning", async () => {
  const { rootA, rootB, cleanup } = makeTempRoots();
  const missing = path.join(rootA, "does-not-exist");
  try {
    const files = await scanDirectory([missing, rootA]);
    const names = files.map((f) => path.basename(f.path)).sort();
    assert.deepEqual(names, ["a.txt", "a2.txt"]);
  } finally {
    cleanup();
  }
});

test("scanDirectory returns empty for empty roots list", async () => {
  const files = await scanDirectory([]);
  assert.deepEqual(files, []);
});