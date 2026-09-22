const STEMS = '甲乙丙丁戊己庚辛壬癸';
const STEM_ELEMENTS = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const SOLAR_TERMS = new Set(['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒']);

function assertTimeZone(timeZone) {
  const value = String(timeZone || '').trim();
  if (!value) throw new RangeError('timeZone is required');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
  } catch {
    throw new RangeError(`Invalid time zone: ${value}`);
  }
  return value;
}

function dateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
    localDateTime: `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
  };
}

function solarApi() {
  const Solar = globalThis.Solar;
  if (!Solar || typeof Solar.fromYmdHms !== 'function') throw new Error('Sexagenary calendar library is unavailable');
  return Solar;
}

export function normalizeCastTime(input = {}, fallbackDate = new Date()) {
  const timeZone = assertTimeZone(input.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const raw = input.value ?? fallbackDate;
  const date = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid cast time');
  const parts = dateParts(date, timeZone);
  return { iso: date.toISOString(), timeZone, localDateTime: parts.localDateTime };
}

function localTermBoundary(lunar, localDateTime) {
  if (typeof lunar.getJieQiTable !== 'function') return null;
  const entries = Object.entries(lunar.getJieQiTable())
    .filter(([name, solar]) => SOLAR_TERMS.has(name) && solar && typeof solar.toYmdHms === 'function')
    .map(([name, solar]) => ({ name, local: solar.toYmdHms(), solar }))
    .filter(entry => entry.local <= localDateTime.replace('T', ' '));
  const current = entries.sort((a, b) => a.local.localeCompare(b.local)).at(-1);
  return current ? { name: current.name, localDateTime: current.local } : null;
}

export function calendarForInstant(iso, timeZone) {
  const zone = assertTimeZone(timeZone);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid cast time');
  const parts = dateParts(date, zone);
  const Solar = solarApi();
  const solar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
  const lunar = solar.getLunar();
  const yearPillar = lunar.getYearInGanZhiExact();
  const monthPillar = lunar.getMonthInGanZhiExact();
  const dayPillar = lunar.getDayInGanZhiExact();
  const hourPillar = lunar.getTimeInGanZhi();
  const dayStem = lunar.getDayGanExact();
  return {
    timeZone: zone,
    localDateTime: parts.localDateTime,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    monthBranch: lunar.getMonthZhiExact(),
    dayBranch: lunar.getDayZhiExact(),
    dayStem,
    dayElement: STEM_ELEMENTS[dayStem] || null,
    solarTerm: typeof lunar.getJieQi === 'function' ? lunar.getJieQi() || null : null,
    solarTermBoundary: localTermBoundary(lunar, parts.localDateTime)
  };
}

export { STEMS, STEM_ELEMENTS };
