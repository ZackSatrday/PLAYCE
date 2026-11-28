import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImportUrlOrId } from "@/lib/lms/import-request";

test("parseImportUrlOrId accepts a non-empty string and trims it", () => {
  assert.equal(
    parseImportUrlOrId({ urlOrId: "  https://youtube.com/playlist?list=PL1  " }),
    "https://youtube.com/playlist?list=PL1",
  );
  assert.equal(parseImportUrlOrId({ urlOrId: "PL123", extra: true }), "PL123");
});

test("parseImportUrlOrId rejects null bodies and non-string values", () => {
  for (const body of [null, undefined, "PL123", 42, [], {}, { urlOrId: 42 }, { urlOrId: null }]) {
    assert.equal(parseImportUrlOrId(body), null);
  }
});

test("parseImportUrlOrId rejects empty and whitespace-only strings", () => {
  assert.equal(parseImportUrlOrId({ urlOrId: "" }), null);
  assert.equal(parseImportUrlOrId({ urlOrId: "   " }), null);
});
