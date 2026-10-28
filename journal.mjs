export const MAX_JOURNAL_ENTRIES = 100;
export const MAX_AI_VERSIONS = 10;
const clean = (value, limit = 2000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';

export function validReviewDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function normalizeJournal(value) {
  const seen = new Set();
  const entries = (Array.isArray(value?.entries) ? value.entries : []).flatMap(entry => {
    if (!entry || !clean(entry.id, 120) || seen.has(entry.id) || !stamp(entry.createdAt) || !['progress', 'review'].includes(entry.kind)) return [];
    seen.add(entry.id);
    return [{id: clean(entry.id, 120), kind: entry.kind, createdAt: stamp(entry.createdAt),
      facts: clean(entry.facts), actions: clean(entry.actions), assessment: clean(entry.assessment), nextStep: clean(entry.nextStep)}];
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return {version: 1, reviewDate: validReviewDate(value?.reviewDate) ? value.reviewDate : '',
    intention: clean(value?.intention), action: clean(value?.action),
    status: value?.status === 'reviewed' && entries.some(entry => entry.kind === 'review') ? 'reviewed' : 'open', entries};
}
export function journalStatus(record, date = new Date()) {
  const journal = normalizeJournal(record.journal);
  if (journal.status === 'reviewed') return 'reviewed';
  return journal.reviewDate && journal.reviewDate <= localDate(date) ? 'due' : 'open';
}
export function mergeJournals(older, newer) {
  const a = normalizeJournal(older), b = normalizeJournal(newer);
  return normalizeJournal({...b, entries: [...new Map([...a.entries, ...b.entries].map(entry => [entry.id, entry])).values()]});
}
export function normalizeLocalSnapshot(value) {
  const reading = value?.reading;
  if (!reading || !clean(reading.summary) || !stamp(value.capturedAt)) return null;
  return {capturedAt: stamp(value.capturedAt), language: ['zh-CN', 'en', 'fa'].includes(value.language) ? value.language : 'zh-CN',
    reading: {summary: clean(reading.summary), situation: clean(reading.situation), turningPoint: clean(reading.turningPoint), trend: clean(reading.trend),
      actions: (Array.isArray(reading.actions) ? reading.actions : []).map(item => clean(item)).filter(Boolean).slice(0, 12),
      cautions: (Array.isArray(reading.cautions) ? reading.cautions : []).map(item => clean(item)).filter(Boolean).slice(0, 12)}};
}
