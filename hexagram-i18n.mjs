export const HEXAGRAM_EN = Object.freeze([
  'The Creative','The Receptive','Difficulty at the Beginning','Youthful Folly','Waiting','Conflict','The Army','Holding Together',
  'Small Taming','Treading','Peace','Standstill','Fellowship','Great Possession','Modesty','Enthusiasm',
  'Following','Work on What Has Been Spoiled','Approach','Contemplation','Biting Through','Grace','Splitting Apart','Return',
  'Innocence','Great Taming','Nourishment','Great Excess','The Abysmal','The Clinging','Influence','Duration',
  'Retreat','Great Power','Progress','Darkening of the Light','The Family','Opposition','Obstruction','Deliverance',
  'Decrease','Increase','Breakthrough','Coming to Meet','Gathering Together','Pushing Upward','Oppression','The Well',
  'Revolution','The Cauldron','The Arousing','Keeping Still','Development','The Marrying Maiden','Abundance','The Wanderer',
  'The Gentle','The Joyous','Dispersion','Limitation','Inner Truth','Preponderance of the Small','After Completion','Before Completion'
]);
export const TRIGRAM_EN = Object.freeze({ '天':'Heaven','泽':'Lake','火':'Fire','雷':'Thunder','风':'Wind','水':'Water','山':'Mountain','地':'Earth' });
export function displayHexagramName(index, language='zh-CN', chinese=''){ const english=HEXAGRAM_EN[index]||chinese; return language==='en' ? (chinese ? english+' ('+chinese+')' : english) : chinese||english; }