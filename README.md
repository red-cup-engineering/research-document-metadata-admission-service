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

## Recovered citation export capabilities

The archive's citation-key generator and BibTeX renderer, previously trapped in
`emsenn/emsenn-archive-code` at commit `3c69d5cf9d3bec484f1dc22067ed9623b1bab7c6`, are now
native functions here: `./citation-key` and `./bibtex`.
The original source file Git blob IDs are `c1dd943e17ccd4af52fb8e0621065eb67860eaf7`
(citekey.py) and `ccf528bb52ca91b5f7a57c49bc08c32eba7d8074` (bibtex.py). The adaptation
reuses this owner's already-admitted metadata records, rather than importing
a second YAML corpus loader or ownership registry.

Keys are *proposals*; callers decide whether to adopt them. BibTeX is only a
deterministic projection from explicit external citation records: identical
repeated references are deduplicated, conflicting uses of one key refuse, and
malformed/unsafe fields refuse rather than silently inventing truth. No
publication, experimental conclusion or installed authoring workflow is
implied by source qualification.

