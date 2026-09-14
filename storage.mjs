export function readJson(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
  return value;
}

export function validStoredLine(line) {
  return line && [6, 7, 8, 9].includes(line.value) && Array.isArray(line.changes) && line.changes.length === 3;
}

export function validHistoryRecord(record) {
  return Boolean(record && typeof record.id === 'string' && typeof record.question === 'string' &&
    Array.isArray(record.lines) && record.lines.length === 6 && record.lines.every(validStoredLine) &&
    Number.isInteger(record.originalIndex) && record.originalIndex >= 0 && record.originalIndex < 64 &&
    Number.isInteger(record.changedIndex) && record.changedIndex >= 0 && record.changedIndex < 64 &&
    (record.note === undefined || typeof record.note === 'string'));
}

export function normalizeHistoryRecords(value, limit = 100) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(record => {
    if (!validHistoryRecord(record) || seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  }).map((record, index) => normalizeJournalRecord(record, index)).filter(Boolean).slice(0, limit);
}

export const STORAGE_VERSION = 2;
function isoOrFallback(value, fallback) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
export function normalizeAiReading(value, now = new Date()) {
  if (!value || typeof value !== 'object' || typeof value.text !== 'string') return null;
  const text=value.text.trim().slice(0,12000);
  if (!text) return null;
  return {text,generatedAt:isoOrFallback(value.generatedAt,now.toISOString()),modelLabel:typeof value.modelLabel==='string'&&value.modelLabel.trim()?value.modelLabel.trim().slice(0,80):'Workers AI',version:1};
}
export function normalizeJournalRecord(record, index = 0, now = new Date()) {
  if (!validHistoryRecord(record)) return null;
  const fallback = new Date(now.getTime() - index).toISOString();
  const aiReading=normalizeAiReading(record.aiReading,now),{aiReading:discardedAiReading,...base}=record;
  return {...base,note:typeof record.note==='string'?record.note.slice(0,2000):'',tags:Array.isArray(record.tags)?record.tags.filter(tag=>typeof tag==='string').slice(0,12):[],reviewState:['未开始','研读中','已复习'].includes(record.reviewState)?record.reviewState:'未开始',createdAt:isoOrFallback(record.createdAt||record.completedAt,fallback),updatedAt:isoOrFallback(record.updatedAt||record.completedAt||record.createdAt,fallback),...(aiReading?{aiReading}:{})};
}
export function migrateJournalPayload(payload, now = new Date()) {
  const rawRecords=Array.isArray(payload)?payload:payload?.records;
  const records=Array.isArray(rawRecords)?rawRecords.map((record,index)=>normalizeJournalRecord(record,index,now)).filter(Boolean):[];
  return {version:STORAGE_VERSION,exportedAt:typeof payload?.exportedAt==='string'?payload.exportedAt:now.toISOString(),records:normalizeHistoryRecords(records)};
}
export function mergeJournalRecords(local,incoming) {
  const merged=new Map();
  for(const record of [...normalizeHistoryRecords(local),...normalizeHistoryRecords(incoming)]){
    const existing=merged.get(record.id);
    if(!existing){merged.set(record.id,record);continue}
    const existingTime=new Date(existing.updatedAt).getTime(),incomingTime=new Date(record.updatedAt).getTime();
    if(incomingTime>existingTime)merged.set(record.id,record);
    else if(incomingTime===existingTime)merged.set(record.id,{...existing,note:existing.note||record.note,tags:[...new Set([...(existing.tags||[]),...(record.tags||[])])].slice(0,12),reviewState:existing.reviewState==='已复习'?existing.reviewState:record.reviewState,...(!existing.aiReading&&record.aiReading?{aiReading:record.aiReading}:{})});
  }
  return [...merged.values()].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,100);
}
export function backupStatus(records,meta={},now=new Date()) {
  const lastExport=new Date(meta.lastExportAt||0).getTime(),age=Number.isFinite(lastExport)?now.getTime()-lastExport:Infinity;
  return {due:records.length>0&&(records.length>=20||age>=14*24*60*60*1000),count:records.length,lastExportAt:meta.lastExportAt||''};
}
