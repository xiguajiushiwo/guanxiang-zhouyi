export function readingRule(moving, originalIndex) {
  const active = [...moving].sort((a, b) => a - b);
  const positions = active.map(index => index + 1);
  if (active.length === 0) return { text: '六爻皆静：以本卦卦辞为主要阅读依据。', primary: [] };
  if (active.length === 1) return { text: `一爻变：以本卦第${positions[0]}爻爻辞为主。`, primary: active };
  if (active.length === 2) return { text: `二爻变：同读本卦第${positions.join('、')}爻，以上位动爻为主。`, primary: active };
  if (active.length === 3) return { text: '三爻变：合读本卦与变卦卦辞，以本卦为主。', primary: [] };
  const still = [0, 1, 2, 3, 4, 5].filter(index => !active.includes(index));
  if (active.length === 4) return { text: `四爻变：读变卦第${still.map(index => index + 1).join('、')}爻，以较下的一爻为主。`, primary: still, fromChanged: true };
  if (active.length === 5) return { text: `五爻变：以变卦唯一不变的第${still[0] + 1}爻为主。`, primary: still, fromChanged: true };
  const special = originalIndex === 0 || originalIndex === 1;
  return { text: special ? '六爻皆变：乾坤依用九、用六，并参看变卦。' : '六爻皆变：以变卦卦辞为主。', primary: [], fromChanged: true };
}
