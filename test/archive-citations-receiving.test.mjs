import test from "node:test";
import assert from "node:assert/strict";
import { baseResearchCitationKey, proposeResearchCitationKey } from "../src/research-citation-key.mjs";
import { renderResearchDocumentBibtex } from "../src/research-document-bibtex.mjs";
const citation=(key,title="Remarks on eigenvalues")=>({key,title,authors:["V. I. Arnold"],year:1995,doi:"10.1000/xyz",extra:{type:"article",arxiv:"math/0501001"}});
test("archival Better BibTeX key examples survive in the Engineering owner",()=>{
  assert.equal(proposeResearchCitationKey({authors:["V. I. Arnold"],year:1995,title:"Hermitian stratification"}),"arnold1995hermitian");
  assert.equal(proposeResearchCitationKey({authors:["van der Waerden, Bartel"],year:1927,title:"Beweis"}),"vanderwaerden1927beweis");
  assert.equal(proposeResearchCitationKey({authors:["Bik","Draisma"],year:2020,title:"Euclidean distance"}),"bik2020euclidean");
  assert.equal(proposeResearchCitationKey({authors:["René Descartes"],year:1641,title:"On the mind"}),"descartes1641mind");
  assert.equal(proposeResearchCitationKey({authors:[],year:2024,title:""}),"misc2024");
  assert.equal(proposeResearchCitationKey(),"untitled");
});
test("collision suffixes carry the original a-z, aa algorithm",()=>{
  const original="arnold1995remarks";
  assert.equal(proposeResearchCitationKey({authors:["Arnold, V."],year:1995,title:"Remarks",existing:[original]}),original+"a");
  const occupied=new Set([original,...Array.from({length:26},(_,i)=>original+String.fromCharCode(97+i))]);
  assert.equal(proposeResearchCitationKey({authors:["Arnold, V."],year:1995,title:"Remarks",existing:occupied}),original+"aa");
  assert.throws(()=>proposeResearchCitationKey({authors:"not-array"}),TypeError);
});
test("source-owned document admission feeds the BibTeX renderer",()=>{
  const doc={id:"paper-one",title:"Our paper",cites_external:[citation("arnold1995remarks")]};
  const out=renderResearchDocumentBibtex([doc]);
  assert.match(out,/@article\{arnold1995remarks,/u);
  assert.match(out,/author = \{Arnold, V\. I\.\}/u);
  assert.match(out,/eprinttype = \{arxiv\}/u);
  assert.match(out,/doi = \{10\.1000\/xyz\}/u);
  assert.equal(renderResearchDocumentBibtex([doc,doc]),out);
  assert.throws(()=>renderResearchDocumentBibtex([doc,{id:"paper-two",title:"Another paper",cites_external:[citation("arnold1995remarks","Different work")]}]),/conflicting declarations/u);
});
test("invalid entries and untrusted BibTeX fields fail closed",()=>{
  assert.throws(()=>renderResearchDocumentBibtex([{id:"doc",title:"A",cites_external:[{title:"missing key"}]}]),/metadata refused/u);
  assert.throws(()=>renderResearchDocumentBibtex([{id:"doc",title:"A",cites_external:[{...citation("x"),extra:{type:"article","bad key":"value"}}]}]),/invalid BibTeX/u);
  assert.throws(()=>renderResearchDocumentBibtex([{id:"doc",title:"A",cites_external:[{...citation("x"),extra:{type:"article",note:"broken { brace"}}]}]),/unbalanced/u);
});
