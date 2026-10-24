import assert from "node:assert/strict";
import test from "node:test";
import { auditResearchDocumentCitations } from "../src/audit-research-document-citations.mjs";

const paper = (id, extras = {}) => ({
  id, title: "Research: " + id, status: "working", document_type: "paper",
  ...extras,
});

test("two independently described papers with reciprocal citations pass without pretending proof", () => {
  const input = [
    paper("new-web-study", { cites_internal: ["source-method"] }),
    paper("source-method", { cited_by_internal: ["new-web-study"] }),
  ];
  const report = auditResearchDocumentCitations(input);
  assert.equal(report.kind, "research-document-citation-audit");
  assert.equal(report.documents, 2);
  assert.equal(report.ok, true);
  for (const key of ["invalid", "broken", "asymmetric", "duplicates",
    "inverseBroken", "inverseAsymmetric", "ambiguous"]) {
    assert.deepEqual(report[key], [], key);
  }
  assert.equal(Object.isFrozen(report), true);
  assert.ok(Object.values(report).filter(Array.isArray).every(Object.isFrozen));
  assert.deepEqual(input[1].cited_by_internal, ["new-web-study"]);
});

test("reverse citations without a source or without a matching forward declaration fail", () => {
  const absent = auditResearchDocumentCitations([
    paper("source", { cited_by_internal: ["not-in-the-corpus"] }),
  ]);
  assert.equal(absent.ok, false);
  assert.deepEqual(absent.inverseBroken, [
    { document: "source", target: "not-in-the-corpus" },
  ]);
  assert.deepEqual(absent.broken, [],
    "a missing cited-by source is not misrepresented as a forward-citation failure");

  const falseInverse = auditResearchDocumentCitations([
    paper("source", { cited_by_internal: ["other"] }),
    paper("other", { cites_internal: [] }),
  ]);
  assert.equal(falseInverse.ok, false);
  assert.deepEqual(falseInverse.inverseAsymmetric, [
    { document: "source", target: "other", expectedInverse: "cites_internal" },
  ]);
});

test("duplicate paper IDs never silently select the last record as authority", () => {
  const report = auditResearchDocumentCitations([
    paper("same-id", { title: "Original A" }),
    paper("same-id", { title: "Other A" }),
    paper("reader", { cites_internal: ["same-id"] }),
  ]);
  assert.equal(report.documents, 3);
  assert.equal(report.ok, false);
  assert.deepEqual(report.duplicates, [
    { id: "same-id", indices: [0, 1] },
  ]);
  assert.deepEqual(report.ambiguous, [
    { document: "reader", target: "same-id", relation: "cites_internal" },
  ]);
  assert.deepEqual(report.broken, [], "the target exists but is not uniquely identified");
});

test("forward refusals and invalid metadata remain visible beside other graph failures", () => {
  const report = auditResearchDocumentCitations([
    paper("first", { cites_internal: ["second", "absent"] }),
    paper("second"),
    { id: "Third BAD", title: "" },
  ]);
  assert.equal(report.ok, false);
  assert.equal(report.invalid.length, 1);
  assert.equal(report.invalid[0].index, 2);
  assert.deepEqual(report.broken, [{ document: "first", target: "absent" }]);
  assert.deepEqual(report.asymmetric, [
    { document: "first", target: "second", expectedInverse: "cited_by_internal" },
  ]);
  assert.throws(() => auditResearchDocumentCitations("not a corpus"), /records must be an array/);
});
