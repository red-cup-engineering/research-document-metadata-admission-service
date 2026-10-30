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

## Verify actual research-object payloads

The **same** `./ro-crate` entrypoint now exports `verifyResearchRoCratePayloads(projected, payloads)`. The receiving executor supplies the exact `Uint8Array` or Node `Buffer` bytes it actually read for **every** inventoried `File`, or a sequence of such byte chunks that can be hashed incrementally without concatenating a large research payload. Both forms use the same relative `path` appearing in the research-object root `hasPart`. The function computes **SHA-256** using Node's native cryptography and compares the real byte length and digest against the original source-declared receipt. It refuses missing, extra, duplicated, unsafe or malformed payload paths, absent metadata entities, duplicate graph identities, malformed receipt digests/sizes, and corrupted actual bytes. It preserves precisely which files passed and which source constraints failed; it never silently converts a failed assay into a released artifact.

```js
import {verifyResearchRoCratePayloads} from "@red-cup-engineering/research-document-metadata-admission-service/ro-crate";

const check = verifyResearchRoCratePayloads(projected, [
  {path:"observations.json",bytes:Buffer.from(actualObservedFileBytes)},
]);
// Or, for a large payload supplied as chunks:
// {path:"observations.json",chunks:[firstObservedBytes,secondObservedBytes]}
```

The caller is responsible for obtaining `actualObservedFileBytes` from a **source-qualified and rights-admitted real file**. The code above is a **contract illustration**, not a fabricated observation. A declared SHA-256 field, a plausible Git blob ID, or a passing JSON-LD shape check does **not** establish that the underlying payload exists, has the claimed exact bytes, or can be publicly fetched. This operation checks only **supplied content integrity**. It does not authenticate the origin/provider, authorize public reuse, verify code execution, certify a scientific claim, mint a DOI or constitute independent scholarly replication. The Coesite Research Operations receiver and Causeway publisher still own those effects.

## Executed process provenance through the same RO-Crate owner

For an **actually observed computational operation** the existing `./ro-crate` projection may now receive an optional `processRun` alongside the existing explicit byte-measured `files`. It projects a [Process Run Crate 0.6](https://www.researchobject.org/workflow-run-crate/profiles/process_run_crate/) `CreateAction` linked to the original root Dataset, an explicitly named `SoftwareApplication`, its declared executor, inventoried inputs and inventoried outputs. The standard profile extends [RO-Crate 1.3](https://www.researchobject.org/ro-crate/specification/1.3/); no second paper registry or run executor is created. Omitting `processRun` leaves ordinary research-paper projections unchanged.

**Required evidence from Coesite or another real research executor:** a source-revision-bound instrument with a declared version and exact HTTPS source, observed start/end timestamps with timezone, method/run identity, an explicit completed or failed state, and actual separately inventoried input/result payloads. The exporter rejects an unobserved timestamp, an unknown instrument version, nonexistent input/output file references, duplicated paths, a `CreateAction` that claims to create its own input in place, an invented success state and failure records without an error. A failure **may** have no results; the recorded process history must not be erased just because the experiment failed.

```js
import {projectResearchDocumentRoCrate} from "@red-cup-engineering/research-document-metadata-admission-service/ro-crate";

const crate = projectResearchDocumentRoCrate(
  {id:"method-bench",title:"Instrument bench",status:"working",document_type:"experiment"},
  {description:"Reproducible source-bound synthetic instrument method, not a verified publication",
    files:[
      {path:"settings.json",encodingFormat:"application/json",sha256:"a".repeat(64),contentSize:40},
      {path:"observations.json",encodingFormat:"application/json",sha256:"b".repeat(64),contentSize:90}
    ],
    processRun:{
      kind:"research.process-run/v1",id:"example-001",name:"Bounded model observation",
      description:"Synthetic documentation fixture; no actual execution or authorship claims",
      tool:{name:"Example engine",sourceUrl:"https://example.org/source/one",version:"1.0.0"},
      agent:{type:"Organization",name:"Example executor"},
      startedAt:"2026-10-23T20:00:00Z",endedAt:"2026-10-23T20:01:00Z",
      status:"completed",inputs:["settings.json"],outputs:["observations.json"]
    }
  }
);
```

The repeated `a`/`b` digests, timestamps and example version above are **invented code-fixture values**, never scientific observations, a package/version attestation, authorized authorship or public research. Consumers must independently read artifact bytes, obtain true run-source and installed-version receipts, compare results and validate RO-Crate syntax/graph requirements. This projection does not reproduce a run, sign an execution, grant release rights, discover a DOI or attest to an independent researcher.

**Observed first blocked receiver:** the source-owning Coesite [Holofoam four-seed preflight](https://github.com/coesite-operations/operations-services-section/blob/main/services/research-operations-services-section/data/records/2026-10-23-holofoam-v4-instrument-preflight.json) has useful content-addressed physical-model histories and negative controls. Its record **does not have authenticated exact execution clocks or an independently observed installed instrument version**, and it has no separately inventoried input and output payload files. It must therefore **not** be silently promoted to a compliant Process Run Crate. Preserve that authentic, limited source record and improve *upstream native experiment receipts* before using this profile for live study publication. Governance Science's `Empty Overseer` remains an unrun separate institutional experiment.

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

The output uses the original [RO-Crate 1.3](https://www.researchobject.org/ro-crate/specification/1.3/) JSON-LD context and Dataset, File, Person and CreativeWork vocabulary. **Its versioned `conformsTo` assertion is conditional.** RO-Crate 1.3 requires a root Dataset `datePublished` and `license`; an intentionally unlicensed/undated draft instead remains a source-addressed **research-object candidate**, with no false profile declaration. The original projector accepts an *explicit* `options.datePublished` only when it is a calendar-valid ISO 8601 date or offset-qualified timestamp. It never guesses a publication day from `date_created`, `date_modified`, manuscript `status`, or an experiment clock. Source metadata must also explicitly declare a `license` (including an accurate restricted-use text); a license statement **does not grant rights**. `profileReadiness` distinguishes missing root metadata from source-declared, locally eligible profile markers. Local source syntax is not an external RO-Crate validator, source authentication, publication or legal consent.

The existing `verifyResearchRoCratePayloads` independently accepts an exact-byte candidate **without** a 1.3 profile claim, but refuses a descriptor or Process Run profile marker if mandatory root fields are missing. It still verifies only actual supplied bytes and preserved file identities; it must not promote a passing byte assay into a standards or publication certificate.

The output uses [RO-Crate 1.3](https://www.researchobject.org/ro-crate/specification/1.3/) descriptor, Dataset, File, Person and CreativeWork nodes. Published DOI, license, published date or public URL are **not fabricated**; only explicitly declared metadata is projected. A passing source test never asserts Science/editorial acceptance or an installed public publisher. This service provides reusable **research metadata**. For actual artifact creation reuse [Red Cup's Pandoc projector](https://github.com/red-cup-engineering/project-document-through-pandoc-service); public release and syndication remain with [Causeway Public Web](https://github.com/causeway-services/public-web-services-section/blob/main/sites/README.md).
