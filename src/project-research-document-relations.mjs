import { admitResearchDocumentMetadata } from "./research-document-metadata.mjs";

function authorId(name) {
  return name.toLocaleLowerCase("en-US").replaceAll(/[.,'"]/gu, "").replaceAll(/\s+/gu, "-").replaceAll(/[^a-z0-9-]/gu, "").replaceAll(/-+/gu, "-").replaceAll(/^-|-$/gu, "");
}

const relation = (subject, predicate, object) => Object.freeze({ subject, predicate, object });

/**
 * Project admitted metadata into document relation data. These are immutable
 * facts from the named document carrier, not a database schema, graph, API,
 * or assertion of truth. A SignCell/graph receiver may admit them separately.
 */
export function projectResearchDocumentRelations(input) {
  const admitted = admitResearchDocumentMetadata(input);
  if (!admitted.ok) return admitted;
  const metadata = admitted.value;
  const subject = `document:${metadata.id}`;
  const relations = [
    relation(subject, "document:has-title", metadata.title),
    relation(subject, "document:has-status", metadata.status),
  ];
  if (metadata.document_type) relations.push(relation(subject, "document:has-type", metadata.document_type));
  for (const [key, predicate] of [["date_created", "document:created-on"], ["date_modified", "document:modified-on"]]) if (metadata[key]) relations.push(relation(subject, predicate, metadata[key]));
  for (const [key, predicate] of [["topics", "document:has-topic"], ["disciplines", "document:has-discipline"], ["keywords", "document:has-keyword"], ["cites_internal", "document:cites-document"], ["depends_on", "document:depends-on-document"]]) for (const value of metadata[key]) relations.push(relation(subject, predicate, value));
  for (const author of metadata.authors) {
    const entity = `author:${authorId(author)}`;
    relations.push(relation(subject, "document:has-author", entity), relation(entity, "author:has-name", author));
  }
  for (const definition of metadata.defines) {
    const entity = `term:${definition.id}`;
    relations.push(relation(subject, "document:defines-term", entity), relation(entity, "term:has-label", definition.label));
    if (definition.description) relations.push(relation(entity, "term:has-description", definition.description));
    for (const alias of definition.aliases) relations.push(relation(entity, "term:has-alias", alias));
  }
  for (const citation of metadata.cites_external) {
    const entity = `publication:${citation.key}`;
    relations.push(relation(subject, "document:cites-publication", entity), relation(entity, "publication:has-title", citation.title));
    for (const author of citation.authors) relations.push(relation(entity, "publication:has-author", author));
  }
  return Object.freeze({ ok: true, value: Object.freeze({ subject, metadata, relations: Object.freeze(relations) }) });
}
