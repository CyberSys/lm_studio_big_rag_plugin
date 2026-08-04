import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  parseDocumentPaths,
  parseDocumentPathsFromEnv,
} from "../utils/documentPaths";

test("parseDocumentPaths splits on commas and trims", () => {
  assert.deepEqual(parseDocumentPaths("/a, /b ,/c"), ["/a", "/b", "/c"]);
});

test("parseDocumentPaths splits on new lines", () => {
  assert.deepEqual(
    parseDocumentPaths("/a\n/b\r\n/c"),
    ["/a", "/b", "/c"],
  );
});

test("parseDocumentPaths ignores empty entries and whitespace", () => {
  assert.deepEqual(parseDocumentPaths("  , ,,/a,  ,\n"),
    ["/a"]);
  assert.deepEqual(parseDocumentPaths(""), []);
  assert.deepEqual(parseDocumentPaths(undefined), []);
});

test("parseDocumentPaths handles mixed separators", () => {
  assert.deepEqual(
    parseDocumentPaths("/a,/b\n/c, /d"),
    ["/a", "/b", "/c", "/d"],
  );
});

test("parseDocumentPathsFromEnv splits on commas and semicolons", () => {
  assert.deepEqual(parseDocumentPathsFromEnv("/a;/b,/c"), ["/a", "/b", "/c"]);
  assert.deepEqual(parseDocumentPathsFromEnv("  ;  "), []);
  assert.deepEqual(parseDocumentPathsFromEnv(undefined), []);
});