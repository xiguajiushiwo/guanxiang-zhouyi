import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.Solar = require('./node_modules/lunar-javascript/lunar.js').Solar;

const { applyYongShenOverride, buildLiuyaoChart } = await import('./liuyao-core.mjs');

const chart = buildLiuyaoChart({
  lines: [7, 8, 9, 6, 7, 8].map(value => ({ value, changes: [] })),
  castAt: '2026-09-22T02:30:00.000Z',
  timeZone: 'Asia/Shanghai',
  question: '这次财务安排应注意什么？',
  category: 'finance'
});

assert.equal(chart.version, 1);
assert.equal(chart.castingMethod, 'yarrow');
assert.equal(chart.original.index, 62);
assert.equal(chart.original.name, '水火既济');
assert.equal(chart.changed.index, 16);
assert.equal(chart.changed.name, '泽雷随');
assert.equal(chart.castAt, '2026-09-22T02:30:00.000Z');
assert.equal(chart.timeZone, 'Asia/Shanghai');
assert.equal(chart.calendar.dayPillar, '己亥');
assert.equal(chart.lines.length, 6);
assert.equal(chart.lines[0].position, 1);
assert.equal(chart.lines[0].moving, false);
assert.equal(chart.lines[2].moving, true);
assert.equal(chart.lines[2].changedPolarity, '阴');
assert.equal(chart.lines[2].transformed.ganzhi, chart.changed.lines[2].ganzhi);
assert.ok(chart.lines[0].relations.some(relation => relation.target === '日辰'));
assert.ok(chart.lines[0].strength.label);
assert.equal(chart.yongShen.source, 'auto');
assert.ok(chart.yongShen.candidates.includes('妻财'));

const overridden = applyYongShenOverride(chart, '世爻');
assert.equal(overridden.yongShen.selected, '世爻');
assert.equal(overridden.yongShen.source, 'manual');
assert.equal(overridden.original.index, chart.original.index);

assert.throws(() => buildLiuyaoChart({ lines: [7, 8], castAt: chart.castAt, timeZone: chart.timeZone }), RangeError);

console.log('Liuyao chart assembly tests passed.');
