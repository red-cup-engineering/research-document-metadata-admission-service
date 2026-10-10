# Research document metadata admission service

This service preserves the useful document meaning recovered from the legacy
RRP ingestor: admit a decoded research document's metadata and project its
declared author, term, citation, topic, and dependency relations.

It accepts an already-decoded JSON metadata object. It does not read Markdown,
touch a filesystem or Git repository, retain SQLite state, serve HTTP, or infer
truth. Markdown envelope decoding remains in Markdown data; a SignCell or
graph receiver can admit the projected facts in its own carrier.

```js
import { admitResearchDocumentMetadata } from "@red-cup-engineering/research-document-metadata-admission-service";
import { projectResearchDocumentRelations } from "@red-cup-engineering/research-document-metadata-admission-service/project-relations";

const metadata = admitResearchDocumentMetadata({ id: "relational-research", title: "Relational research", authors: ["Emsenn"] });
const relations = projectResearchDocumentRelations(metadata.value);
```
