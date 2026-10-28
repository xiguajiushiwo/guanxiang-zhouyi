import hexagrams from './hexagram-catalog.mjs';

const clean=(value,max=1200)=>typeof value==='string'?value.trim().slice(0,max):'';
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=120;
const stamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():'';
export const CASE_CANDIDATE_LIMIT=40,CASE_READING_LIMIT=6;

export function normalizeConnections(values,ownerId=''){
  const merged=new Map();
  for(const item of Array.isArray(values)?values:[]){
    if(!validId(item?.id)||item.id===ownerId||!stamp(item.updatedAt))continue;
    const next={id:item.id,kind:['followup','manual','ai'].includes(item.kind)?item.kind:'ai',reason:clean(item.reason,500),updatedAt:stamp(item.updatedAt),removed:item.removed===true};
    const old=merged.get(next.id);
    if(!old||next.updatedAt>old.updatedAt||next.updatedAt===old.updatedAt&&next.removed)merged.set(next.id,next);
  }
  return [...merged.values()];
}
export function relatedReadings(record,records){
  const byId=new Map(records.map(item=>[item.id,item])),edges=new Map(),blocked=new Set();
  for(const item of records)for(const link of normalizeConnections(item.connections,item.id)){
    const key=[item.id,link.id].sort().join('\u0000');
    const old=edges.get(key);if(!old||link.updatedAt>old.updatedAt||link.updatedAt===old.updatedAt&&link.removed)edges.set(key,{...link,from:item.id});
    if(link.removed&&(item.id===record.id||link.id===record.id))blocked.add(item.id===record.id?link.id:item.id);
  }
  // A newer explicit relink supersedes a previous removal.
  for(const edge of edges.values())if(!edge.removed&&(edge.from===record.id||edge.id===record.id))blocked.delete(edge.from===record.id?edge.id:edge.from);
  const found=new Set([record.id]),queue=[record.id];
  while(queue.length){const id=queue.shift();for(const edge of edges.values()){
    if(edge.removed)continue;const next=edge.from===id?edge.id:edge.id===id?edge.from:null;
    if(next&&byId.has(next)&&!found.has(next)&&!blocked.has(next)){found.add(next);queue.push(next)}
  }}
  return records.filter(item=>found.has(item.id)).sort((a,b)=>(a.completedAt||a.createdAt||'').localeCompare(b.completedAt||b.createdAt||''));
}
function excerpt(record){
  const versions=[...(record.aiReadings||[]),record.aiReading].filter(item=>item?.text).sort((a,b)=>String(a.generatedAt).localeCompare(String(b.generatedAt)));
  return {id:record.id,question:clean(record.question,100),createdAt:stamp(record.completedAt||record.createdAt),
    originalIndex:record.originalIndex,changedIndex:record.changedIndex,moving:record.lines.map((line,index)=>[6,9].includes(line.value)?index+1:0).filter(Boolean),
    firstReading:clean(versions[0]?.text||record.localReadingSnapshot?.reading?.summary,700),latestReading:clean(versions.at(-1)?.text,700),
    developments:clean((record.journal?.entries||[]).slice(-3).map(entry=>[entry.createdAt,entry.facts,entry.actions,entry.assessment,entry.nextStep].filter(Boolean).join(' · ')).join('\n'),400),note:clean(record.note,200)};
}
export function buildConnectionPayload(record,records,language='zh-CN'){
  const candidates=records.filter(item=>item.id!==record.id).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,CASE_CANDIDATE_LIMIT)
    .map(item=>({id:item.id,question:clean(item.question,100),createdAt:stamp(item.completedAt||item.createdAt)}));
  return {version:1,task:'journal-links',language,current:{id:record.id,question:clean(record.question,100)},candidates};
}
export function buildCaseReviewPayload(record,records,language='zh-CN'){
  const group=relatedReadings(record,records),others=group.filter(item=>item.id!==record.id);
  // Keep the earliest context and recent readings, always including the selected reading.
  const selected=others.length<CASE_READING_LIMIT?group:[others[0],...others.slice(-(CASE_READING_LIMIT-2)),record];
  const readings=[...new Map(selected.map(item=>[item.id,item])).values()].sort((a,b)=>String(a.completedAt||a.createdAt).localeCompare(String(b.completedAt||b.createdAt))).map(excerpt);
  const payload={version:1,task:'journal-review',language,currentId:record.id,totalReadings:group.length,readings};
  while(new TextEncoder().encode(JSON.stringify(payload)).byteLength>30000){
    for(const item of readings){item.firstReading=item.firstReading.slice(0,Math.floor(item.firstReading.length*.8));item.latestReading=item.latestReading.slice(0,Math.floor(item.latestReading.length*.8))}
  }
  return payload;
}
export function caseSignature(payload){
  let hash=2166136261;for(const char of JSON.stringify([payload.currentId,payload.totalReadings,payload.readings])){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36);
}
export function parseConnections(text,payload){
  const value=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
  if(!Array.isArray(value.related)||value.related.length>12)throw new Error('INVALID_AI_RESULT');
  const ids=new Set(payload.candidates.map(item=>item.id)),seen=new Set();
  return value.related.map(item=>{
    if(!ids.has(item.id)||seen.has(item.id)||!clean(item.reason,500))throw new Error('INVALID_AI_RESULT');
    seen.add(item.id);return {id:item.id,reason:clean(item.reason,500)};
  });
}
export function parseCaseReview(text,payload){
  const value=JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
  const ids=new Set(payload.readings.map(item=>item.id));
  if(!Array.isArray(value.readingIds)||value.readingIds.length!==ids.size||new Set(value.readingIds).size!==ids.size||value.readingIds.some(id=>!ids.has(id)))throw new Error('INVALID_AI_RESULT');
  const fields=['summary','continuities','changes','uncertainties','nextStep'];
  if(fields.some(key=>typeof value[key]!=='string'||!value[key].trim()||value[key].length>4000))throw new Error('INVALID_AI_RESULT');
  return Object.fromEntries([['readingIds',value.readingIds],...fields.map(key=>[key,value[key].trim()])]);
}
export function normalizeCaseReviews(values){
  const seen=new Set();return (Array.isArray(values)?values:[]).flatMap(value=>{
    if(!validId(value?.id)||seen.has(value.id)||!stamp(value.generatedAt)||!Array.isArray(value.readingIds)||value.readingIds.length<2||value.readingIds.length>CASE_READING_LIMIT||value.readingIds.some(id=>!validId(id)))return [];
    seen.add(value.id);const fields=['summary','continuities','changes','uncertainties','nextStep'];
    if(fields.some(key=>!clean(value[key],4000)))return [];
    return [{id:value.id,generatedAt:stamp(value.generatedAt),language:['en','fa'].includes(value.language)?value.language:'zh-CN',signature:clean(value.signature,80),readingIds:[...new Set(value.readingIds)],...Object.fromEntries(fields.map(key=>[key,clean(value[key],4000)]))}];
  }).sort((a,b)=>a.generatedAt.localeCompare(b.generatedAt));
}

// Used by the Worker: validate independently of the browser and discard extra fields.
export function validateCasePayload(value){
  const text=(item,max)=>{if(typeof item!=='string'||item.length>max)throw new Error('text');return item.trim()};
  const id=item=>{if(!validId(item))throw new Error('id');return item};
  const language=['en','fa'].includes(value.language)?value.language:'zh-CN';
  if(value.task==='journal-links'){
    if(!value.current||!Array.isArray(value.candidates)||!value.candidates.length||value.candidates.length>CASE_CANDIDATE_LIMIT)throw new Error('candidates');
    const current={id:id(value.current.id),question:text(value.current.question,100)};
    const candidates=value.candidates.map(item=>({id:id(item.id),question:text(item.question,100),createdAt:stamp(item.createdAt)}));
    if(!current.question||candidates.some(item=>!item.question||item.id===current.id)||new Set(candidates.map(item=>item.id)).size!==candidates.length)throw new Error('candidates');
    return {version:1,task:value.task,language,current,candidates};
  }
  if(value.task!=='journal-review'||!Array.isArray(value.readings)||value.readings.length<2||value.readings.length>CASE_READING_LIMIT)throw new Error('readings');
  const readings=value.readings.map(item=>{
    if(!hexagrams[item.originalIndex]||!Number.isInteger(item.originalIndex)||!hexagrams[item.changedIndex]||!Number.isInteger(item.changedIndex))throw new Error('hexagram');
    if(!Array.isArray(item.moving)||item.moving.length>6||item.moving.some(n=>!Number.isInteger(n)||n<1||n>6))throw new Error('moving');
    const result={id:id(item.id),question:text(item.question,100),createdAt:stamp(item.createdAt),originalIndex:item.originalIndex,changedIndex:item.changedIndex,originalName:hexagrams[item.originalIndex][2],changedName:hexagrams[item.changedIndex][2],moving:[...new Set(item.moving)]};
    for(const [key,max] of [['firstReading',700],['latestReading',700],['developments',400],['note',200]])result[key]=text(item[key]||'',max);
    if(!result.question||!result.createdAt)throw new Error('record');return result;
  });
  if(new Set(readings.map(item=>item.id)).size!==readings.length||!readings.some(item=>item.id===value.currentId))throw new Error('ids');
  return {version:1,task:value.task,language,currentId:value.currentId,totalReadings:Number.isInteger(value.totalReadings)&&value.totalReadings>=readings.length?value.totalReadings:readings.length,readings};
}
export async function requestCaseAi({endpoint,payload,fetchImpl=globalThis.fetch,timeoutMs=60000}){
  if(!endpoint)throw new Error('AI_UNCONFIGURED');
  const controller=new AbortController();let timer;
  try{
    const text=await Promise.race([(async()=>{
      const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok){const error=await response.json().catch(()=>null);throw new Error(error?.error?.code||'SERVICE_ERROR')}
      const reader=response.body?.getReader();if(!reader)throw new Error('SERVICE_ERROR');
      const decoder=new TextDecoder();let text='';
      while(true){const {value,done}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});if(text.length>30000){controller.abort();throw new Error('INVALID_AI_RESULT')}}
      return text+decoder.decode();
    })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('AI_TIMEOUT'))},timeoutMs)})]);
    return payload.task==='journal-links'?parseConnections(text,payload):parseCaseReview(text,payload);
  }finally{clearTimeout(timer)}
}
