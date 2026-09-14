import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { castLineFromSplits, castRandomHexagram, drawYarrowChange } from './yarrow-core.mjs';
import { readingRule } from './reading-rules.mjs';
import { normalizeHistoryRecords, validHistoryRecord } from './storage.mjs';

for (let left = 1; left <= 47; left += 1) {
  const first = drawYarrowChange(49, left);
  assert.ok([5, 9].includes(first.removed));
  for (let next = 1; next <= first.remaining - 2; next += 1) {
    assert.ok([4, 8].includes(drawYarrowChange(first.remaining, next).removed));
  }
}

for (let a = 1; a <= 47; a += 1) {
  const first = drawYarrowChange(49, a);
  const b = Math.max(1, Math.floor(first.remaining / 2));
  const second = drawYarrowChange(first.remaining, b);
  const c = Math.max(1, Math.floor(second.remaining / 2));
  assert.ok([6, 7, 8, 9].includes(castLineFromSplits([a, b, c]).value));
}

let seed = 0x1a2b3c4d;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
const samples = 120000;
for (let index = 0; index < samples / 6; index += 1) {
  for (const line of castRandomHexagram(random)) counts[line.value] += 1;
}
for (const value of [6, 7, 8, 9]) {
  assert.ok(counts[value] > 0, `outcome ${value} must be reachable`);
}
const traditional = { 6: 1 / 16, 7: 5 / 16, 8: 7 / 16, 9: 3 / 16 };
for (const value of [6, 7, 8, 9]) {
  assert.ok(Math.abs(counts[value] / samples - traditional[value]) < 0.015, `distribution for ${value}`);
}

assert.equal(readingRule([], 2).primary.length, 0);
assert.deepEqual(readingRule([4], 2).primary, [4]);
assert.equal(readingRule([0, 1, 2, 3, 4, 5], 0).text.includes('用九、用六'), true);

const record = {
  id: 'test-record',
  question: '面对当前选择，我应注意什么？',
  completedAt: new Date().toISOString(),
  originalIndex: 0,
  changedIndex: 1,
  moving: [],
  note: '',
  lines: castRandomHexagram(random)
};
assert.equal(validHistoryRecord(record), true);
assert.equal(normalizeHistoryRecords([record, record]).length, 1);
const relations = JSON.parse(await readFile(new URL('./relations.json', import.meta.url), 'utf8'));
assert.equal(Object.keys(relations.hexagrams).length, 64);
for (const entry of Object.values(relations.hexagrams)) {
  assert.ok(entry.references.some(ref => ref.wingId.startsWith('tuan-') && ref.kind === 'direct'));
  assert.ok(entry.references.some(ref => ref.wingId.startsWith('xiang-') && ref.kind === 'direct'));
}
console.log('Yarrow algorithm, reading rules, and record validation passed.');
