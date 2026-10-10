import { admitResearchDocumentMetadata } from "./research-document-metadata.mjs";

/**
 * Compare an explicit set of admitted document metadata records.  This is an
 * observation: it reports missing or asymmetric references and never edits a
 * document, builds an index, or treats a citation as truth.
 */
export function auditResearchDocumentCitations(records) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array of decoded metadata objects");
  const admitted = records.map((record) => admitResearchDocumentMetadata(record));
  const invalid = admitted.flatMap((entry, index) => entry.ok ? [] : [Object.freeze({ index, refusal: entry.refusal })]);
  const documents = admitted.filter((entry) => entry.ok).map((entry) => entry.value);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const broken = [], asymmetric = [];
  for (const document of documents) for (const target of document.cites_internal) {
    const cited = byId.get(target);
    if (!cited) broken.push(Object.freeze({ document: document.id, target }));
    else if (!cited.cited_by_internal.includes(document.id)) asymmetric.push(Object.freeze({ document: document.id, target, expectedInverse: "cited_by_internal" }));
  }
  return Object.freeze({ kind: "research-document-citation-audit", documents: documents.length, invalid: Object.freeze(invalid), broken: Object.freeze(broken), asymmetric: Object.freeze(asymmetric), ok: invalid.length === 0 && broken.length === 0 && asymmetric.length === 0 });
}
