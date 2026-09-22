import hexagrams from './hexagram-catalog.mjs';
import { hexagramRelations } from './derived-hexagrams.mjs';
import { calendarForInstant, normalizeCastTime } from './sexagenary.mjs';
import { branchElement, elementControls, elementGenerates, najiaForHexagram, relativeForElement, relationBetweenBranches, sixSpiritsForDayStem, shiYingForHexagram, strengthForLine } from './liuyao-rules.mjs';

const TRIGRAM_BITS = { 天: '111', 泽: '110', 火: '101', 雷: '100', 风: '011', 水: '010', 山: '001', 地: '000' };
const LINE_POSITIONS = ['初', '二', '三', '四', '五', '上'];
const YONG_SHEN_RULES = {
  general: ['世爻', '官鬼', '父母', '妻财', '子孙', '兄弟'],
  career: ['官鬼', '父母', '世爻', '应爻'],
  relationship: ['妻财', '官鬼', '世爻', '应爻'],
  study: ['父母', '官鬼', '世爻'],
  finance: ['妻财', '世爻', '官鬼'],
  health: ['世爻', '子孙', '父母']
};
const CATEGORY_KEYS = new Set(Object.keys(YONG_SHEN_RULES));
const ADVANCE_PAIRS = [['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉'], ['丑', '辰'], ['辰', '未'], ['未', '戌']];

function valueOf(line) { return typeof line === 'number' ? line : line?.value; }
function polarity(value) { return [7, 9].includes(value) ? '阳' : '阴'; }
function changedValue(value) { return value === 6 ? 7 : value === 9 ? 8 : value; }
function bitsForLines(lines, changed = false) { return lines.map(line => { const value = changed ? changedValue(valueOf(line)) : valueOf(line); return [7, 9].includes(value) ? 1 : 0; }); }
function hexagramIndexForBits(bits) {
  if (!Array.isArray(bits) || bits.length !== 6) return -1;
  const lower = bits.slice(0, 3).join(''), upper = bits.slice(3, 6).join('');
  const lowerName = Object.entries(TRIGRAM_BITS).find(([, code]) => code === lower)?.[0];
  const upperName = Object.entries(TRIGRAM_BITS).find(([, code]) => code === upper)?.[0];
  return lowerName && upperName ? hexagrams.findIndex(hexagram => hexagram[6] === upperName && hexagram[7] === lowerName) : -1;
}

function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 6 || lines.some(line => ![6, 7, 8, 9].includes(valueOf(line)))) throw new RangeError('six valid yarrow lines are required');
  return lines.map(line => ({ value: valueOf(line), moving: [6, 9].includes(valueOf(line)) }));
}

function relationReason(sourceElement, targetElement) {
  if (!sourceElement || !targetElement) return null;
  if (sourceElement === targetElement) return '同类';
  if (elementGenerates(sourceElement, targetElement)) return '生';
  if (elementControls(sourceElement, targetElement)) return '克';
  if (elementGenerates(targetElement, sourceElement)) return '被生';
  if (elementControls(targetElement, sourceElement)) return '被克';
  return null;
}

function candidateAvailable(candidate, rows) {
  if (candidate === '世爻' || candidate === '应爻') return true;
  return rows.some(row => row.relative === candidate);
}

function transformedRelations(base, transformed, moving) {
  if (!moving) return [];
  const labels = relationBetweenBranches(base.branch, transformed.branch).map(type => type === '六合' ? '化合' : type === '六冲' ? '化冲' : `化${type}`);
  if (elementGenerates(transformed.element, base.element)) labels.push('化回头生');
  if (elementControls(transformed.element, base.element)) labels.push('化回头克');
  if (ADVANCE_PAIRS.some(([from, to]) => from === base.branch && to === transformed.branch)) labels.push('化进神');
  if (ADVANCE_PAIRS.some(([from, to]) => from === transformed.branch && to === base.branch)) labels.push('化退神');
  return [...new Set(labels)];
}

export function recommendYongShen(category, rows) {
  const key = CATEGORY_KEYS.has(category) ? category : 'general';
  const candidates = YONG_SHEN_RULES[key];
  const selected = candidates.find(candidate => candidateAvailable(candidate, rows)) || candidates[0];
  return { selected, candidates: [...candidates], source: 'auto' };
}

export function applyYongShenOverride(chart, relative) {
  if (!chart || !chart.yongShen || !['父母', '兄弟', '子孙', '妻财', '官鬼', '世爻', '应爻'].includes(relative)) return chart;
  return { ...chart, yongShen: { ...chart.yongShen, selected: relative, source: 'manual' } };
}

export function buildLiuyaoChart({ lines, castAt, timeZone, question = '', category = 'general', yongShenOverride = null } = {}) {
  const normalizedLines = validateLines(lines);
  const originalBits = bitsForLines(normalizedLines), changedBits = bitsForLines(normalizedLines, true);
  const originalIndex = hexagramIndexForBits(originalBits), changedIndex = hexagramIndexForBits(changedBits);
  if (originalIndex < 0 || changedIndex < 0) throw new RangeError('unable to identify original or changed hexagram');
  const normalizedTime = normalizeCastTime({ value: castAt, timeZone });
  const calendar = calendarForInstant(normalizedTime.iso, normalizedTime.timeZone);
  const originalNajia = najiaForHexagram(originalIndex), changedNajia = najiaForHexagram(changedIndex);
  const shiYing = shiYingForHexagram(originalIndex);
  const spirits = sixSpiritsForDayStem(calendar.dayStem);
  const rows = normalizedLines.map((line, index) => {
    const base = originalNajia.lines[index], transformed = changedNajia.lines[index];
    const lineRelations = [];
    const branchRelations = relationBetweenBranches(base.branch, calendar.monthBranch);
    for (const type of branchRelations) lineRelations.push({ type, target: '月建', withPosition: null, status: `本爻${type}月建` });
    for (const type of relationBetweenBranches(base.branch, calendar.dayBranch)) lineRelations.push({ type, target: '日辰', withPosition: null, status: `本爻${type}日辰` });
    const monthElement = branchElement(calendar.monthBranch), dayElement = branchElement(calendar.dayBranch);
    const monthReason = relationReason(monthElement, base.element), dayReason = relationReason(dayElement, base.element);
    if (monthReason) lineRelations.push({ type: `月建${monthReason}`, target: '月建', withPosition: null, status: `月建${monthReason}本爻` });
    if (dayReason) lineRelations.push({ type: `日辰${dayReason}`, target: '日辰', withPosition: null, status: `日辰${dayReason}本爻` });
    for (let otherIndex = 0; otherIndex < originalNajia.lines.length; otherIndex += 1) {
      if (otherIndex === index) continue;
      for (const type of relationBetweenBranches(base.branch, originalNajia.lines[otherIndex].branch)) lineRelations.push({ type, target: '爻', withPosition: otherIndex + 1, status: `与${LINE_POSITIONS[otherIndex]}爻${type}` });
      const elementReason = relationReason(base.element, originalNajia.lines[otherIndex].element);
      if (elementReason) lineRelations.push({ type: `五行${elementReason}`, target: '爻', withPosition: otherIndex + 1, status: `与${LINE_POSITIONS[otherIndex]}爻五行${elementReason}` });
    }
    const strength = strengthForLine({ lineElement: base.element, monthBranch: calendar.monthBranch, dayBranch: calendar.dayBranch, moving: line.moving, transformedElement: transformed.element });
    return {
      position: index + 1,
      label: `${LINE_POSITIONS[index]}爻`,
      value: line.value,
      polarity: polarity(line.value),
      moving: line.moving,
      changedPolarity: polarity(changedValue(line.value)),
      stem: base.stem,
      branch: base.branch,
      ganzhi: base.ganzhi,
      element: base.element,
      relative: relativeForElement(originalNajia.palaceElement, base.element),
      spirit: spirits[index],
      shi: index === shiYing.shiIndex,
      ying: index === shiYing.yingIndex,
      strength,
      relations: lineRelations,
      transformed: { stem: transformed.stem, branch: transformed.branch, ganzhi: transformed.ganzhi, element: transformed.element, relative: relativeForElement(originalNajia.palaceElement, transformed.element), relations: transformedRelations(base, transformed, line.moving) }
    };
  });
  const yongShen = recommendYongShen(category, rows);
  const chart = {
    version: 1,
    castingMethod: 'yarrow',
    castAt: normalizedTime.iso,
    timeZone: normalizedTime.timeZone,
    localDateTime: normalizedTime.localDateTime,
    question: String(question || '').trim().slice(0, 300),
    category: CATEGORY_KEYS.has(category) ? category : 'general',
    calendar,
    original: { index: originalIndex, name: hexagrams[originalIndex][2], palace: originalNajia.palace, palaceElement: originalNajia.palaceElement, lines: originalNajia.lines },
    changed: { index: changedIndex, name: hexagrams[changedIndex][2], lines: changedNajia.lines },
    relations: hexagramRelations(normalizedLines),
    shiYing: { shiIndex: shiYing.shiIndex, yingIndex: shiYing.yingIndex },
    yongShen,
    lines: rows
  };
  return yongShenOverride ? applyYongShenOverride(chart, yongShenOverride) : chart;
}
