import assert from 'node:assert/strict';
import { createShareModel } from './share-card.mjs';
const record = {
  kind: 'reading', originalIndex: 52, changedIndex: 0,
  question: 'PRIVATE_QUESTION_<img src=x onerror=alert(1)>', note: 'PRIVATE_NOTE',
  id: 'SECRET_RECORD_ID', email: 'SECRET_EMAIL', account: { token: 'SECRET_TOKEN' },
  aiReading: { text: 'SECRET_AI' }, journal: { intention: 'SECRET_INTENTION' },
  url: 'https://private.example/?token=SECRET_TOKEN',
};
function absent(model, strings) { for (const value of strings) assert.equal(JSON.stringify(model).includes(value), false, value + ' leaked'); }
const secrets = ['SECRET_RECORD_ID','SECRET_EMAIL','SECRET_TOKEN','SECRET_AI','SECRET_INTENTION'];
for (const language of ['zh-CN','en','fa']) {
  const plain = createShareModel(record, {}, language);
  absent(plain, [...secrets, record.question, record.note]);
  assert.equal(plain.privateIncluded, false);
  assert.equal(plain.url, 'https://guanxiang-zhouyi-evf.pages.dev/#hexagrams/53');
  const question = createShareModel(record, { question: true }, language);
  assert.equal(question.blocks.some(block=>block.text===record.question), true);
  absent(question, [...secrets, record.note]);
  const note = createShareModel(record, { note: true, quote: false }, language);
  assert.equal(note.blocks.length, 1); assert.equal(note.blocks[0].text, record.note);
  absent(note, [...secrets, record.question]);
  absent(createShareModel(record, { question: 'true', note: 1 }, language), [record.question, record.note]);
  absent(createShareModel(record), [record.question, record.note]);
}
const long = createShareModel({ ...record, note: '💭'.repeat(500) }, { note: true });
assert.equal([...long.blocks.at(-1).text].length, 181);
assert.equal(long.blocks.at(-1).text.endsWith('…'), true);
assert.equal(createShareModel({ originalIndex: -4 }).index, 0);
assert.equal(createShareModel({ kind: 'example', originalIndex: 52 }).kicker.includes('虚构'), true);
console.log('Share privacy passed: explicit opt-in, public-only URLs, per-open defaults, bounded Unicode text and no unrelated record data.');
