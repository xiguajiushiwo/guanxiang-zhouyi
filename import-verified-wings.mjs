import { readFile, writeFile } from 'node:fs/promises';

const sourceUrl = 'https://raw.githubusercontent.com/bollwarm/ZHOUYI/master/lib/ZHOUYI.pm';
const raw = await (await fetch(`${sourceUrl}?import=zhouyi`)).text();
const transcriptionCorrections = new Map([
  ['初噬告', '初筮告'],
  ['竭惡揚善', '遏惡揚善'],
  ['恐懼修身', '恐懼修省'],
  ['易簡而天下矣之理得矣', '易簡而天下之理得矣'],
  ['躁萬物者莫乎火', '燥萬物者莫熯乎火'],
  ['為足', '為馵足'],
]);
let body = raw.slice(raw.indexOf('__DATA__')).replace(/\r/g, '');
for (const [source, corrected] of transcriptionCorrections) body = body.replaceAll(source, corrected);
if (!body.includes('《易經》第一卦乾') || !body.includes('雜卦')) throw new Error('周易电子底本不完整');

const previous = JSON.parse(await readFile('ten-wings.json', 'utf8'));
const hexNames = [...previous.wings[0].sections, ...previous.wings[1].sections].map((section) => section.hexagram);
const proseStart = body.indexOf('系辭上傳');
const hexBody = body.slice(body.indexOf('《易經》第一卦乾'), proseStart);
const headings = [...hexBody.matchAll(/^《易經》[^\n]+$/gm)];
if (headings.length !== 64) throw new Error(`卦文数量异常：${headings.length}`);

const blocks = headings.map((heading, index) => {
  const start = heading.index;
  const end = headings[index + 1]?.index ?? hexBody.length;
  return hexBody.slice(start, end).split('\n').map((line) => line.trim()).filter(Boolean);
});
const tuan = blocks.map((lines, index) => ({ number: index + 1, hexagram: hexNames[index], text: lines.find((line) => line.startsWith('《彖》曰：')) || '' }));
const xiang = blocks.map((lines, index) => ({ number: index + 1, hexagram: hexNames[index], text: lines.filter((line) => line.startsWith('《象》曰：')).join('\n') }));
const wenYan = blocks.slice(0, 2).flatMap((lines, hexagramIndex) => { const start = lines.findIndex((line) => line.startsWith('《文言》曰')); return start < 0 ? [] : lines.slice(start).map((text, index) => ({ number: index + 1, hexagram: hexNames[hexagramIndex], text })); });

function between(start, end) { const from = body.indexOf(start); const to = end ? body.indexOf(end, from + start.length) : body.length; return body.slice(from + start.length, to).split('\n').map((line) => line.trim()).filter(Boolean); }
function prose(id, title, order, start, end) { return { id, title, order, kind: 'chapter', sections: between(start, end).map((text, index) => ({ number: index + 1, text })) }; }
function hexWing(id, title, order, sections) { return { id, title, order, kind: 'hexagram', sections }; }

const wings = [
  hexWing('tuan-shang', '《彖传上》', 1, tuan.slice(0, 30)),
  hexWing('tuan-xia', '《彖传下》', 2, tuan.slice(30)),
  hexWing('xiang-shang', '《象传上》', 3, xiang.slice(0, 30)),
  hexWing('xiang-xia', '《象传下》', 4, xiang.slice(30)),
  prose('xi-ci-shang', '《系辞传上》', 5, '系辭上傳', '系辭下傳'),
  prose('xi-ci-xia', '《系辞传下》', 6, '系辭下傳', '說卦'),
  { id: 'wen-yan', title: '《文言传》', order: 7, kind: 'chapter', sections: wenYan },
  prose('shuo-gua', '《说卦传》', 8, '說卦', '序卦'),
  prose('xu-gua', '《序卦传》', 9, '序卦', '雜卦'),
  prose('za-gua', '《杂卦传》', 10, '雜卦', null),
];
const emptySections = wings.flatMap((wing) => wing.sections).filter((section) => !section.text);
const xiangLineCount = xiang.reduce((sum, section) => sum + section.text.split('\n').filter(Boolean).length, 0);
if (tuan.filter((section) => section.text).length !== 64) throw new Error('彖传未取得完整 64 卦');
if (xiang.filter((section) => section.text).length !== 64 || xiangLineCount < 440) throw new Error(`象传不完整：${xiangLineCount} 条`);
if (emptySections.length) throw new Error(`发现 ${emptySections.length} 个空段`);

await writeFile('ten-wings.json', JSON.stringify({ edition: '《十三经注疏·周易正义》通行本次序', source: `武英殿本 CTP 参校；电子转录：${sourceUrl}`, retrievedAt: new Date().toISOString().slice(0, 10), stats: { wings: wings.length, tuan: tuan.length, xiangGroups: xiang.length, xiangLines: xiangLineCount, sections: wings.reduce((sum, wing) => sum + wing.sections.length, 0) }, wings }, null, 2), 'utf8');
console.log(`十翼导入完成：64 彖，${xiangLineCount} 象，${wings.reduce((sum, wing) => sum + wing.sections.length, 0)} 段`);
