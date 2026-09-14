import { readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(new URL('./ten-wings.json', import.meta.url), 'utf8'));
const names = [...source.wings[0].sections, ...source.wings[1].sections]
  .sort((a, b) => a.number - b.number)
  .map(section => section.hexagram);
const relations = Object.fromEntries(names.map((name, index) => [String(index + 1), { name, references: [] }]));

source.wings.forEach((wing, wingIndex) => {
  wing.sections.forEach((section, sectionIndex) => {
    const mentioned = new Set();
    if (section.hexagram && names.includes(section.hexagram)) mentioned.add(section.hexagram);
    for (const name of names) {
      if (section.text.includes(`《${name}》`)) mentioned.add(name);
    }
    for (const name of mentioned) {
      const number = names.indexOf(name) + 1;
      const direct = section.hexagram === name;
      relations[String(number)].references.push({
        wingId: wing.id,
        wingTitle: wing.title,
        wingIndex,
        sectionIndex,
        sectionNumber: section.number || sectionIndex + 1,
        kind: direct ? 'direct' : 'mention',
        excerpt: section.text.replace(/\s+/g, ' ').slice(0, 92)
      });
    }
  });
});

for (let number = 1; number <= 64; number += 1) {
  const refs = relations[String(number)].references;
  const hasTuan = refs.some(ref => ref.wingId.startsWith('tuan-') && ref.kind === 'direct');
  const hasXiang = refs.some(ref => ref.wingId.startsWith('xiang-') && ref.kind === 'direct');
  if (!hasTuan || !hasXiang) throw new Error(`Hexagram ${number} lacks a direct Tuan or Xiang reference`);
}

const output = {
  version: 1,
  generatedFrom: 'ten-wings.json',
  edition: source.edition,
  hexagrams: relations
};
await writeFile(new URL('./relations.json', import.meta.url), JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Built relations.json with ${Object.values(relations).reduce((sum, item) => sum + item.references.length, 0)} references.`);
