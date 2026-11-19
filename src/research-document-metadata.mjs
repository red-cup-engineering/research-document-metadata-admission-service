const IDENTIFIER = /^[a-z0-9.-]+$/u;

export const RESEARCH_DOCUMENT_STATUSES = Object.freeze([
  "draft", "working", "canonical", "archived", "deprecated", "active", "exploratory",
]);

export const RESEARCH_DOCUMENT_TYPES = Object.freeze([
  "foundational_treatise", "paper", "theorem", "definition", "proof", "experiment",
  "note", "commentary", "draft", "synthesis", "style_guide", "exploratory_treatise",
  "technical_companion",
]);

const accepted = (value) => Object.freeze({ ok: true, value: Object.freeze(value) });
const refused = (issues) => Object.freeze({ ok: false, refusal: Object.freeze({ code: "invalid-research-document-metadata", issues: Object.freeze(issues) }) });
const issue = (path, message) => Object.freeze({ path, message });
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "");
const copyStrings = (value) => Object.freeze([...(value ?? [])]);

function checkStringArray(input, key, issues) {
  if (input[key] !== undefined && !strings(input[key])) issues.push(issue(`/${key}`, "must be an array of nonempty strings"));
}

function checkDate(input, key, issues) {
  if (input[key] !== undefined && (typeof input[key] !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(input[key]))) {
    issues.push(issue(`/${key}`, "must be an ISO calendar date (YYYY-MM-DD)"));
  }
}

function checkDefinitions(input, issues) {
  if (input.defines === undefined) return;
  if (!Array.isArray(input.defines)) {
    issues.push(issue("/defines", "must be an array"));
    return;
  }
  input.defines.forEach((definition, index) => {
    const path = `/defines/${index}`;
    if (!isObject(definition)) return issues.push(issue(path, "must be an object"));
    if ("term_id" in definition || "definition" in definition) issues.push(issue(path, "uses replaced fields; use id and description"));
    if (typeof definition.id !== "string" || !IDENTIFIER.test(definition.id)) issues.push(issue(`${path}/id`, "must be a lowercase dotted-or-hyphenated identifier"));
    if (typeof definition.label !== "string" || definition.label.trim() === "") issues.push(issue(`${path}/label`, "must be a nonempty string"));
    if (definition.description !== undefined && typeof definition.description !== "string") issues.push(issue(`${path}/description`, "must be a string"));
    if (definition.aliases !== undefined && !strings(definition.aliases)) issues.push(issue(`${path}/aliases`, "must be an array of nonempty strings"));
  });
}

function checkExternalCitations(input, issues) {
  if (input.cites_external === undefined) return;
  if (!Array.isArray(input.cites_external)) {
    issues.push(issue("/cites_external", "must be an array"));
    return;
  }
  input.cites_external.forEach((citation, index) => {
    const path = `/cites_external/${index}`;
    if (!isObject(citation)) return issues.push(issue(path, "must be an object"));
    if (typeof citation.key !== "string" || citation.key.trim() === "") issues.push(issue(`${path}/key`, "must be a nonempty string"));
    if (typeof citation.title !== "string" || citation.title.trim() === "") issues.push(issue(`${path}/title`, "must be a nonempty string"));
    if (citation.authors !== undefined && !strings(citation.authors)) issues.push(issue(`${path}/authors`, "must be an array of nonempty strings"));
    for (const key of ["year", "venue", "doi", "url"]) if (citation[key] !== undefined && typeof citation[key] !== "string" && !(key === "year" && Number.isInteger(citation[key]))) issues.push(issue(`${path}/${key}`, "must be a string"));
    if (citation.extra !== undefined && !isObject(citation.extra)) issues.push(issue(`${path}/extra`, "must be an object"));
  });
}

function normalizedDefinitions(definitions = []) {
  return Object.freeze(definitions.map((definition) => Object.freeze({
    id: definition.id, label: definition.label,
    ...(definition.description === undefined ? {} : { description: definition.description }),
    aliases: copyStrings(definition.aliases),
  })));
}

function normalizedCitations(citations = []) {
  return Object.freeze(citations.map((citation) => Object.freeze({
    key: citation.key, title: citation.title, authors: copyStrings(citation.authors),
    ...Object.fromEntries(["year", "venue", "doi", "url", "extra"].filter((key) => citation[key] !== undefined).map((key) => [key, citation[key]])),
  })));
}

/**
 * Admit the document-specific metadata after a carrier codec has decoded it.
 * It deliberately accepts JSON metadata rather than Markdown text: the
 * Markdown envelope belongs to markdown data, while these meanings belong to
 * document data.
 */
export function admitResearchDocumentMetadata(input) {
  if (!isObject(input)) return refused([issue("/", "metadata must be an object")]);
  const issues = [];
  if (typeof input.id !== "string" || !IDENTIFIER.test(input.id)) issues.push(issue("/id", "must be a lowercase dotted-or-hyphenated identifier"));
  if (typeof input.title !== "string" || input.title.trim() === "") issues.push(issue("/title", "must be a nonempty string"));
  if (input.status !== undefined && !RESEARCH_DOCUMENT_STATUSES.includes(input.status)) issues.push(issue("/status", `must be one of ${RESEARCH_DOCUMENT_STATUSES.join(", ")}`));
  if (input.document_type !== undefined && !RESEARCH_DOCUMENT_TYPES.includes(input.document_type)) issues.push(issue("/document_type", `must be one of ${RESEARCH_DOCUMENT_TYPES.join(", ")}`));
  for (const key of ["aliases", "authors", "topics", "disciplines", "cites_internal", "cited_by_internal", "depends_on", "keywords"]) checkStringArray(input, key, issues);
  for (const key of ["date_created", "date_modified"]) checkDate(input, key, issues);
  checkDefinitions(input, issues);
  checkExternalCitations(input, issues);
  if (issues.length > 0) return refused(issues);
  return accepted({
    id: input.id, title: input.title,
    status: input.status ?? "draft",
    ...(input.document_type === undefined ? {} : { document_type: input.document_type }),
    ...Object.fromEntries(["aliases", "authors", "topics", "disciplines", "cites_internal", "cited_by_internal", "depends_on", "keywords"].map((key) => [key, copyStrings(input[key])])),
    ...Object.fromEntries(["date_created", "date_modified", "published", "publication_venue", "doi", "license", "git_repo", "git_branch", "git_commit", "extra"].filter((key) => input[key] !== undefined).map((key) => [key, input[key]])),
    defines: normalizedDefinitions(input.defines),
    cites_external: normalizedCitations(input.cites_external),
  });
}
