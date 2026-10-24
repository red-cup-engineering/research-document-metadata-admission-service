import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectResearchDocumentRoCrate,verifyResearchRoCratePayloads as verify} from '../src/project-research-document-ro-crate.mjs';

const bytes=Buffer.from('{"seed":20261023,"model":"physical only"}\n','utf8');
const digest=value=>createHash('sha256').update(value).digest('hex');
const inventory=(content=bytes)=>[{
  path:'observed/preflight.json',encodingFormat:'application/json',
  sha256:digest(content),contentSize:content.byteLength,
}];
const make=(content=bytes)=>projectResearchDocumentRoCrate(
  {id:'observed-physical-model',title:'Source-witnessed physical-model observation',
    status:'exploratory',document_type:'experiment',date_created:'2026-10-23'},
  {description:'Instrument preflight evidence; no social/governance result or public rights claim',
   files:inventory(content)}
);
const payload=(content=bytes)=>[{path:'observed/preflight.json',bytes:content}];

test('real bytes are hashed, measured and received against original File identity',()=>{
  const r=verify(make(),payload());
  assert.equal(r.ok,true);
  assert.equal(r.kind,'research-ro-crate-byte-assay/v1');
  assert.deepEqual(r.failures,[]);
  assert.deepEqual(r.verifiedFiles,[{path:'observed/preflight.json',sha256:digest(bytes),bytes:bytes.byteLength}]);
  assert.equal(r.limit.includes('scientific claims'),true);
});

test('same-length bit change is caught even when metadata digest remains unchanged',()=>{
  const changed=Buffer.from(bytes);changed[2]^=1;
  assert.equal(changed.length,bytes.length);
  const r=verify(make(),payload(changed));
  assert.equal(r.ok,false);
  assert.equal(r.verifiedFiles.length,0);
  assert.ok(r.failures.some(f=>f.reason.includes('digest')));
});

test('wrong byte count and digest both remain visible',()=>{
  const r=verify(make(),payload(Buffer.concat([bytes,Buffer.from([1])])));
  assert.equal(r.ok,false);
  assert.ok(r.failures.some(f=>f.reason.includes('byte length')));
  assert.ok(r.failures.some(f=>f.reason.includes('digest')));
});

test('declared files are not verified by their own claimed checksum without bytes',()=>{
  const r=verify(make(),[]);
  assert.equal(r.ok,false);
  assert.ok(r.failures.some(f=>f.reason.includes('not supplied')));
});

test('unlisted bytes and duplicate payload identities are refused',()=>{
  const c=make();
  assert.equal(verify(c,[...payload(),{path:'extra.txt',bytes:Buffer.from('secret')}]).ok,false);
  assert.equal(verify(c,[...payload(),...payload()]).ok,false);
  assert.equal(verify(c,[{path:'../escape',bytes}]).ok,false);
});

test('plain strings, digest-only receipts and malformed byte carriers refuse',()=>{
  assert.equal(verify(make(),[{path:'observed/preflight.json',bytes:'same visible characters'}]).ok,false);
  assert.equal(verify(make(),[{path:'observed/preflight.json',sha256:digest(bytes)}]).ok,false);
  assert.equal(verify(make(),'not an inventory').ok,false);
});

test('binary and international text are byte-accurate, not character-length accurate',()=>{
  const v=Buffer.from([0,255,123,10]);
  const r=verify(make(v),payload(v));
  assert.equal(r.ok,true);
  const utf=Buffer.from('été 🌲\n','utf8');
  assert.equal(verify(make(utf),payload(utf)).ok,true);
  assert.equal(utf.length>4,true);
});

test('original projection refusal is not overwritten by an attractive integrity claim',()=>{
  const r=make();
  const refused={ok:false,refusal:{code:'not-admitted',issues:[]}};
  assert.equal(verify(refused,payload()).ok,false);
  assert.equal(verify({ '@context':r.value['@context'], '@graph':null},payload()).ok,false);
});

test('duplicate graph identities and missing data entities refuse metadata laundering',()=>{
  const valid=make().value;
  const duplicate={...valid,'@graph':[...valid['@graph'],valid['@graph'][2]]};
  assert.equal(verify(duplicate,payload()).ok,false);
  const missing={...valid,'@graph':valid['@graph'].filter(e=>e['@id']!=='observed/preflight.json')};
  assert.equal(verify(missing,payload()).ok,false);
});

test('crate with a run profile still needs byte evidence; a run declaration is not verification',()=>{
  const original=make().value;
  const contextual={...original,'@graph':original['@graph'].concat([{'@id':'#run-1','@type':'CreateAction',name:'claimed run'}])};
  assert.equal(verify(contextual,payload()).ok,true);
  assert.equal(verify(contextual,[]).ok,false);
});

test('all source payload file receipts must match; one good file cannot hide one corrupt file',()=>{
  const second=Buffer.from('another real input');
  const base=make().value;
  const root=base['@graph'][1];
  const newFile={'@id':'config.json','@type':'File',encodingFormat:'application/json',sha256:digest(second),contentSize:String(second.length)};
  const expanded={...base,'@graph':[base['@graph'][0],{...root,hasPart:[...root.hasPart,{'@id':'config.json'}]},...base['@graph'].slice(2),newFile]};
  const r=verify(expanded,[...payload(),{path:'config.json',bytes:Buffer.from('another bad input')}]);
  assert.equal(r.ok,false);
  assert.equal(r.verifiedFiles.length,1);
  assert.ok(r.failures.some(f=>f.path.includes('config.json')));
});
