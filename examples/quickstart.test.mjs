import assert from "node:assert/strict";
import test from "node:test";
import { proposeResearchCitationKey } from "@red-cup-engineering/research-document-metadata-admission-service/citation-key";

test("RESEARCH-CITATION-QUICKSTART", () => {
  const key = proposeResearchCitationKey({
    authors: ["A. Example"], year: 2026, title: "Field notes", existing: ["example2026field"],
  });
  assert.equal(key, "example2026fielda");
});
