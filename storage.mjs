import { MAX_AI_VERSIONS, mergeJournals, normalizeJournal, normalizeLocalSnapshot } from './journal.mjs';
import { normalizeCaseReviews, normalizeConnections } from './case-review.mjs';

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
  return Boolean(record && typeof record.id === 'string' && record.id.trim() && record.id.length <= 120 && typeof record.question === 'string' &&
    Array.isArray(record.lines) && record.lines.length === 6 && record.lines.every(validStoredLine) &&
    Number.isInteger(record.originalIndex) && record.originalIndex >= 0 && record.originalIndex < 64 &&
    Number.isInteger(record.changedIndex) && record.changedIndex >= 0 && record.changedIndex < 64 &&
    (record.note === undefined || typeof record.note === 'string'));
}

export function normalizeHistoryRecords(value, limit = Infinity) {
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
  const language=value.language==='en'||value.language==='zh-CN'||value.language==='fa'?value.language:null;
  return {text,generatedAt:isoOrFallback(value.generatedAt,now.toISOString()),modelLabel:typeof value.modelLabel==='string'&&value.modelLabel.trim()?value.modelLabel.trim().slice(0,80):'Workers AI',version:1,...(language?{language}:{})};
}
export function readingVersions(record, now = new Date()) {
  const seen = new Set();
  return [...(Array.isArray(record.aiReadings) ? record.aiReadings : []), record.aiReading]
    .map(value => normalizeAiReading(value, now)).filter(value => {
      if (!value) return false;
      const key = JSON.stringify([value.generatedAt, value.language, value.text]);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}
export function appendAiReading(record, value, now = new Date()) {
  const aiReading = normalizeAiReading(value, now), versions = readingVersions(record, now);
  if (!aiReading) throw new TypeError('Invalid AI reading');
  if (versions.length >= MAX_AI_VERSIONS) throw new RangeError('AI_VERSION_LIMIT');
  return {...record, aiReading, aiReadings: readingVersions({...record, aiReadings: versions, aiReading}, now), updatedAt: now.toISOString()};
}
export function normalizeJournalRecord(record, index = 0, now = new Date()) {
  if (!validHistoryRecord(record)) return null;
  const fallback = new Date(now.getTime() - index).toISOString();
  const aiReadings=readingVersions(record,now),aiReading=aiReadings.at(-1),localReadingSnapshot=normalizeLocalSnapshot(record.localReadingSnapshot),connections=normalizeConnections(record.connections,record.id),caseReviews=normalizeCaseReviews(record.caseReviews),{aiReading:discardedAiReading,aiReadings:discardedVersions,localReadingSnapshot:discardedSnapshot,journal:discardedJournal,connections:discardedConnections,caseReviews:discardedCaseReviews,...base}=record;
  return {...base,note:typeof record.note==='string'?record.note.slice(0,2000):'',tags:Array.isArray(record.tags)?record.tags.filter(tag=>typeof tag==='string').slice(0,12):[],reviewState:['未开始','研读中','已复习'].includes(record.reviewState)?record.reviewState:'未开始',createdAt:isoOrFallback(record.createdAt||record.completedAt,fallback),updatedAt:isoOrFallback(record.updatedAt||record.completedAt||record.createdAt,fallback),journal:normalizeJournal(record.journal),connections,caseReviews,...(localReadingSnapshot?{localReadingSnapshot}:{}),...(aiReading?{aiReading,aiReadings}:{})};
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
    const newer=incomingTime>=existingTime?record:existing,older=newer===record?existing:record;
    const snapshots=[existing.localReadingSnapshot,record.localReadingSnapshot].filter(Boolean).sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
    const combined={...newer,journal:mergeJournals(older.journal,newer.journal),connections:[...normalizeConnections(existing.connections,record.id),...normalizeConnections(record.connections,record.id)],caseReviews:[...normalizeCaseReviews(existing.caseReviews),...normalizeCaseReviews(record.caseReviews)],aiReadings:readingVersions({aiReadings:[...readingVersions(existing),...readingVersions(record)]}),...(snapshots.length?{localReadingSnapshot:snapshots[0]}:{})};
    if(incomingTime===existingTime){combined.note=existing.note||record.note;combined.tags=[...new Set([...(existing.tags||[]),...(record.tags||[])])].slice(0,12);combined.reviewState=existing.reviewState==='已复习'?existing.reviewState:record.reviewState}
    merged.set(record.id,normalizeJournalRecord(combined));
  }
  return [...merged.values()].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
}
export function backupStatus(records,meta={},now=new Date()) {
  const lastExport=new Date(meta.lastExportAt||0).getTime(),age=Number.isFinite(lastExport)?now.getTime()-lastExport:Infinity;
  return {due:records.length>0&&(records.length>=20||age>=14*24*60*60*1000),count:records.length,lastExportAt:meta.lastExportAt||''};
}
