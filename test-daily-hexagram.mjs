import assert from 'node:assert/strict';
import { dailyHexagramIndex, millisecondsUntilNextLocalDay } from './daily-hexagram.mjs';

const morning = new Date(2026, 8, 17, 8, 30, 0, 0);
const evening = new Date(2026, 8, 17, 23, 59, 0, 0);
const nextDay = new Date(2026, 8, 18, 0, 1, 0, 0);

assert.equal(dailyHexagramIndex(morning), dailyHexagramIndex(evening), 'one local day must keep one hexagram');
assert.notEqual(dailyHexagramIndex(evening), dailyHexagramIndex(nextDay), 'the next local day must rotate the hexagram');
assert.ok(dailyHexagramIndex(morning) >= 0 && dailyHexagramIndex(morning) < 64);
assert.equal(millisecondsUntilNextLocalDay(new Date(2026, 8, 17, 23, 59, 59, 500)), 500);

const cycle = new Set(Array.from({ length: 64 }, (_, offset) => dailyHexagramIndex(new Date(2026, 0, 1 + offset))));
assert.equal(cycle.size, 64, 'a 64-day cycle must visit every hexagram exactly once');

console.log('Daily hexagram rotation tests passed.');
