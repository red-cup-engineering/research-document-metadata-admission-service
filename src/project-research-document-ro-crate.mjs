/**
 * A pure RO-Crate 1.3 JSON-LD projection of metadata admitted by the owning
 * research-document metadata service. Sources and SHA-256 values are supplied
 * by the caller as measured receipts, not manufactured or verified here.
 * No DOI, publication, rights approval or ActivityPub delivery is inferred.
 * Specification: https://www.researchobject.org/ro-crate/specification/1.3/
 */
import { admitResearchDocumentMetadata } from './research-document-metadata.mjs';

const PROFILE='https://w3id.org/ro/crate/1.3';
const PROCESS_PROFILE='https://w3id.org/ro/wfrun/process/0.6';
const CONTEXT=PROFILE+'/context';
const HASH=/^[a-f0-9]{64}$/u;
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const named=x=>typeof x==='string'&&x.trim().length>0;
const ref=id=>Object.freeze({'@id':id});
const refuse=(path,message)=>Object.freeze({ok:false,refusal:Object.freeze({
  code:'invalid-research-ro-crate-projection',
  issues:Object.freeze([Object.freeze({path,message})]),
})});
const safePath=p=>named(p)&&!p.startsWith('/')&&!p.includes('\\')&&
  !/[?#%\u0000-\u001f]/u.test(p)&&p!=='ro-crate-metadata.json'&&
  p.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
function httpsUrl(value){
  if(!named(value))return false;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&u.href===value;}
  catch{return false;}
}

/** Project actual supplied computational process evidence into the Process Run Crate
 * 0.6 profile without executing or authenticating a source claim. All run inputs
 * and results refer to separately inventoried payloads in this same crate.
 */
function projectProcessRun(run,knownPaths){
  if(!isRecord(run)||run.kind!=='research.process-run/v1')return refuse('/processRun/kind','expected the research process-run evidence profile');
  if(!named(run.id)||! /^[a-z0-9][a-z0-9._-]{0,127}$/u.test(run.id))return refuse('/processRun/id','run id must be a bounded local identifier');
  if(!named(run.name)||!named(run.description))return refuse('/processRun/name','a named, described execution is required');
  const input=isRecord(run.tool)?run.tool:{};
  if(!named(input.name)||!httpsUrl(input.sourceUrl)||!named(input.version)||/^(unknown|unverified|tbd)$/iu.test(input.version))return refuse('/processRun/tool','real source locator and declared software version are required');
  const agent=isRecord(run.agent)?run.agent:{};
  if(!named(agent.name)||!['Person','Organization'].includes(agent.type))return refuse('/processRun/agent','identify an actual declared executor and its type');
  const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;
  const instant=x=>named(x)&&iso.test(x)&&Number.isFinite(Date.parse(x));
  if(!instant(run.startedAt)||!instant(run.endedAt)||Date.parse(run.endedAt)<Date.parse(run.startedAt))return refuse('/processRun/time','source-observed run start/end timestamps with offsets are required');
  if(!['completed','failed'].includes(run.status))return refuse('/processRun/status','execution disposition must be completed or failed');
  if(run.status==='failed'&&!named(run.error))return refuse('/processRun/error','a failed execution needs its observed error');
  if(run.status==='completed'&&run.error!==undefined)return refuse('/processRun/error','completed execution cannot claim a failure error');
  const validFileRefs=(list,empty)=>Array.isArray(list)&&(empty||list.length>0)&&new Set(list).size===list.length&&list.every(p=>typeof p==='string'&&knownPaths.has(p));
  if(!validFileRefs(run.inputs,true))return refuse('/processRun/inputs','all run inputs must be unique, measured crate payloads');
  if(!validFileRefs(run.outputs,run.status==='failed'))return refuse('/processRun/outputs','all run outputs must be unique, measured crate payloads');
  if(run.inputs.some(p=>run.outputs.includes(p)))return refuse('/processRun/outputs','CreateAction cannot claim to create its input payload in place');
  const runId='#run-'+run.id,toolId='#run-tool',agentId='#run-executor';
  return Object.freeze({ok:true,entities:Object.freeze([
    Object.freeze({'@id':PROCESS_PROFILE,'@type':'CreativeWork',name:'Process Run Crate profile 0.6'}),
    Object.freeze({'@id':toolId,'@type':'SoftwareApplication',name:input.name,url:input.sourceUrl,softwareVersion:input.version}),
    Object.freeze({'@id':agentId,'@type':agent.type,name:agent.name}),
    Object.freeze({'@id':runId,'@type':'CreateAction',name:run.name,description:run.description,
      startTime:run.startedAt,endTime:run.endedAt,
      instrument:ref(toolId),agent:ref(agentId),
      ...(run.inputs.length?{object:run.inputs.map(ref)}:{}),
      ...(run.outputs.length?{result:run.outputs.map(ref)}:{}),
      actionStatus:ref(run.status==='completed'?'https://schema.org/CompletedActionStatus':'https://schema.org/FailedActionStatus'),
      ...(run.status==='failed'?{error:run.error}:{}),
    }),
  ]),runId});
}

/**
 * @param {object} admitted - The output of admitResearchDocumentMetadata.
 * @param {object} options - An explicit byte-measured payload inventory.
 * File hash syntax is checked; the digest's correspondence to bytes and
 * the legality/authority of publication require independent receivers.
 */
export function projectAdmittedResearchRoCrate(admitted,{files,description,sourceUrl,processRun}={}){
  if(!isRecord(admitted)||admitted.ok!==true||!isRecord(admitted.value)){
    return admitted?.ok===false&&admitted.refusal?admitted:refuse('/admitted','original research metadata admission is required');
  }
  const record=admitted.value;
  // Re-admit the purported value rather than trusting a caller-supplied ok flag.
  const checked=admitResearchDocumentMetadata(record);
  if(!checked.ok)return checked;
  const m=checked.value;
  if(!named(description))return refuse('/description','substantive description is required');
  if(!Array.isArray(files)||files.length===0)return refuse('/files','nonempty measured payload inventory is required');
  if(sourceUrl!==undefined&&!httpsUrl(sourceUrl))return refuse('/sourceUrl','source URL must be an exact absolute HTTPS URL');
  const seen=new Set();
  for(let i=0;i<files.length;i++){
    const f=files[i];
    if(!isRecord(f))return refuse('/files/'+i,'file receipt must be an object');
    if(!safePath(f.path))return refuse('/files/'+i+'/path','unsafe or duplicate-reserved relative path');
    if(seen.has(f.path))return refuse('/files/'+i+'/path','duplicate payload path');
    seen.add(f.path);
    if(!HASH.test(f.sha256??''))return refuse('/files/'+i+'/sha256','SHA-256 must be 64 lowercase hex characters');
    if(!named(f.encodingFormat)||!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu.test(f.encodingFormat)){
      return refuse('/files/'+i+'/encodingFormat','encodingFormat must be a declared media type');
    }
    if(f.contentSize!==undefined&&(!Number.isSafeInteger(f.contentSize)||f.contentSize<0)){
      return refuse('/files/'+i+'/contentSize','contentSize must be a nonnegative safe integer');
    }
  }
  const cited=m.cites_external??[];
  const citationsSeen=new Set();
  for(let i=0;i<cited.length;i++){
    const v=cited[i];
    if(!isRecord(v)||!named(v.key)||!named(v.title))return refuse('/cites_external/'+i,'citation needs key and title');
    if(citationsSeen.has(v.key))return refuse('/cites_external/'+i+'/key','citation key collision');
    citationsSeen.add(v.key);
  }
  const execution=processRun===undefined?null:projectProcessRun(processRun,seen);
  if(execution!==null&&!execution.ok)return execution;
  const authors=m.authors.map((name,i)=>Object.freeze({'@id':'#author-'+(i+1),'@type':'Person',name}));
  const citations=cited.map((source,i)=>Object.freeze({
    '@id':'#citation-'+(i+1),'@type':'CreativeWork',name:source.title,
    ...(named(source.doi)?{identifier:'doi:'+source.doi}:{}),
    ...(named(source.url)&&httpsUrl(source.url)?{url:source.url}:{}),
  }));
  const payload=files.map(f=>Object.freeze({
    '@id':f.path,'@type':'File',encodingFormat:f.encodingFormat,sha256:f.sha256,
    ...(f.contentSize===undefined?{}:{contentSize:String(f.contentSize)}),
  }));
  const root=Object.freeze({
    '@id':'./','@type':'Dataset',name:m.title,description,
    ...(named(m.date_created)?{dateCreated:m.date_created}:{}),
    ...(named(m.date_modified)?{dateModified:m.date_modified}:{}),
    ...(named(m.license)?{license:m.license}:{}),
    ...(sourceUrl?{isBasedOn:sourceUrl}:{}),
    ...(authors.length?{author:authors.map(a=>ref(a['@id']))}:{}),
    ...(citations.length?{citation:citations.map(a=>ref(a['@id']))}:{}),
    hasPart:payload.map(f=>ref(f['@id'])),
    ...(execution?{conformsTo:ref(PROCESS_PROFILE),mentions:[ref(execution.runId)]}:{}),
  });
  const descriptor=Object.freeze({
    '@id':'ro-crate-metadata.json','@type':'CreativeWork',
    conformsTo:ref(PROFILE),about:ref('./'),
  });
  return Object.freeze({ok:true,value:Object.freeze({
    '@context':CONTEXT,
    '@graph':Object.freeze([descriptor,root,...payload,...authors,...citations,...(execution?execution.entities:[])]),
  })});
}

/** Convenience entry for decoded document metadata; owns no carrier parser. */
export function projectResearchDocumentRoCrate(metadata, options={}){
  return projectAdmittedResearchRoCrate(admitResearchDocumentMetadata(metadata),options);
}
