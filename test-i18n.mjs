import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dictionaryForTests, getLanguage, setLanguage, t, translateUiTextForTests } from './i18n.mjs';
import { displayHexagramName } from './hexagram-i18n.mjs';
import { isCompleteAiReading, splitAiReadingSectionsLocalized } from './ai-reading.mjs';

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)) };
setLanguage('zh-CN');
assert.equal(getLanguage(), 'zh-CN');
assert.equal(t('nav.home'), '研读总览');
assert.equal(t('hex.order', { n: 3, section: '上经' }), '第 3 卦 · 上经');
setLanguage('en');
assert.equal(getLanguage(), 'en');
assert.equal(t('nav.home'), 'Study overview');
assert.equal(t('reading.core'), 'Core judgment');
assert.equal(t('history.selectPrompt'), 'Select a journal entry to view the complete reading.');
assert.equal(t('edition.status'), 'Edition status');
assert.equal(t('reading.question',{question:'Should I proceed?'}), 'Question: Should I proceed?');
assert.equal(displayHexagramName(0,'en','乾'), 'The Creative (乾)');
const englishAi='[Core judgment]\nProceed carefully.\n[Present situation]\nConditions are forming.\n[Key change]\nA decision point is near.\nThinking direction: Which condition matters most?\nMindset adjustment: Move from predicting outcomes to testing assumptions.\n[Developing trend]\nProgress remains conditional.\n[Suggested actions]\n1. Verify assumptions\n2. Set a boundary\n3. Review the outcome';
assert.equal(isCompleteAiReading(englishAi,'en'),true);
assert.deepEqual(splitAiReadingSectionsLocalized(englishAi,'en').map(section=>section.title),['Core judgment','Present situation','Key change','Developing trend','Suggested actions']);
assert.equal(t('hex.order', { n: 3, section: 'Upper Canon' }), 'Hexagram 3 · Upper Canon');
assert.equal(translateUiTextForTests('第 2 爻 · 第 3 变 / 共十八变'), 'Line 2 · Change 3 / 18 changes total');
assert.equal(translateUiTextForTests('第 03 卦 · 上经'), 'Hexagram 03 · Upper Canon');
assert.equal(translateUiTextForTests('对于下周的面试，我最需要注意什么？'), 'What should I pay attention to in next week’s interview?');
assert.equal(t('missing.key'), 'missing.key');
setLanguage('fr');
assert.equal(getLanguage(), 'zh-CN');
assert.ok(dictionaryForTests().en['nav.home']);
const [principlesZh, principlesEn] = await Promise.all([
  readFile(new URL('./principles.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('./principles-en.json', import.meta.url), 'utf8').then(JSON.parse),
]);
assert.deepEqual(principlesEn.sections.map(section => section.id), principlesZh.sections.map(section => section.id));
for (const section of principlesEn.sections) {
  assert.equal(section.concepts.length, 3);
  const modernText = [section.title, section.subtitle, section.overview, ...section.concepts.flatMap(concept => [concept.name, concept.text])].join(' ');
  assert.doesNotMatch(modernText, /[\u4e00-\u9fff]/);
  assert.match(section.quote, /[\u4e00-\u9fff]/);
  assert.match(section.source, /[\u4e00-\u9fff]/);
}
console.log('i18n tests passed.');
