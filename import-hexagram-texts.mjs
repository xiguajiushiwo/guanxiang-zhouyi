import { writeFile } from 'node:fs/promises';

const sourceUrl = 'https://raw.githubusercontent.com/bollwarm/ZHOUYI/master/lib/ZHOUYI.pm';
const raw = await (await fetch(sourceUrl)).text();
const transcriptionCorrections = new Map([
  ['見龍再田', '見龍在田'],
  ['初噬告', '初筮告'],
]);
let body = raw.slice(raw.indexOf('__DATA__')).replace(/\r/g, '');
for (const [source, corrected] of transcriptionCorrections) body = body.replaceAll(source, corrected);
const start = body.indexOf('《易經》第一卦乾');
const end = body.indexOf('系辭上傳', start);
const hexBody = body.slice(start, end);
const headings = [...hexBody.matchAll(/^《易經》[^\n]+$/gm)];
if (headings.length !== 64) throw new Error(`卦文数量异常：${headings.length}`);

const blocks = headings.map((heading, index) => {
  const block = hexBody.slice(heading.index, headings[index + 1]?.index ?? hexBody.length);
  return block.split('\n').map((line) => line.trim()).filter(Boolean);
});

const linePattern = /^(初九|九二|九三|九四|九五|上九|初六|六二|六三|六四|六五|上六|用九|用六)[：:](.+)$/;
const hexagrams = blocks.map((lines, index) => {
  const judgmentIndex = lines.findIndex((line) => !line.startsWith('《') && !line.startsWith('初') && !line.startsWith('九') && !line.startsWith('六') && !line.startsWith('上') && !line.startsWith('用'));
  const judgment = judgmentIndex >= 0 ? lines[judgmentIndex] : '';
  const yaoLines = lines
    .map((line) => line.match(linePattern))
    .filter(Boolean)
    .map(([, label, text]) => ({ label, text }));
  if (!judgment || yaoLines.length < 6) throw new Error(`第 ${index + 1} 卦经文解析不完整`);
  return { number: index + 1, text: judgment, lines: yaoLines };
});

await writeFile('hexagram-texts.json', JSON.stringify({
  edition: '《十三经注疏·周易正义》通行本次序',
  source: `电子转录：${sourceUrl}`,
  retrievedAt: new Date().toISOString().slice(0, 10),
  stats: { hexagrams: hexagrams.length, yaoLines: hexagrams.reduce((sum, hexagram) => sum + hexagram.lines.length, 0) },
  hexagrams,
}, null, 2), 'utf8');
console.log(`六十四卦经文导入完成：${hexagrams.length} 卦，${hexagrams.reduce((sum, hexagram) => sum + hexagram.lines.length, 0)} 条爻辞`);
