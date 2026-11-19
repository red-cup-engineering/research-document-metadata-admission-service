import { admitResearchDocumentMetadata } from "./research-document-metadata.mjs";

/**
 * Observe an explicit, already-decoded research-document set. This does not
 * crawl sources, validate the truth of citations, assign editorial authority,
 * or maintain a second research graph. It checks reciprocal declared links
 * without choosing one record arbitrarily when a document id is duplicated.
 */
export function auditResearchDocumentCitations(records) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array of decoded metadata objects");
  const admitted = records.map(record => admitResearchDocumentMetadata(record));
  const invalid = admitted.flatMap((entry, index) => entry.ok ? [] :
    [Object.freeze({ index, refusal: entry.refusal })]);
  const entries = admitted.flatMap((entry, index) => entry.ok ?
    [{ index, document: entry.value }] : []);
  const grouped = new Map();
  for (const entry of entries) {
    if (!grouped.has(entry.document.id)) grouped.set(entry.document.id, []);
    grouped.get(entry.document.id).push(entry);
  }
  const duplicates = [...grouped].filter(([, entries]) => entries.length > 1)
    .map(([id, entries]) => Object.freeze({
      id, indices: Object.freeze(entries.map(entry => entry.index)),
    }));

  const broken = [], asymmetric = [], inverseBroken = [], inverseAsymmetric = [], ambiguous = [];
  for (const { document } of entries) {
    // A repeated source id has no unique authoring record. Report it once
    // above; do not derive claims as if the last one were authoritative.
    if (grouped.get(document.id).length !== 1) continue;
    for (const target of document.cites_internal) {
      const candidates = grouped.get(target);
      if (!candidates) broken.push(Object.freeze({ document: document.id, target }));
      else if (candidates.length > 1) ambiguous.push(Object.freeze({
        document: document.id, target, relation: "cites_internal",
      }));
      else if (!candidates[0].document.cited_by_internal.includes(document.id)) {
        asymmetric.push(Object.freeze({
          document: document.id, target, expectedInverse: "cited_by_internal",
        }));
      }
    }
    // The reverse edge is its own authored claim. The earlier auditor checked
    // only cites_internal, permitting an orphaned or false reverse link to
    // pass as a valid body of scholarly relations.
    for (const target of document.cited_by_internal) {
      const candidates = grouped.get(target);
      if (!candidates) inverseBroken.push(Object.freeze({ document: document.id, target }));
      else if (candidates.length > 1) ambiguous.push(Object.freeze({
        document: document.id, target, relation: "cited_by_internal",
      }));
      else if (!candidates[0].document.cites_internal.includes(document.id)) {
        inverseAsymmetric.push(Object.freeze({
          document: document.id, target, expectedInverse: "cites_internal",
        }));
      }
    }
  }
  const freeze = values => Object.freeze(values);
  return Object.freeze({
    kind: "research-document-citation-audit",
    documents: entries.length,
    invalid: freeze(invalid),
    broken: freeze(broken),
    asymmetric: freeze(asymmetric),
    duplicates: freeze(duplicates),
    inverseBroken: freeze(inverseBroken),
    inverseAsymmetric: freeze(inverseAsymmetric),
    ambiguous: freeze(ambiguous),
    ok: [invalid, broken, asymmetric, duplicates, inverseBroken, inverseAsymmetric, ambiguous]
      .every(group => group.length === 0),
  });
}
