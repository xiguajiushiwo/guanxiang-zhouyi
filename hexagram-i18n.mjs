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
export const HEXAGRAM_FA = Object.freeze([
  'آسمان خلاق','زمین پذیرا','دشواری آغاز','نادانی جوانی','انتظار','کشمکش','سپاه','همبستگی',
  'اهلی‌سازی کوچک','گام‌برداشتن','صلح','ایستایی','همدلی','دارایی بزرگ','فروتنی','شور',
  'پیروی','ترمیم تباهی','نزدیک‌شدن','نگریستن','گازگرفتن','زیبایی','گسستن','بازگشت',
  'بی‌گناهی','اهلی‌سازی بزرگ','تغذیه','افزونی بزرگ','ژرفا','چسبندگی','تأثیر','پایداری',
  'عقب‌نشینی','قدرت بزرگ','پیشرفت','تاریک‌شدن نور','خانواده','مخالفت','مانع','رهایی',
  'کاهش','افزایش','گشایش','رویاروشدن','گردهمایی','پیش‌رفتن','فرسودگی','چاه',
  'دگرگونی','دیگ','برانگیختن','ساکن‌ماندن','رشد تدریجی','دختر ازدواج‌کننده','فراوانی','مسافر',
  'نرمی','شادی','پراکندگی','محدودیت','حقیقت درون','فزونی کوچک','پس از انجام','پیش از انجام'
]);
export const TRIGRAM_EN = Object.freeze({ '天':'Heaven','泽':'Lake','火':'Fire','雷':'Thunder','风':'Wind','水':'Water','山':'Mountain','地':'Earth' });
export const TRIGRAM_FA = Object.freeze({ '天':'آسمان','泽':'دریاچه','火':'آتش','雷':'رعد','风':'باد','水':'آب','山':'کوه','地':'زمین' });
export function displayHexagramName(index, language='zh-CN', chinese=''){
  const english=HEXAGRAM_EN[index]||chinese, persian=HEXAGRAM_FA[index]||english;
  if(language==='en')return chinese ? english+' ('+chinese+')' : english;
  if(language==='fa')return chinese ? persian+' ('+chinese+')' : persian;
  return chinese||english;
}
