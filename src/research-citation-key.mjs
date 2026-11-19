/**
 * Research citation keys recovered from emsenn-archive-code
 * research-tools/research/citations/research-citations/src/research_citations/citekey.py
 * at 3c69d5cf9d3bec484f1dc22067ed9623b1bab7c6.
 * Native JS adaptation of the original source, not a second bibliography registry.
 */
const STOP = new Set([
  "a","an","the","and","or","but","for","nor","so","yet","of","in","on","at",
  "to","from","by","with","about","as","is","are","was","were","be",
  "been","being","this","that","these","those","some","any","no","via",
  "using","n","non"
]);
function ascii(value) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/[^\x00-\x7F]/gu, "").replace(/[^A-Za-z0-9]/gu,"").toLowerCase();
}
function lastname(author) {
  const name = author.trim();
  if (name.includes(",")) return name.split(",",1)[0].trim();
  const words = name.split(/\s+/u).filter(Boolean);
  while (words.length > 1 && /^[A-Z]\.?$/u.test(words.at(-1))) words.pop();
  return words.at(-1) ?? "";
}
function shorttitle(title) {
  const words = title.match(/[A-Za-z][A-Za-z0-9'-]*/gu) ?? [];
  return ascii(words.find(word => !STOP.has(word.toLowerCase())) ?? words[0] ?? "").slice(0,12);
}
function yearPart(year) {
  if (year === null || year === undefined) return "";
  if (typeof year !== "string" && !Number.isSafeInteger(year)) throw new TypeError("year must be an integer or string");
  return ascii(String(year).trim()).slice(0,4);
}
export function baseResearchCitationKey({authors=[],year=null,title=""}={}) {
  if (authors !== null && (!Array.isArray(authors) || authors.some(x=>typeof x!=="string")))
    throw new TypeError("authors must be an array of names or null");
  if (title !== null && typeof title !== "string") throw new TypeError("title must be a string or null");
  const first = authors?.find(Boolean) ?? "";
  const surname = first ? ascii(lastname(first)) : "";
  const word = shorttitle(title ?? "");
  return surname || word ? surname + yearPart(year) + word : "";
}
function suffix(n) {
  let result="";
  do { result=String.fromCharCode(97+n%26)+result; n=Math.floor(n/26)-1; }
  while (n>=0);
  return result;
}
/** Propose an unambiguous key. The caller owns adoption; no source is rewritten. */
export function proposeResearchCitationKey({authors=[],year=null,title="",existing=[]}={}) {
  if (!(existing instanceof Set) && !Array.isArray(existing))
    throw new TypeError("existing keys must be a Set or array");
  if ([...existing].some(x=>typeof x!=="string")) throw new TypeError("existing keys must be strings");
  const base=baseResearchCitationKey({authors,year,title}) || ("misc"+yearPart(year) || "untitled");
  const selected=base==="misc" ? "untitled" : base;
  const used=new Set(existing);
  if (!used.has(selected)) return selected;
  for(let n=0;n<100000;n++){ const candidate=selected+suffix(n); if(!used.has(candidate))return candidate; }
  throw new RangeError("too many citation-key collisions");
}
