# Research document metadata admission service

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

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

## Bidirectional citation-integrity assay

The existing `./audit-citations` export accepts an **explicit decoded research-document collection** and checks both original `cites_internal` and `cited_by_internal` claims. A forward link must have the corresponding inverse, and a reverse link must point to a real authoring source that actually cites the subject. Duplicate document ids are **ambiguous**, never silently resolved to the last input. Returned `invalid`, `broken`, `asymmetric`, `inverseBroken`, `inverseAsymmetric`, `duplicates`, and `ambiguous` readings preserve different evidence failures.

This is a source-graph integrity test, **not** a test that the cited study exists outside the supplied corpus, that any scientific claim is true, that the source has publication rights, or that a paper is world-class. The owning Science source selects the corpus and its research method; a downstream editor and reader independently receive any publication. Run `node --test test/research-citation-integrity.test.mjs` at the package's declared Node version before native receiving.

## Source-owned RO-Crate 1.3 projection

The original document metadata admission package now also exports a *pure research-object description* at `./ro-crate` for reproducible mathematical papers. It consumes the normal `admitResearchDocumentMetadata` result and an **explicit, measured file inventory**. No file IO, Markdown parsing, DOI issuance, editorial rights admission, web deployment, ActivityPub distribution, or independent delivery receipt is hidden inside the projection.

```js
import {admitResearchDocumentMetadata} from "@red-cup-engineering/research-document-metadata-admission-service";
import {projectAdmittedResearchRoCrate} from "@red-cup-engineering/research-document-metadata-admission-service/ro-crate";

const accepted = admitResearchDocumentMetadata({
  id: "feathers-fleets-farms",
  title: "Feathers, Fleets, and Farms: Fabricating FOAM with Finite Fibers",
  authors: ["emsenn"],
  document_type: "paper",
  date_created: "2026-10-20",
  status: "working",
});
const projected = projectAdmittedResearchRoCrate(accepted,{
  description: "Conditional finite-fleet capacity theorem and bounded reproducibility checks.",
  files: [{path:"manuscript.md",encodingFormat:"text/markdown",
    sha256:"a".repeat(64),contentSize:123}],
});
```

The repeated-`a` digest above is **only a documentation example**. A real caller must independently measure original bytes, associate the stable source revision with the inventory and verify that every listed file actually exists and matches its declared SHA-256. The exporter rejects unsafe paths, duplicate items, malformed digests, non-HTTPS source URLs, invalid document metadata and duplicate cited keys. A separate caller may use `projectResearchDocumentRoCrate(rawMetadata, options)` to invoke the native admission step automatically.

The output uses [RO-Crate 1.3](https://www.researchobject.org/ro-crate/specification/1.3/) descriptor, Dataset, File, Person and CreativeWork nodes. Published DOI, license, published date or public URL are **not fabricated**; only explicitly declared metadata is projected. A passing source test never asserts Science/editorial acceptance or an installed public publisher. This service provides reusable **research metadata**. For actual artifact creation reuse [Red Cup's Pandoc projector](https://github.com/red-cup-engineering/project-document-through-pandoc-service); public release and syndication remain with [Causeway Public Web](https://github.com/causeway-services/public-web-services-section/blob/main/sites/README.md).
