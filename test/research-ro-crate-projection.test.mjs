import test from 'node:test';
import assert from 'node:assert/strict';
import {admitResearchDocumentMetadata} from '../src/research-document-metadata.mjs';
import {projectAdmittedResearchRoCrate as project,projectResearchDocumentRoCrate as fromMetadata} from '../src/project-research-document-ro-crate.mjs';

const hash='a'.repeat(64), hash2='b'.repeat(64);
const paper={
  id:'feathers-fleets-farms',title:'Feathers, Fleets, and Farms: Fabricating FOAM with Finite Fibers',
  authors:['emsenn'],document_type:'paper',date_created:'2026-10-20',status:'working',
  cites_external:[{key:'hall',title:'Finite matching and capacities',authors:['P. Hall'],year:1935}],
};
const options={
  description:'A conditional finite-fleet capacity result and its bounded reproducibility assays',
  sourceUrl:'https://github.com/lenticule-science/obsmetrologia/blob/75d18256a988501146ed198188683ba7d344162b/docs/preprints/02-feathers-fleets-and-farms-finite-fibers.md',
  files:[
    {path:'manuscript.md',encodingFormat:'text/markdown',sha256:hash,contentSize:123},
    {path:'assays/fleet-farm-verification.json',encodingFormat:'application/json',sha256:hash2,contentSize:456},
  ],
};

test('native metadata admission produces a bounded RO-Crate 1.3 manuscript package',()=>{
  const r=fromMetadata(paper,options);
  assert.equal(r.ok,true);
  assert.equal(r.value['@context'],'https://w3id.org/ro/crate/1.3/context');
  const [descriptor,root,first,second,author,citation]=r.value['@graph'];
  assert.deepEqual(descriptor,{
    '@id':'ro-crate-metadata.json','@type':'CreativeWork',about:{'@id':'./'},
  });
  assert.equal(r.profileReadiness.rootFieldsReady,false);
  assert.deepEqual(r.profileReadiness.missingRootFields,['datePublished','license']);
  assert.equal(root['@id'],'./');
  assert.equal(root['@type'],'Dataset');
  assert.equal(root.name,paper.title);
  assert.equal(root.dateCreated,'2026-10-20');
  assert.equal(root.isBasedOn,options.sourceUrl);
  assert.deepEqual(root.hasPart,[{'@id':'manuscript.md'},{'@id':'assays/fleet-farm-verification.json'}]);
  assert.equal(first.sha256,hash);
  assert.equal(first.contentSize,'123');
  assert.equal(second.sha256,hash2);
  assert.deepEqual(root.author,[{'@id':'#author-1'}]);
  assert.equal(author.name,'emsenn');
  assert.equal(citation.name,'Finite matching and capacities');
  for(const key of ['datePublished','identifier','citationCount','acceptedBy','distributedAt']){
    assert.equal(root[key],undefined,'no release/authority claim: '+key);
  }
});
test('distinct licensed research note retains only explicitly declared fields',()=>{
  const m={id:'note-a',title:'Observation note',authors:[],status:'working',license:'https://creativecommons.org/licenses/by/4.0/'};
  const r=fromMetadata(m,{...options,sourceUrl:undefined});
  assert.equal(r.ok,true);
  assert.equal(r.value['@graph'][1].license,m.license);
  assert.equal(r.value['@graph'][1].isBasedOn,undefined);
  assert.equal(r.value['@graph'][1].author,undefined);
});
test('invalid document metadata cannot bypass original admission by forged ok flag',()=>{
  assert.equal(fromMetadata({id:'bad',title:''},options).ok,false);
  const fake={ok:true,value:{id:'bad',title:'',authors:['emsenn']}};
  assert.equal(project(fake,options).ok,false);
  const original=admitResearchDocumentMetadata({id:'bad',title:''});
  assert.equal(project(original,options),original);
});
test('unsafe / unmeasured payloads and unsupported public claims refuse',()=>{
  const valid=admitResearchDocumentMetadata(paper);
  for(const path of ['../private.txt','/etc/passwd','a//b','a/./b','a/../b','a\\b','ro-crate-metadata.json','a?x','a#x','a%2fb','bad\nname']){
    const r=project(valid,{...options,files:[{...options.files[0],path}]});
    assert.equal(r.ok,false,path);
  }
  for(const files of [[],[options.files[0],options.files[0]],
     [{...options.files[0],sha256:'ff'}],[{...options.files[0],contentSize:-1}]]){
    assert.equal(project(valid,{...options,files}).ok,false);
  }
  assert.equal(project(valid,{...options,sourceUrl:'http://example.org/x'}).ok,false);
  assert.equal(project(valid,{...options,sourceUrl:'https://u:p@example.org/x'}).ok,false);
  assert.equal(project(valid,{...options,description:''}).ok,false);
  assert.equal(fromMetadata({...paper,cites_external:[{key:'a',title:'X'},{key:'a',title:'Y'}]},options).ok,false);
});

test('unpublished research remains a byte-addressable candidate, not a falsely conformant crate',()=>{
  const r=fromMetadata(paper,options);
  assert.equal(r.ok,true);
  assert.equal(r.value['@graph'][0].conformsTo,undefined);
  assert.equal(r.value['@graph'][1].datePublished,undefined);
  assert.deepEqual(r.profileReadiness.missingRootFields,['datePublished','license']);
  const stillLicensed=fromMetadata({...paper,license:'Restricted; original community consent required'},options);
  assert.equal(stillLicensed.ok,true);
  assert.deepEqual(stillLicensed.profileReadiness.missingRootFields,['datePublished']);
  assert.equal(stillLicensed.value['@graph'][0].conformsTo,undefined);
});
test('explicit, civil-calendar-valid date and declared rights qualify only the source profile marker',()=>{
  const m={...paper,license:'Restricted: permission from original owner required'};
  for(const datePublished of ['2017','2024-02-29','2026-10-29T00:00:00Z']){
    const r=fromMetadata(m,{...options,datePublished});
    assert.equal(r.ok,true);
    assert.equal(r.profileReadiness.rootFieldsReady,true);
    assert.deepEqual(r.profileReadiness.missingRootFields,[]);
    assert.equal(r.value['@graph'][1].datePublished,datePublished);
    assert.deepEqual(r.value['@graph'][0].conformsTo,{'@id':'https://w3id.org/ro/crate/1.3'});
    assert.equal(r.value['@graph'][1].license,m.license);
    assert.match(r.profileReadiness.standing,/not independent profile validation/);
  }
  assert.equal(fromMetadata(paper,{...options,datePublished:'2026-10-29'}).value['@graph'][0].conformsTo,undefined);
});
test('invalid and retroactively fabricated source publication dates refuse instead of normalizing',()=>{
  for(const datePublished of ['2026-02-29','2026-02-30','2026-00-01',
    '2026-13-01','2026-10-00','2026-01-01T24:00:00Z','2026-01-01T00:00:60Z',
    'not-a-publication-date',null,4]){
    const r=fromMetadata({...paper,license:'Source rights declaration'}, {...options,datePublished});
    assert.equal(r.ok,false,String(datePublished));
    assert.equal(r.refusal.issues[0].path,'/datePublished');
  }
});

