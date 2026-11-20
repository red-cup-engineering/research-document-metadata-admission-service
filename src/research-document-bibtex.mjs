/**
 * BibTeX projection recovered from emsenn-archive-code research-citations/bibtex.py
 * at 3c69d5cf9d3bec484f1dc22067ed9623b1bab7c6.
 * Consumes the existing admitted research-document metadata; never parses Markdown.
 */
import { admitResearchDocumentMetadata } from "./research-document-metadata.mjs";
const TYPES=new Set(["article","book","booklet","inbook","incollection","inproceedings","manual",
  "mastersthesis","phdthesis","thesis","misc","proceedings","techreport","report","unpublished",
  "online","software","dataset","patent","inreference"]);
const FIELDS=new Set(["subtitle","shorttitle","month","date","journal","booktitle","series","edition",
  "volume","number","pages","publisher","address","institution","organization","school",
  "howpublished","note","isbn","issn","urldate","eprint","eprinttype","eprintclass",
  "archiveprefix","primaryclass","abstract","keywords"]);
const KEY=/^[A-Za-z0-9_.:+-]+$/u, FIELD=/^[a-z][a-z0-9]*$/u;
function atom(value){
  if(typeof value!=="string"&&typeof value!=="number") throw new TypeError("BibTeX values must be strings or numbers");
  const text=String(value).trim();
  if(/[\r\n]/u.test(text)) throw new TypeError("multiline BibTeX field rejected");
  let balance=0;
  for(const ch of text) { if(ch==="{")balance++;else if(ch==="}")balance--;if(balance<0)throw new TypeError("unbalanced BibTeX braces"); }
  if(balance!==0)throw new TypeError("unbalanced BibTeX braces");
  return text;
}
function name(value) {
  const words=atom(value).split(/\s+/u).filter(Boolean);
  if(words.length<2||value.includes(","))return atom(value);
  return words.at(-1)+", "+words.slice(0,-1).join(" ");
}
function names(xs){if(!Array.isArray(xs)||xs.some(x=>typeof x!=="string"))throw new TypeError("name list must be strings");return xs.filter(Boolean).map(name).join(" and ");}
function sortedFields(citation){
  const fields=new Map();
  const add=(key,value)=>{if(value!==null&&value!==undefined&&String(value).trim()!=="")fields.set(key,atom(value));};
  add("title",citation.title);
  if(citation.authors.length) add("author",names(citation.authors));
  add("year",citation.year);
  add("doi",citation.doi);
  add("url",citation.url);
  if(citation.venue) add(/\d/u.test(citation.venue)?"journal":"booktitle",citation.venue);
  const extra=citation.extra ?? {};
  for(const [key,value] of Object.entries(extra)){
    if(key==="type"||key==="venue"||key==="translators"||key==="arxiv")continue;
    if(!FIELD.test(key))throw new TypeError("invalid BibTeX extra field name");
    if(value===null||value===undefined||typeof value==="boolean")continue;
    if(!FIELDS.has(key))throw new TypeError("unadmitted BibTeX extra field "+key);
    if(!fields.has(key))add(key,value);
  }
  if(extra.arxiv&&!fields.has("eprint")){add("eprint",extra.arxiv);add("eprinttype","arxiv");}
  if(extra.translators!==undefined){
    const translators=Array.isArray(extra.translators)?extra.translators:[extra.translators];
    const suffix="trans. "+names(translators);
    add("note",fields.get("note")?fields.get("note")+"; "+suffix:suffix);
  }
  return fields;
}
function one(citation){
  if(!KEY.test(citation.key))throw new TypeError("BibTeX key is invalid");
  const type=citation.extra?.type ?? "misc";
  if(!TYPES.has(type))throw new TypeError("unsupported BibTeX type");
  const lines=["@"+type+"{"+citation.key+","];
  const fields=sortedFields(citation);
  for(const [key,val] of [...fields.entries()].sort(([a],[b])=>a.localeCompare(b)))lines.push("  "+key+" = {"+val+"},");
  if(lines.length>1)lines[lines.length-1]=lines.at(-1).slice(0,-1);
  return lines.join("\n")+"\n}\n";
}
function fingerprint(c){
  const f=sortedFields(c);
  return JSON.stringify([c.extra?.type??"misc",[...f].sort(([a],[b])=>a.localeCompare(b))]);
}
/** One deterministic BibTeX projection of an explicit set of document records. */
export function renderResearchDocumentBibtex(records){
  if(!Array.isArray(records))throw new TypeError("records must be an array");
  const cited=new Map();
  for(const record of records){
    const admiss=admitResearchDocumentMetadata(record);
    if(!admiss.ok)throw new TypeError("research document metadata refused");
    for(const citation of admiss.value.cites_external){
      const prev=cited.get(citation.key);
      if(prev && fingerprint(prev)!==fingerprint(citation))
        throw new TypeError("conflicting declarations of citation key "+citation.key);
      if(!prev)cited.set(citation.key,citation);
    }
  }
  const keys=[...cited.keys()].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase())||a.localeCompare(b));
  return "% Derived from admitted research-document citation metadata; do not edit by hand.\n\n"+
    keys.map(key=>one(cited.get(key))).join("\n");
}
