const HEXAGRAM_COUNT = 64;
const DAY_MS = 24 * 60 * 60 * 1000;

function localDayOrdinal(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export function dailyHexagramIndex(date = new Date()) {
  const value = localDayOrdinal(date) * 37 + 11;
  return ((value % HEXAGRAM_COUNT) + HEXAGRAM_COUNT) % HEXAGRAM_COUNT;
}

export function millisecondsUntilNextLocalDay(date = new Date()) {
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return Math.max(0, nextDay.getTime() - date.getTime());
}
