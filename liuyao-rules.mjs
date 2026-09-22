import hexagrams from './hexagram-catalog.mjs';

export const ELEMENTS = ['木', '火', '土', '金', '水'];
const TRIGRAM_ELEMENTS = { 天: '金', 兑: '金', 离: '火', 震: '木', 雷: '木', 巽: '木', 风: '木', 乾: '金', 坎: '水', 水: '水', 艮: '土', 山: '土', 坤: '土', 地: '土' };

export const NAJIA_TRIGRAMS = {
  天: { inner: ['甲子', '甲寅', '甲辰'], outer: ['壬午', '壬申', '壬戌'] },
  地: { inner: ['乙未', '乙巳', '乙卯'], outer: ['癸丑', '癸亥', '癸酉'] },
  雷: { inner: ['庚子', '庚寅', '庚辰'], outer: ['庚午', '庚申', '庚戌'] },
  风: { inner: ['辛丑', '辛亥', '辛酉'], outer: ['辛未', '辛巳', '辛卯'] },
  水: { inner: ['戊寅', '戊辰', '戊午'], outer: ['戊申', '戊戌', '戊子'] },
  火: { inner: ['己卯', '己丑', '己亥'], outer: ['己酉', '己未', '己巳'] },
  山: { inner: ['丙辰', '丙午', '丙申'], outer: ['丙戌', '丙子', '丙寅'] },
  泽: { inner: ['丁巳', '丁卯', '丁丑'], outer: ['丁亥', '丁酉', '丁未'] }
};

const BRANCH_ELEMENTS = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const PALACE_SEQUENCES = {
  天: ['乾为天', '天风姤', '天山遯', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  水: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  山: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  雷: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  风: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  火: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  地: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  兑: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹']
};
const SHI_POSITIONS = [5, 0, 1, 2, 3, 4, 3, 2];
const HEXAGRAM_INDEX_BY_NAME = new Map(hexagrams.map((hexagram, index) => [hexagram[2], index]));

export const HEXAGRAM_PALACES = Object.fromEntries(Object.entries(PALACE_SEQUENCES).flatMap(([palace, names]) => names.map((name, sequence) => [HEXAGRAM_INDEX_BY_NAME.get(name), { palace, palaceElement: TRIGRAM_ELEMENTS[palace], sequence }])));

const SPIRIT_ORDER = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const SPIRIT_START = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };
const MONTH_STATUS = {
  寅: { 木: '旺', 火: '相', 水: '休', 土: '囚', 金: '死' }, 卯: { 木: '旺', 火: '相', 水: '休', 土: '囚', 金: '死' },
  辰: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' }, 巳: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  午: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' }, 未: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  申: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' }, 酉: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  戌: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' }, 亥: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  子: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' }, 丑: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' }
};
const BRANCH_PAIRS = {
  六合: [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']],
  六冲: [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']],
  六害: [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']],
  相破: [['子', '酉'], ['寅', '亥'], ['卯', '午'], ['辰', '丑'], ['巳', '申'], ['未', '戌']]
};
const TRIPLETS = [
  { branches: ['申', '子', '辰'], label: '半合水局' }, { branches: ['亥', '卯', '未'], label: '半合木局' },
  { branches: ['寅', '午', '戌'], label: '半合火局' }, { branches: ['巳', '酉', '丑'], label: '半合金局' }
];
const MEETING_TRIPLETS = [
  { branches: ['寅', '卯', '辰'], label: '半会木方' }, { branches: ['巳', '午', '未'], label: '半会火方' },
  { branches: ['申', '酉', '戌'], label: '半会金方' }, { branches: ['亥', '子', '丑'], label: '半会水方' }
];

const includesPair = (pairs, a, b) => pairs.some(([left, right]) => (left === a && right === b) || (left === b && right === a));
const includesTriplet = (groups, a, b) => groups.find(group => group.branches.includes(a) && group.branches.includes(b));
export const branchElement = branch => BRANCH_ELEMENTS[branch] || null;
export const elementGenerates = (source, target) => GENERATES[source] === target;
export const elementControls = (source, target) => CONTROLS[source] === target;

export function najiaForHexagram(index) {
  const hexagram = hexagrams[index];
  if (!hexagram) throw new RangeError('Unknown hexagram index');
  const lower = NAJIA_TRIGRAMS[hexagram[7]], upper = NAJIA_TRIGRAMS[hexagram[6]];
  const ganzhi = [...lower.inner, ...upper.outer];
  return {
    index,
    name: hexagram[2],
    palace: HEXAGRAM_PALACES[index]?.palace || null,
    palaceElement: HEXAGRAM_PALACES[index]?.palaceElement || null,
    lines: ganzhi.map((value, lineIndex) => ({
      position: lineIndex + 1,
      stem: value[0],
      branch: value[1],
      ganzhi: value,
      element: branchElement(value[1])
    }))
  };
}

export function shiYingForHexagram(index) {
  const palace = HEXAGRAM_PALACES[index];
  if (!palace) throw new RangeError('Unknown hexagram index');
  const shiIndex = SHI_POSITIONS[palace.sequence];
  return { ...palace, shiIndex, yingIndex: (shiIndex + 3) % 6 };
}

export function relativeForElement(palaceElement, lineElement) {
  if (!palaceElement || !lineElement) return null;
  if (palaceElement === lineElement) return '兄弟';
  if (elementGenerates(palaceElement, lineElement)) return '子孙';
  if (elementControls(palaceElement, lineElement)) return '妻财';
  if (elementGenerates(lineElement, palaceElement)) return '父母';
  if (elementControls(lineElement, palaceElement)) return '官鬼';
  return null;
}

export function relationBetweenBranches(sourceBranch, targetBranch) {
  if (!sourceBranch || !targetBranch) return [];
  const relations = [];
  for (const [label, pairs] of Object.entries(BRANCH_PAIRS)) if (includesPair(pairs, sourceBranch, targetBranch)) relations.push(label);
  const triple = includesTriplet(TRIPLETS, sourceBranch, targetBranch);
  if (triple) relations.push(triple.label);
  const meeting = includesTriplet(MEETING_TRIPLETS, sourceBranch, targetBranch);
  if (meeting) relations.push(meeting.label);
  if ((sourceBranch === targetBranch && ['辰', '午', '酉', '亥'].includes(sourceBranch)) || (sourceBranch !== targetBranch && ['子', '卯'].includes(sourceBranch) && ['子', '卯'].includes(targetBranch))) relations.push('相刑');
  if (sourceBranch !== targetBranch && ((['寅', '巳', '申'].includes(sourceBranch) && ['寅', '巳', '申'].includes(targetBranch)) || (['丑', '未', '戌'].includes(sourceBranch) && ['丑', '未', '戌'].includes(targetBranch)))) relations.push('相刑');
  return [...new Set(relations)];
}

export function sixSpiritsForDayStem(dayStem) {
  const start = SPIRIT_START[dayStem];
  if (start === undefined) throw new RangeError('Unknown day stem');
  return Array.from({ length: 6 }, (_, index) => SPIRIT_ORDER[(start + index) % SPIRIT_ORDER.length]);
}

function elementRelation(source, target) {
  if (source === target) return '同类';
  if (elementGenerates(source, target)) return '生';
  if (elementControls(source, target)) return '克';
  if (elementGenerates(target, source)) return '被生';
  if (elementControls(target, source)) return '被克';
  return '无';
}

export function strengthForLine({ lineElement, monthBranch, dayBranch, moving = false, transformedElement = null }) {
  const label = MONTH_STATUS[monthBranch]?.[lineElement] || '平';
  const reasons = [`月建${monthBranch}${label}`];
  const monthElement = branchElement(monthBranch), dayElement = branchElement(dayBranch);
  if (dayElement) reasons.push(`日辰${dayBranch}${elementRelation(dayElement, lineElement)}`);
  if (moving) reasons.push('动爻得变');
  if (transformedElement && transformedElement !== lineElement) reasons.push(`化${transformedElement}`);
  return { label, reasons };
}

export { BRANCH_ELEMENTS, CONTROLS, GENERATES, MONTH_STATUS, TRIGRAM_ELEMENTS };
