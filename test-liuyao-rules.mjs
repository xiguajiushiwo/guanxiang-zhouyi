import assert from 'node:assert/strict';
import hexagrams from './hexagram-catalog.mjs';
import {
  ELEMENTS,
  NAJIA_TRIGRAMS,
  HEXAGRAM_PALACES,
  najiaForHexagram,
  relativeForElement,
  relationBetweenBranches,
  sixSpiritsForDayStem,
  shiYingForHexagram,
  strengthForLine
} from './liuyao-rules.mjs';

assert.deepEqual(NAJIA_TRIGRAMS.天.inner, ['甲子', '甲寅', '甲辰']);
assert.deepEqual(NAJIA_TRIGRAMS.天.outer, ['壬午', '壬申', '壬戌']);
assert.equal(najiaForHexagram(0).lines[0].ganzhi, '甲子');
assert.equal(najiaForHexagram(0).lines[5].ganzhi, '壬戌');
assert.equal(najiaForHexagram(0).palace, '天');
assert.equal(najiaForHexagram(0).palaceElement, '金');

for (let index = 0; index < hexagrams.length; index += 1) {
  const chart = najiaForHexagram(index);
  assert.equal(chart.lines.length, 6);
  assert.equal(chart.lines[0].position, 1);
  assert.equal(chart.lines[5].position, 6);
  assert.ok(HEXAGRAM_PALACES[index]);
  const shiYing = shiYingForHexagram(index);
  assert.equal(shiYing.yingIndex, (shiYing.shiIndex + 3) % 6);
}

assert.deepEqual(shiYingForHexagram(0), { palace: '天', palaceElement: '金', sequence: 0, shiIndex: 5, yingIndex: 2 });
assert.deepEqual(shiYingForHexagram(2), { palace: '水', palaceElement: '水', sequence: 2, shiIndex: 1, yingIndex: 4 });
assert.equal(relativeForElement('金', '木'), '妻财');
assert.equal(relativeForElement('金', '土'), '父母');
assert.equal(relativeForElement('金', '金'), '兄弟');
assert.equal(relativeForElement('金', '水'), '子孙');
assert.equal(relativeForElement('金', '火'), '官鬼');

assert.ok(relationBetweenBranches('子', '丑').includes('六合'));
assert.ok(relationBetweenBranches('子', '午').includes('六冲'));
assert.ok(relationBetweenBranches('申', '子').includes('三合水局'));
assert.ok(relationBetweenBranches('寅', '巳').includes('相刑'));
assert.ok(relationBetweenBranches('子', '未').includes('六害'));
assert.ok(relationBetweenBranches('子', '酉').includes('相破'));

assert.deepEqual(sixSpiritsForDayStem('甲'), ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']);
assert.deepEqual(sixSpiritsForDayStem('己'), ['螣蛇', '白虎', '玄武', '青龙', '朱雀', '勾陈']);

const strength = strengthForLine({ lineElement: '木', monthBranch: '寅', dayBranch: '午', moving: true, transformedElement: '火' });
assert.equal(strength.label, '旺');
assert.ok(strength.reasons.length >= 2);
assert.ok(ELEMENTS.includes('木'));

console.log('Liuyao rule table tests passed.');
