import { readFile } from 'node:fs/promises';

const wings = JSON.parse(await readFile('ten-wings.json', 'utf8'));
const hexagrams = JSON.parse(await readFile('hexagram-texts.json', 'utf8'));
const expectedWingSections = [30, 34, 30, 34, 42, 36, 29, 18, 2, 1];
const forbidden = ['見龍再田', '初噬告', '竭惡揚善', '恐懼修身', '天下矣之理', '', '', '\ufffd'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(wings.wings?.length === 10, `十翼篇数异常：${wings.wings?.length ?? 0}`);
wings.wings.forEach((wing, index) => {
  assert(wing.sections.length === expectedWingSections[index], `${wing.title} 段数异常：${wing.sections.length}`);
  assert(wing.sections.every((section) => section.text?.trim()), `${wing.title} 存在空段`);
});

assert(hexagrams.hexagrams?.length === 64, `卦数异常：${hexagrams.hexagrams?.length ?? 0}`);
hexagrams.hexagrams.forEach((hexagram, index) => {
  const expectedLines = index < 2 ? 7 : 6;
  assert(hexagram.number === index + 1, `第 ${index + 1} 卦编号异常`);
  assert(hexagram.text?.trim(), `第 ${index + 1} 卦缺少卦辞`);
  assert(hexagram.lines?.length === expectedLines, `第 ${index + 1} 卦爻辞数量异常：${hexagram.lines?.length ?? 0}`);
});

const corpus = JSON.stringify({ wings, hexagrams });
assert(!/[\uE000-\uF8FF]/u.test(corpus), '原文中仍有私用区乱码');
for (const text of forbidden) assert(!corpus.includes(text), `原文中仍有待校字符：${text}`);

const sectionCount = wings.wings.reduce((sum, wing) => sum + wing.sections.length, 0);
const lineCount = hexagrams.hexagrams.reduce((sum, hexagram) => sum + hexagram.lines.length, 0);
console.log(`内容校验通过：十翼 ${sectionCount} 段，六十四卦 ${lineCount} 条爻辞。`);
