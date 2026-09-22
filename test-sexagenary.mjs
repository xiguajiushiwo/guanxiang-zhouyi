import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.Solar = require('./node_modules/lunar-javascript/lunar.js').Solar;

const { calendarForInstant, localDateTimeToIso, normalizeCastTime } = await import('./sexagenary.mjs');

const normalized = normalizeCastTime({
  value: '2026-09-22T02:30:00.000Z',
  timeZone: 'Asia/Shanghai'
});
assert.equal(normalized.iso, '2026-09-22T02:30:00.000Z');
assert.equal(normalized.timeZone, 'Asia/Shanghai');
assert.equal(normalized.localDateTime, '2026-09-22T10:30');
assert.equal(localDateTimeToIso('2026-09-22T10:30', 'Asia/Shanghai'), normalized.iso);
assert.equal(new Date(localDateTimeToIso('2026-09-21T12:00', 'America/New_York')).toISOString(), '2026-09-21T16:00:00.000Z');

const calendar = calendarForInstant(normalized.iso, normalized.timeZone);
assert.equal(calendar.yearPillar, '丙午');
assert.equal(calendar.monthPillar, '丁酉');
assert.equal(calendar.dayPillar, '己亥');
assert.equal(calendar.hourPillar, '己巳');
assert.equal(calendar.monthBranch, '酉');
assert.equal(calendar.dayBranch, '亥');
assert.equal(calendar.dayStem, '己');
assert.ok(calendar.solarTermBoundary);

const boundary = normalizeCastTime({
  value: '2026-09-21T16:00:00.000Z',
  timeZone: 'America/New_York'
});
assert.equal(boundary.localDateTime, '2026-09-21T12:00');
assert.equal(calendarForInstant(boundary.iso, boundary.timeZone).timeZone, 'America/New_York');

assert.throws(() => normalizeCastTime({ value: 'not-a-date', timeZone: 'Asia/Shanghai' }), RangeError);
assert.throws(() => normalizeCastTime({ value: '2026-09-22T00:00:00Z', timeZone: 'Mars/Base' }), RangeError);
assert.throws(() => calendarForInstant('2026-09-22T00:00:00.000Z', 'Mars/Base'), RangeError);

console.log('Sexagenary calendar adapter tests passed.');
