import test from 'node:test';
import assert from 'node:assert/strict';
import {projectResearchDocumentRoCrate} from '../src/project-research-document-ro-crate.mjs';

const H='a'.repeat(64);
const metadata={id:'synthetic-instrument-01',title:'Synthetic physical instrument check',
  status:'working',document_type:'experiment',authors:[]};
const files=[
  {path:'settings.json',encodingFormat:'application/json',sha256:H,contentSize:140},
  {path:'observations.json',encodingFormat:'application/json',sha256:'b'.repeat(64),contentSize:270},
];
const sample=()=>({
  kind:'research.process-run/v1',
  id:'source-run-01',
  name:'Admitted bounded physical-model continuation',
  description:'Source-owned Holofoam operation in a declared synthetic trial; not a governance experiment',
  tool:{name:'Holofoam fork-compare',sourceUrl:'https://github.com/red-cup-engineering/holofoam/blob/1234567890123456789012345678901234567890/src/operations.mjs',version:'0.1.8'},
  agent:{name:'Authorized research executor (asserted; not independently verified)',type:'Organization'},
  startedAt:'2026-10-23T21:01:00-05:00',endedAt:'2026-10-23T21:02:00-05:00',
  status:'completed',inputs:['settings.json'],outputs:['observations.json'],
});
const call=(processRun)=>projectResearchDocumentRoCrate(metadata,{
  description:'Finite simulated instrument observations with exact inventoried payloads',
  files,processRun,
});

test('default paper RO-Crate remains unchanged and does not invent execution',()=>{
  const r=call(undefined);assert.equal(r.ok,true);
  assert.equal(r.value['@graph'].length,4);
  assert.equal(r.value['@graph'][1].mentions,undefined);
  assert.equal(r.value['@graph'][1].conformsTo,undefined);
});

test('one observed Process Run is linked from the original RO-Crate dataset',()=>{
  const r=call(sample());assert.equal(r.ok,true);
  assert.equal(r.value['@context'],'https://w3id.org/ro/crate/1.3/context');
  const entities=new Map(r.value['@graph'].map(e=>[e['@id'],e]));
  const root=entities.get('./');
  assert.deepEqual(root.conformsTo,{'@id':'https://w3id.org/ro/wfrun/process/0.6'});
  assert.deepEqual(root.mentions,[{'@id':'#run-source-run-01'}]);
  assert.deepEqual(entities.get('ro-crate-metadata.json').conformsTo,{'@id':'https://w3id.org/ro/crate/1.3'});
  const act=entities.get('#run-source-run-01');
  assert.equal(act['@type'],'CreateAction');
  assert.deepEqual(act.instrument,{'@id':'#run-tool'});
  assert.deepEqual(act.agent,{'@id':'#run-executor'});
  assert.deepEqual(act.object,[{'@id':'settings.json'}]);
  assert.deepEqual(act.result,[{'@id':'observations.json'}]);
  assert.deepEqual(act.actionStatus,{'@id':'https://schema.org/CompletedActionStatus'});
  assert.equal(entities.get('#run-tool').softwareVersion,'0.1.8');
  assert.equal(entities.get('#run-executor')['@type'],'Organization');
  assert.equal(entities.get('https://w3id.org/ro/wfrun/process/0.6')['@type'],'CreativeWork');
  assert.equal(root.datePublished,undefined);
  assert.equal(root.license,undefined);
  assert.equal(root.identifier,undefined);
});

test('failed process can preserve failure without manufacturing a result',()=>{
  const run={...sample(),status:'failed',error:'admitted bounded input rejected',outputs:[]};
  const r=call(run);assert.equal(r.ok,true);
  const act=r.value['@graph'].find(e=>e['@type']==='CreateAction');
  assert.equal(act.result,undefined);
  assert.equal(act.error,run.error);
  assert.deepEqual(act.actionStatus,{'@id':'https://schema.org/FailedActionStatus'});
});

test('a generated failed status cannot omit its actual error',()=>{
  const run={...sample(),status:'failed',outputs:[]};assert.equal(call(run).ok,false);
  assert.equal(call({...sample(),error:'not a failure'}).ok,false);
});

test('a process result cannot refer to unmeasured or duplicated files',()=>{
  assert.equal(call({...sample(),outputs:['invented.json']}).ok,false);
  assert.equal(call({...sample(),outputs:['observations.json','observations.json']}).ok,false);
  assert.equal(call({...sample(),inputs:['settings.json','settings.json']}).ok,false);
  assert.equal(call({...sample(),inputs:['settings.json','observations.json']}).ok,false);
  assert.equal(call({...sample(),outputs:['settings.json']}).ok,false);
});

test('unknown, unlocated or source-fabricated software cannot claim a process-run profile',()=>{
  const run=sample();
  assert.equal(call({...run,tool:{...run.tool,version:'unknown'}}).ok,false);
  assert.equal(call({...run,tool:{...run.tool,sourceUrl:'http://example.org/source.mjs'}}).ok,false);
  assert.equal(call({...run,tool:{...run.tool,sourceUrl:'https://name:password@example.org/x'}}).ok,false);
  assert.equal(call({...run,tool:{...run.tool,version:''}}).ok,false);
});

test('source evidence without measured execution clocks is not a Process Run',()=>{
  const run=sample();
  assert.equal(call({...run,startedAt:undefined}).ok,false);
  assert.equal(call({...run,endedAt:'October 23, 2026'}).ok,false);
  assert.equal(call({...run,endedAt:'2026-10-23T20:00:00-05:00'}).ok,false);
});

test('agent identity is source-declared, not automatically authenticated',()=>{
  const run=sample();
  assert.equal(call({...run,agent:{name:run.agent.name,type:'Office'}}).ok,false);
  assert.equal(call({...run,agent:{name:'',type:'Person'}}).ok,false);
  const r=call({...run,agent:{name:'Source contributor',type:'Person'}});
  assert.equal(r.ok,true);
  assert.equal(r.value['@graph'].find(e=>e['@id']==='#run-executor')['@type'],'Person');
});

test('unsupported process identity, status and shape cannot contaminate paper metadata',()=>{
  const run=sample();
  for(const id of ['../other','bad name','<script>','__proto__']) {
    if(id==='__proto__')continue;
    assert.equal(call({...run,id}).ok,false);
  }
  assert.equal(call({...run,status:'peer-reviewed'}).ok,false);
  assert.equal(call({...run,kind:'different-profile'}).ok,false);
  assert.equal(call(null).ok,false);
  assert.equal(call({...run,id:''}).ok,false);
});

test('calendar-invalid clock evidence is refused instead of normalized to another day',()=>{
  for(const bad of [
    '2026-02-29T12:00:00Z',
    '2026-02-30T12:00:00Z',
    '2026-06-31T12:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T00:60:00Z',
    '2026-01-01T00:00:60Z',
    '2026-01-01T12:00:00+25:00',
    '2026-01-01T12:00:00-05:60'
  ]) {
    const result=call({...sample(),startedAt:bad});
    assert.equal(result.ok,false,bad+' must not be admitted as run provenance');
    assert.equal(result.refusal.issues[0].path,'/processRun/time');
  }
  // A real Gregorian leap day with a valid offset remains admissible.
  const admitted=call({...sample(),startedAt:'2024-02-29T23:58:00-05:00',
    endedAt:'2024-03-01T00:00:00-05:00'});
  assert.equal(admitted.ok,true);
});
