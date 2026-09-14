export const ANNOTATION_KEY = 'guanxiang-annotations-v1';
export const STUDY_KEY = 'guanxiang-study-v1';
function read(storage, key, fallback) { try { const value = JSON.parse(storage.getItem(key) || 'null'); return value === null ? fallback : value; } catch { return fallback; } }
function write(storage, key, value) { storage.setItem(key, JSON.stringify(value)); return value; }
export function validateAnnotation(annotation) {
  if (!annotation || !['hexagram', 'classic', 'principle'].includes(annotation.sourceType)) return false;
  if (typeof annotation.sourceId !== 'string' || !annotation.sourceId.trim() || annotation.sourceId.length > 120) return false;
  if (typeof annotation.note !== 'string' || !annotation.note.trim() || annotation.note.length > 2000) return false;
  if (annotation.tags !== undefined && (!Array.isArray(annotation.tags) || annotation.tags.length > 12 || annotation.tags.some(tag => typeof tag !== 'string' || tag.length > 30))) return false;
  return true;
}
export function loadAnnotations(storage = globalThis.localStorage) {
  const records = read(storage, ANNOTATION_KEY, []);
  return Array.isArray(records) ? records.filter(item => validateAnnotation(item)).map(item => ({ ...item, tags: item.tags || [], reviewState: item.reviewState || '未开始' })) : [];
}
export function saveAnnotation(annotation, storage = globalThis.localStorage) {
  if (!validateAnnotation(annotation)) throw new Error('invalid annotation');
  const records = loadAnnotations(storage), stamp = new Date().toISOString();
  const next = { ...annotation, id: annotation.id || ('annotation-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)), updatedAt: stamp, createdAt: annotation.createdAt || stamp, tags: annotation.tags || [], reviewState: annotation.reviewState || '未开始' };
  const index = records.findIndex(item => item.id === next.id);
  if (index >= 0) records[index] = next; else records.unshift(next);
  write(storage, ANNOTATION_KEY, records.slice(0, 200));
  return next;
}
export function deleteAnnotation(id, storage = globalThis.localStorage) {
  const next = loadAnnotations(storage).filter(item => item.id !== id);
  write(storage, ANNOTATION_KEY, next);
  return next;
}
export function loadStudyState(storage = globalThis.localStorage) {
  const state = read(storage, STUDY_KEY, {});
  return { completed: Array.isArray(state.completed) ? state.completed.filter(item => typeof item === 'string') : [], current: Number.isInteger(state.current) ? state.current : 0 };
}
export function saveStudyState(state, storage = globalThis.localStorage) {
  const next = { completed: [...new Set(state.completed || [])], current: Number.isInteger(state.current) ? state.current : 0 };
  write(storage, STUDY_KEY, next);
  return next;
}
