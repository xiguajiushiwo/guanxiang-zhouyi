import { attributeHtml as attr, textHtml as text } from './html-safety.mjs';
import { journalStatus, MAX_JOURNAL_ENTRIES, normalizeJournal } from './journal.mjs';

const COPY = {
  title: ['跟进与复盘', 'Follow-up and reflection', 'پیگیری و بازنگری'],
  intro: ['留下当时的判断，记录现实中的变化。', 'Keep your initial view and follow what actually changes.', 'دیدگاه اولیه و تغییرات واقعی را ثبت کنید.'],
  all: ['全部记录', 'All readings', 'همه خوانش‌ها'], due: ['待复盘', 'Due for reflection', 'در انتظار بازنگری'], open: ['跟进中', 'Following up', 'در حال پیگیری'], reviewed: ['已复盘', 'Reviewed', 'بازنگری شده'],
  noDue: ['还没有到期的复盘。可以在记录中设定日期。', 'No reflections are due. Set a date inside a reading.', 'بازنگری سررسیدشده‌ای نیست. در خوانش تاریخ تعیین کنید.'],
  noReviewed: ['还没有完成的复盘。', 'No completed reflections yet.', 'هنوز بازنگری تکمیل‌شده‌ای نیست.'],
  plan: ['我的判断与行动', 'My view and next action', 'دیدگاه و اقدام من'],
  intention: ['当时的事实与我的判断', 'Initial facts and my own view', 'واقعیت‌های اولیه و دیدگاه من'],
  action: ['我准备采取的一个行动', 'One action I plan to take', 'یک اقدام که قصد انجامش را دارم'],
  date: ['复盘日期', 'Reflection date', 'تاریخ بازنگری'],
  dateHint: ['到期后会出现在“待复盘”中。', 'It will appear under Due for reflection on that date.', 'در آن تاریخ در بخش بازنگری‌های سررسیدشده نمایش داده می‌شود.'],
  savePlan: ['保存计划', 'Save plan', 'ذخیره برنامه'], saved: ['已保存', 'Saved', 'ذخیره شد'],
  progress: ['追加进展', 'Add an update', 'افزودن پیشرفت'],
  progressHint: ['记录新情况、已经做的事或收到的反馈。', 'Record new facts, actions taken, or feedback received.', 'واقعیت تازه، اقدام انجام‌شده یا بازخورد را ثبت کنید.'],
  saveProgress: ['保存进展', 'Save update', 'ذخیره پیشرفت'],
  review: ['完成一次复盘', 'Reflect on this reading', 'بازنگری این خوانش'],
  facts: ['后来实际发生了什么？', 'What actually happened?', 'در واقع چه اتفاقی افتاد؟'],
  actions: ['你采取了什么行动？', 'What actions did you take?', 'چه اقداماتی انجام دادید؟'],
  assessment: ['哪些判断有支持、没有支持，或仍无法判断？', 'Which views were supported, unsupported, or still uncertain?', 'کدام دیدگاه تأیید شد، نشد یا هنوز نامشخص است؟'],
  nextStep: ['重新面对这件事，你会怎么做？', 'What would you do differently next time?', 'بار دیگر چه کاری متفاوت انجام می‌دهید؟'],
  reviewHint: ['对照上方留存的解读与现实事实；无法判断的地方可以直接写明。', 'Compare the saved reading with the facts. State what remains uncertain.', 'خوانش ذخیره‌شده را با واقعیت مقایسه کنید و ابهام‌ها را بنویسید.'],
  saveReview: ['保存复盘', 'Save reflection', 'ذخیره بازنگری'], timeline: ['进展时间线', 'Timeline', 'خط زمانی'],
  empty: ['还没有进展，先留下一条观察。', 'No updates yet. Start with an observation.', 'هنوز پیشرفتی نیست. با یک مشاهده آغاز کنید.'],
  reopen: ['继续跟进', 'Continue following up', 'ادامه پیگیری'],
  error: ['保存失败，请导出已有记录或清理浏览器空间后重试。', 'Could not save. Export your records or free browser storage, then retry.', 'ذخیره نشد. از رکوردها خروجی بگیرید یا فضای مرورگر را آزاد کنید و دوباره تلاش کنید.'],
  entryLimit: ['本条已保存 100 次进展与复盘，请先导出归档。', 'This reading has 100 updates. Export it for archiving.', 'این خوانش ۱۰۰ به‌روزرسانی دارد. برای بایگانی خروجی بگیرید.'],
  original: ['首次留存的解读', 'First saved interpretation', 'نخستین تفسیر ذخیره‌شده'],
  current: ['依据当前资料生成的解读', 'Interpretation from current sources', 'تفسیر بر اساس منابع کنونی'],
  versions: ['历次 AI 解读', 'Saved AI interpretations', 'تفسیرهای ذخیره‌شده هوش مصنوعی'],
  versionHint: ['重新生成会另存一版，首次留存的内容会保留。', 'Regeneration saves another version and keeps the first saved reading.', 'تولید دوباره نسخه جدید می‌سازد و نسخه نخست را حفظ می‌کند.'],
  versionLimit: ['已保留 10 版解读，请先导出归档。', 'Ten versions are saved. Export them for archiving.', 'ده نسخه ذخیره شده است. برای بایگانی خروجی بگیرید.'],
  loading: ['正在载入经典资料…', 'Loading source texts…', 'در حال بارگذاری متون…'],
  unavailable: ['部分经典资料暂未载入，已保存的解读和复盘仍可使用。', 'Some sources are unavailable. Saved readings and reflection remain available.', 'بعضی منابع در دسترس نیستند. خوانش ذخیره‌شده و بازنگری قابل استفاده است.'],
  retry: ['重试载入', 'Retry loading', 'تلاش دوباره'],
  accountLoading: ['正在读取账户记录…', 'Loading account readings…', 'در حال بارگذاری خوانش‌های حساب…'],
  missing: ['未找到这条记录。', 'This reading was not found.', 'این خوانش یافت نشد.'],
};
export function journalCopy(key, language = 'zh-CN') { return COPY[key]?.[language === 'en' ? 1 : language === 'fa' ? 2 : 0] || key; }
export function journalFilterHtml(records, filter, language) {
  return ['all', 'due', 'reviewed'].map(key => `<button type="button" data-journal-filter="${key}" aria-pressed="${filter === key}">${journalCopy(key, language)} <span>${key === 'all' ? records.length : records.filter(record => journalStatus(record) === key).length}</span></button>`).join('');
}
export function journalBadgeHtml(record, language) {
  const status = journalStatus(record), date = record.journal?.reviewDate;
  return `<span class="journal-badge ${status}">${journalCopy(status, language)}${date && status !== 'reviewed' ? ` · ${text(date)}` : ''}</span>`;
}
export function mountJournal(container, record, {language, save}) {
  const copy = key => journalCopy(key, language), journal = normalizeJournal(record.journal);
  const field = (name, label, value = '', required = false) => `<label for="journal-${name}">${copy(label)}</label><textarea id="journal-${name}" name="${name}" rows="3" maxlength="2000" ${required ? 'required' : ''} data-user-content>${text(value)}</textarea>`;
  const locale = language === 'en' ? 'en-US' : language === 'fa' ? 'fa' : 'zh-CN';
  container.innerHTML = `<div class="journal-heading"><div><span class="panel-kicker">${copy('title')}</span><h2>${copy('intro')}</h2></div>${journalBadgeHtml(record, language)}</div>
    <form class="journal-plan"><h3>${copy('plan')}</h3>${field('intention', 'intention', journal.intention)}${field('action', 'action', journal.action)}
      <label for="journal-date">${copy('date')}</label><input id="journal-date" name="reviewDate" type="date" value="${attr(journal.reviewDate)}"><small>${copy('dateHint')}</small>
      <button class="secondary-button" type="submit">${copy('savePlan')}</button>${journal.status === 'reviewed' ? `<button class="text-button" type="button" data-journal-reopen>${copy('reopen')}</button>` : ''}</form>
    <form class="journal-progress"><h3>${copy('progress')}</h3><label for="journal-progress">${copy('progressHint')}</label><textarea id="journal-progress" name="facts" rows="3" maxlength="2000" required></textarea><button class="secondary-button" type="submit">${copy('saveProgress')}</button></form>
    <details class="journal-review"><summary>${copy('review')}</summary><p>${copy('reviewHint')}</p><form>${field('facts', 'facts', '', true)}${field('actions', 'actions', '', true)}${field('assessment', 'assessment', '', true)}${field('nextStep', 'nextStep', '', true)}<button class="primary-button" type="submit">${copy('saveReview')}</button></form></details>
    <p class="journal-save-status" role="status" aria-live="polite"></p>
    <section class="journal-timeline"><h3>${copy('timeline')}</h3>${journal.entries.length ? [...journal.entries].reverse().map(entry => `<article><header><b>${copy(entry.kind)}</b><time datetime="${attr(entry.createdAt)}">${text(new Date(entry.createdAt).toLocaleString(locale))}</time></header>${['facts', 'actions', 'assessment', 'nextStep'].filter(key => entry[key]).map(key => `<div>${entry.kind === 'review' ? `<small>${copy(key)}</small>` : ''}<p data-user-content>${text(entry[key])}</p></div>`).join('')}</article>`).join('') : `<p class="journal-empty">${copy('empty')}</p>`}</section>`;
  const status = container.querySelector('.journal-save-status');
  const commit = (transform, form) => {
    try {
      save(transform);
      form?.querySelectorAll('[data-dirty]').forEach(input => delete input.dataset.dirty);
      if (form && !form.classList.contains('journal-plan')) form.reset();
      status.textContent = copy('saved');
      container.dispatchEvent(new CustomEvent('journal:saved', {bubbles: true}));
    } catch (error) { status.textContent = copy(error.message === 'JOURNAL_ENTRY_LIMIT' ? 'entryLimit' : 'error'); }
  };
  container.querySelector('.journal-plan').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    commit(current => ({...normalizeJournal(current), intention: String(data.get('intention')), action: String(data.get('action')), reviewDate: String(data.get('reviewDate'))}), form);
  });
  const add = (form, kind) => form.addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(form);
    if (![...data.values()].every(value => String(value).trim())) return;
    commit(current => {
      const next = normalizeJournal(current);
      if (next.entries.length >= MAX_JOURNAL_ENTRIES) throw new Error('JOURNAL_ENTRY_LIMIT');
      return {...next, status: kind === 'review' ? 'reviewed' : next.status, entries: [...next.entries, {
        id: crypto.randomUUID(), kind, createdAt: new Date().toISOString(), facts: String(data.get('facts') || ''),
        actions: String(data.get('actions') || ''), assessment: String(data.get('assessment') || ''), nextStep: String(data.get('nextStep') || ''),
      }]};
    }, form);
  });
  add(container.querySelector('.journal-progress'), 'progress'); add(container.querySelector('.journal-review form'), 'review');
  container.querySelector('[data-journal-reopen]')?.addEventListener('click', () => commit(current => ({...normalizeJournal(current), status: 'open'})));
}
