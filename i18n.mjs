export const LANGUAGES = Object.freeze({ 'zh-CN': '中文', en: 'English', fa: 'فارسی' });
export const LANGUAGE_STORAGE_KEY = 'guanxiang-language';
export const LANGUAGE_META = Object.freeze({
  'zh-CN': { label: '中文', locale: 'zh-CN', direction: 'ltr' },
  en: { label: 'English', locale: 'en', direction: 'ltr' },
  fa: { label: 'فارسی', locale: 'fa', direction: 'rtl' },
});

const PERSIAN_OVERRIDES = {
  'app.title': 'گوانشیانگ · مطالعه ژوئی',
  'nav.home': 'نمای کلی مطالعه', 'nav.hexagrams': '۶۴ هگزاگرام', 'nav.divination': 'روش اشتقاق بزرگ',
  'nav.history': 'دفترچه', 'nav.classics': 'ده بال', 'nav.principles': 'اصول', 'nav.more': 'بیشتر',
  'nav.classicsIndex': 'فهرست متون', 'nav.closeMore': 'بستن منوی بیشتر', 'brand.subtitle': 'مطالعه ژوئی',
  'cover.masthead': 'مطالعه ژوئی و روش اشتقاق بزرگ', 'cover.overline': 'مشاهده تصویر · خواندن متن · پیگیری اصول',
  'cover.quote': 'با مشاهده نقش‌های آسمان، تغییرات زمان را بشناسید', 'cover.footer': '۶۴ هگزاگرام · ده بال · اصول · پیشگویی',
  'cover.enter': 'ورود به گوانشیانگ', 'cover.caption': 'از تصویر وارد شوید؛ روشنایی از تغییر می‌آید',
  'home.eyebrow': 'مشاهده · خواندن · فهمیدن', 'home.title': 'در میان تغییر، آنچه تغییر نمی‌کند را ببینید.',
  'home.description': 'از راه هگزاگرام‌ها وارد شوید و متن کلاسیک و تفسیرهای آن را با آرامش بخوانید. گوانشیانگ ۶۴ هگزاگرام، ده بال، اصول و آیین کامل اشتقاق بزرگ را گرد هم می‌آورد.',
  'home.descriptionCompact': '۶۴ هگزاگرام، ده بال و اصول را مطالعه کنید یا پرسشی را به آیین اشتقاق بزرگ بسپارید.',
  'home.start': 'آغاز یک خوانش', 'home.startNote': 'آیین کامل یا فال‌گیری سریع', 'home.browse': 'مرور هگزاگرام‌ها', 'home.quickAccess': 'از اینجا آغاز کنید',
  'home.pathsLabel': 'مسیرهای مطالعه', 'home.hexShort': 'حکم، متن خطوط و تصویر', 'home.wingsShort': 'همه تفسیرها را به ترتیب بخوانید', 'home.principlesShort': 'تصویر، عدد، زمان و تغییر',
  'home.quickNote': 'متون کلاسیک، تصویرها و یک پرسش', 'home.hexDesc': 'تصویرها، احکام و متن خطوط را به ترتیب مرور کنید.',
  'home.wingDesc': 'فهرستی از تفسیرهای توآن، تصویر، شی‌تسو و وِن‌یَن.', 'home.divinationDesc': 'تقسیم، کنارگذاری و شمارش چهارتایی را خط‌به‌خط دنبال کنید.',
  'home.quote': 'ای تغییر، بی‌اندیشه و بی‌کنشی؛ آرام و بی‌حرکت، پاسخ می‌دهد و امور جهان را درمی‌نوردد.',
  'hex.title': '۶۴ هگزاگرام', 'hex.description': 'شش خط یک هگزاگرام می‌سازد. یکی را انتخاب کنید تا متن‌ها و یادداشت‌های آن باز شود.',
  'hex.search': 'جست‌وجوی نام، حکم یا کلیدواژه', 'filter.all': 'همه', 'filter.upper': 'بخش نخست (۱–۳۰)', 'filter.lower': 'بخش دوم (۳۱–۶۴)',
  'hex.notFound': 'هگزاگرام منطبق یافت نشد', 'hex.back': 'بازگشت به هگزاگرام‌ها', 'hex.order': 'هگزاگرام {n} · {section}', 'hex.upper': 'بخش نخست', 'hex.lower': 'بخش دوم',
  'hex.judgment': 'حکم · 卦辞', 'hex.tuan': 'تفسیر توآن · 彖传', 'hex.xiang': 'تفسیر تصویر · 象传', 'hex.lines': 'متن خطوط · 爻辞',
  'hex.related': 'پیوندهای ده بال', 'hex.loading': 'فهرست پیوندها در حال بارگذاری است.',
  'classics.title': 'ده بال', 'classics.description': 'ده بال را به ترتیب کلاسیک بخوانید. برای رفتن به هر بخش آن را انتخاب کنید.',
  'classics.ancient': 'ترتیب کلاسیک', 'classics.modern': 'خوانش امروزی', 'classics.search': 'جست‌وجوی متن اصلی',
  'classics.bookmark': 'نشان‌گذاری این اثر', 'classics.bookmarked': 'نشان‌گذاری شد', 'classics.noMatch': 'متن منطبقی در ده بال یافت نشد.',
  'principles.title': 'اصول', 'principles.description': 'نقشه‌ای قابل بازبینی از خطوط، تصویرها، اعداد، زمان و تغییر بسازید.',
  'principles.count': 'موضوع', 'principles.path': 'مسیر مطالعه', 'principles.pathTitle': 'مسیر هشت‌مرحله‌ای مطالعه', 'principles.done': 'تکمیل‌شده', 'principles.markDone': 'علامت‌گذاری به‌عنوان مرورشده',
  'divination.title': 'روش اشتقاق بزرگ', 'divination.questionTitle': 'پرسش را دقیق کنید', 'divination.questionPlaceholder': 'یک پرسش مشخص بنویسید؛ برای نمونه: در مصاحبه هفته آینده به چه چیزی توجه کنم؟',
  'divination.confirm': 'تأیید پرسش و آغاز', 'divination.confirmed': 'پرسش تأیید شد', 'divination.reset': 'از نو آغاز کردن', 'divination.next': 'آغاز خوانش بعدی',
  'divination.complete': 'آیین کامل', 'divination.quick': 'فال‌گیری سریع', 'divination.prepare': 'برای آغاز پرسش را تأیید کنید', 'divination.records': 'ثبت آیین',
  'divination.empty': 'سه تغییر یک خط می‌سازد\nشش خط از پایین به بالا شکل می‌گیرد', 'divination.result': 'اصلی · پیوسته', 'divination.reading': 'این خوانش', 'divination.openFull': 'باز کردن متن کامل هگزاگرام',
  'history.title': 'دفترچه', 'history.description': 'خوانش‌های کامل‌شده در این مرورگر می‌مانند و هر زمان قابل بازبینی‌اند.', 'history.search': 'جست‌وجوی پرسش، هگزاگرام یا یادداشت',
  'history.export': 'خروجی گرفتن', 'history.import': 'وارد کردن رکوردها', 'history.none': 'هنوز خوانشی ثبت نشده', 'history.emptyDescription': 'پس از یک خوانش کامل، هگزاگرام و پرسش شما اینجا ظاهر می‌شود.',
  'history.noMatch': 'رکورد منطبقی نیست', 'history.noMatchDescription': 'کلیدواژه یا نام هگزاگرام دیگری را امتحان کنید.', 'history.localOnly': 'فقط در این مرورگر ذخیره می‌شود', 'history.selectPrompt': 'یک رکورد را برای دیدن نتیجه کامل انتخاب کنید.',
  'history.searchEmpty': 'نتیجه‌ای یافت نشد.', 'history.back': 'بازگشت به دفترچه', 'history.timeMissing': 'زمان ثبت نشده', 'history.hasNote': 'دارای یادداشت',
  'history.noteLabel': 'یادداشت مطالعه', 'history.notePlaceholder': 'مشاهده‌ها و اقدام‌های بعدی را ثبت کنید.', 'history.openHex': 'باز کردن متن هگزاگرام اصلی', 'history.saveNote': 'ذخیره یادداشت', 'history.delete': 'حذف رکورد',
  'history.deleteConfirm': 'این خوانش حذف شود؟ این کار برگشت‌پذیر نیست.', 'history.deleted': 'خوانش حذف شد.', 'history.questionLabel': 'پرسش', 'history.linesLabel': 'شکل شش‌خطی', 'history.linesHint': 'از پایین به بالا گرفته شده و از خط بالایی نمایش داده می‌شود',
  'reading.local': 'تفسیر آفلاین', 'reading.ai': 'خوانش عمیق هوش مصنوعی', 'reading.generate': 'تولید خوانش هوش مصنوعی', 'reading.note': 'یادداشت من', 'reading.save': 'ذخیره یادداشت',
  'reading.original': '۱ · متن کلاسیک', 'reading.rule': '۲ · روش خط متغیر', 'reading.structure': '۳ · ساختار هگزاگرام', 'reading.principle': '۴ · راهنمای اصل', 'reading.related': 'بخش‌های مرتبط ده بال', 'reading.offline': 'قابل استفاده آفلاین · قابل بازبینی',
  'reading.core': 'قضاوت اصلی', 'reading.situation': 'وضعیت کنونی', 'reading.turningPoint': 'تغییر کلیدی', 'reading.trend': 'روند پیش‌رو', 'reading.actions': 'پیشنهادهای عملی', 'reading.cautions': 'نکات قابل توجه',
  'reading.basis': 'مبنا', 'reading.current': 'این تفسیر', 'reading.question': 'پرسش: {question}', 'reading.aiSaved': 'نتیجه کامل ذخیره‌شده', 'reading.regenerate': 'تولید دوباره', 'reading.generating': 'در حال خوانش', 'reading.retry': 'تلاش دوباره', 'reading.unconfigured': 'خدمت هوش مصنوعی تنظیم نشده است', 'reading.moving': 'خط‌های متغیر: {lines}', 'reading.still': 'هر شش خط ثابت‌اند',
  'dialog.cancel': 'لغو', 'dialog.continue': 'ادامه آیین', 'dialog.confirm': 'تأیید', 'dialog.thinkAgain': 'دوباره فکر کنید', 'dialog.confirmBegin': 'آماده‌ام، آغاز کنید', 'dialog.later': 'بعداً', 'dialog.startReading': 'شروع مطالعه',
  'dialog.importKicker': 'وارد کردن رکوردها', 'dialog.importTitle': 'این رکوردهای محلی ادغام شوند؟', 'dialog.importLoading': 'در حال خواندن فایل.', 'dialog.confirmImport': 'ادغام رکوردها',
  'common.loading': 'در حال بارگذاری…', 'common.noData': 'داده‌ای نیست', 'common.saved': 'ذخیره شد', 'common.copy': 'کپی پیوند بخش', 'common.delete': 'حذف', 'common.close': 'بستن', 'common.today': 'امروز',
  'edition.status': 'وضعیت نسخه', 'edition.source': 'منبع: ', 'edition.dataDate': 'تاریخ داده: ', 'edition.dateMissing': 'تاریخ ثبت نشده', 'edition.unspecified': 'مشخص نشده', 'edition.variants': 'اختلاف نسخه‌ها جداگانه مقابله نشده‌اند؛ متن از نسخه انتخابی است',
  'language.label': 'زبان', 'language.zh': 'چینی', 'language.en': 'انگلیسی',
  'language.fa': 'فارسی',
  'auth.title': 'حساب گوانشیانگ', 'auth.login': 'ورود', 'auth.register': 'ثبت‌نام', 'auth.email': 'ایمیل', 'auth.password': 'رمز عبور', 'auth.submitLogin': 'ورود به حساب', 'auth.submitRegister': 'ساخت حساب', 'auth.logout': 'خروج', 'auth.guest': 'حالت مهمان', 'auth.guestDescription': 'رکوردها فقط در این دستگاه ذخیره می‌شوند.', 'auth.accountDescription': 'رکوردهای شما در دستگاه‌های مختلف همگام می‌شوند.', 'auth.mergeTitle': 'رکوردهای این دستگاه ادغام شوند؟', 'auth.mergeBody': 'رکوردهای محلی قدیمی حفظ می‌شوند و به حساب شما اضافه خواهند شد.', 'auth.merge': 'ادغام رکوردها', 'auth.keepCloud': 'فقط رکوردهای ابری', 'auth.invalid': 'ایمیل یا رمز عبور معتبر نیست.', 'auth.network': 'خدمت حساب موقتاً در دسترس نیست.', 'auth.loggedIn': 'وارد شده‌اید',
};

const DICTIONARY = {
  'zh-CN': {
    'app.title': '观象 · 周易研读',
    'nav.home': '研读总览', 'nav.hexagrams': '六十四卦', 'nav.divination': '大衍筮法',
    'nav.history': '占问记录', 'nav.classics': '十翼与易传', 'nav.principles': '易理体系', 'nav.more': '更多',
    'nav.classicsIndex': '典籍索引', 'nav.closeMore': '关闭更多菜单', 'brand.subtitle': 'ZHOUYI STUDY',
    'cover.masthead': '周易研读与大衍筮法', 'cover.overline': '观象 · 玩辞 · 穷理',
    'cover.quote': '观乎天文，以察时变', 'cover.footer': '六十四卦 · 十翼 · 易理 · 筮法',
    'cover.enter': '进入观象', 'cover.caption': '循象而入，因变而明',
    'home.eyebrow': '观象 · 玩辞 · 穷理', 'home.title': '在变化之中，见不变之理。',
    'home.description': '以卦象为门，循《易》之经与传，安静地读完一部关于变化的书。这里收录六十四卦经文、十翼与易理纲要，并以大衍筮法还原一次古老的提问。',
    'home.descriptionCompact': '研读六十四卦、十翼与易理，也以大衍筮法郑重回应一问。',
    'home.start': '开始一卜', 'home.startNote': '完整仪式或快速演蓍', 'home.browse': '浏览六十四卦', 'home.quickAccess': '从这里开始',
    'home.pathsLabel': '研读入口', 'home.hexShort': '卦辞、爻辞与象传', 'home.wingsShort': '循篇次读完整传文', 'home.principlesShort': '象数、时位与变化',
    'home.quickNote': '经典、卦象与一问', 'home.hexDesc': '按序浏览卦象、卦辞、爻辞与象传。',
    'home.wingDesc': '彖、象、系辞、文言等传文索引。', 'home.divinationDesc': '依古法分二、挂一、揲四，逐爻成卦。',
    'home.quote': '易，无思也，无为也，寂然不动，感而遂通天下之故。',
    'hex.title': '六十四卦', 'hex.description': '一卦六爻，内外相感。选择一卦，展开其经文与易理。',
    'hex.search': '搜索卦名、卦辞或关键词', 'filter.all': '全部', 'filter.upper': '上经（1–30）', 'filter.lower': '下经（31–64）',
    'hex.notFound': '未找到相应卦象', 'hex.back': '返回卦象列表', 'hex.order': '第 {n} 卦 · {section}', 'hex.upper': '上经', 'hex.lower': '下经',
    'hex.judgment': '卦辞 · THE JUDGMENT', 'hex.tuan': '彖传 · 本卦总断', 'hex.xiang': '象传 · 大象与小象',
    'hex.lines': '爻辞 · 六爻与用九/用六', 'hex.related': '十翼关联 · 经传互参', 'hex.loading': '关联索引正在载入。',
    'classics.title': '易传十翼', 'classics.description': '依古籍卷次，从右向左读十翼。选择篇次，可直接定位。',
    'classics.ancient': '古籍次序', 'classics.modern': '现代纵读', 'classics.search': '搜索十翼原文',
    'classics.bookmark': '收藏本篇', 'classics.bookmarked': '已收藏本篇', 'classics.noMatch': '十翼原文中没有找到这个词。',
    'principles.title': '易理体系', 'principles.description': '从卦爻、象数、时位、变化与学派流变，建立可复核的观易地图。',
    'principles.count': '研读专题', 'principles.path': '循序研读', 'principles.pathTitle': '八步学习路径',
    'principles.done': '已完成', 'principles.markDone': '标记为已复习',
    'divination.title': '大衍筮法', 'divination.questionTitle': '先把问题问清楚', 'divination.questionPlaceholder': '写下一个具体问题，例如：下周的面试，我应当注意什么？',
    'divination.confirm': '确认问题，进入仪式', 'divination.confirmed': '问题已确认', 'divination.reset': '重新开始', 'divination.next': '开始下一卦',
    'divination.complete': '完整仪式', 'divination.quick': '快速演蓍', 'divination.prepare': '请先确认此次所问',
    'divination.records': '筮法记录', 'divination.empty': '三变成一爻\n六爻自下而上',
    'divination.result': '本卦 · 变卦', 'divination.reading': '本次阅读', 'divination.openFull': '打开六十四卦全文',
    'history.title': '占问记录', 'history.description': '完成的卦象只保存在此浏览器，可随时回来研读。',
    'history.search': '搜索问题、卦名或札记', 'history.export': '导出记录', 'history.import': '导入记录',
    'history.none': '尚无占问记录', 'history.emptyDescription': '完成一次占筮后，卦象与所问会保存在这里。', 'history.noMatch': '没有匹配的记录', 'history.noMatchDescription': '换一个问题关键词、卦名或札记内容。', 'history.localOnly': '仅保存在此浏览器', 'history.selectPrompt': '选择一条记录查看完整占卜结果。', 'history.searchEmpty': '搜索结果为空。', 'history.back': '返回记录列表', 'history.timeMissing': '时间未记录', 'history.hasNote': '有札记',
    'history.noteLabel': '研读札记', 'history.notePlaceholder': '记下后续的观察与行动。', 'history.openHex': '打开本卦全文', 'history.saveNote': '保存札记', 'history.delete': '删除记录', 'history.deleteConfirm': '确定删除这条占问记录？此操作无法撤销。', 'history.deleted': '这条占问记录已删除。', 'history.questionLabel': '此次所问', 'history.linesLabel': '六爻成卦', 'history.linesHint': '自下而上所得，页面依上爻至初爻排列', 'history.importSummary': '文件含 {count} 条有效记录：新增 {added} 条，更新 {updated} 条，同时间冲突 {conflicts} 条。冲突会保留本机札记并合并标签。', 'history.importInvalid': '导入失败：文件不是有效的观象占问记录。', 'history.imported': '已合并 {count} 条记录。',
    'annotations.count': '{count} 条',
    'reading.local': '本地规则解读', 'reading.ai': 'AI 深度解读', 'reading.generate': '生成 AI 深度解读',
    'reading.note': '我的札记', 'reading.save': '保存札记', 'reading.original': '一 · 经文原文',
    'reading.rule': '二 · 变爻规则', 'reading.structure': '三 · 卦象结构', 'reading.principle': '四 · 易理提示',
    'reading.related': '与本卦相关的十翼原文', 'reading.offline': '离线可用 · 可复核',
    'reading.core': '核心判断', 'reading.situation': '当前处境', 'reading.turningPoint': '关键变化',
    'reading.trend': '后续趋势', 'reading.actions': '行动建议', 'reading.cautions': '需要留意',
    'reading.basis': '依据', 'reading.current': '本次解读', 'reading.question': '所问：{question}',
    'reading.focus': '以下内容分层展示：经文保留底本原文；变爻规则与易理提示是后世研读辅助，不冒充《周易》原句。',
    'reading.aiPrivacy': '此次所问与卦象资料会发送至 Cloudflare Workers AI；完整结果只保存在此浏览器。',
    'reading.aiSaved': '已保存的完整结果', 'reading.regenerate': '重新生成', 'reading.generating': '正在解读', 'reading.retry': '重新尝试', 'reading.unconfigured': 'AI 服务尚未配置',
    'reading.moving': '动爻：{lines}爻', 'reading.still': '六爻皆静',
    'classics.loading': '十翼原文正在载入…', 'classics.fallbackSummary': '依底本次序编排，保留原文段落。', 'classics.fallbackQuote': '原文 · 依底本录入',
    'classics.wing': 'WING {n}', 'classics.copySection': '复制{title}第{n}段链接', 'classics.progress': '第 {current} / 10 篇 · {count} 段', 'classics.found': '找到 {count} 段',
    'classics.edition': '底本：{edition} · {source}', 'classics.linkCopied': '本段链接已复制。', 'classics.linkLocated': '已定位到本段，可从地址栏复制链接。',
    'principles.loading': '易理纲要正在载入…', 'principles.kicker': 'PRINCIPLE', 'principles.completed': '{done} / {total} 已完成', 'principles.completedLabel': '已完成', 'principles.markReviewed': '标记为已复习',
    'history.stored': '占问存录', 'history.quick': '快速演蓍', 'history.complete': '完整仪式',
    'dialog.cancel': '取消', 'dialog.continue': '继续本次仪式', 'dialog.confirm': '确认',
    'dialog.divinationKicker': '问卦之前', 'dialog.divinationTitle': '占筮当慎',
    'dialog.divinationBodyOne': '请勿随意起卦。开始之前，请暂放杂念，静下心来，以平和、诚敬之心专注于一件真正需要思考的事。',
    'dialog.divinationBodyTwo': '卦象与解读用于经典研读和自我反思，结果仅供参考，不应替代现实判断，也不能替代医疗、法律或财务等专业建议。',
    'dialog.thinkAgain': '再想一想', 'dialog.confirmBegin': '我已静心，确认开始',
    'dialog.resetKicker': '重新开始', 'dialog.resetTitle': '舍弃本次进度？',
    'dialog.resetBody': '当前问题、已完成的爻和三变记录都会被清除，此操作无法撤销。',
    'dialog.continueRitual': '继续本次仪式', 'dialog.confirmReset': '确认重新开始',
    'dialog.onboardingKicker': '初次使用 · 观象入门', 'dialog.onboardingTitle': '先知道自己正在做什么',
    'dialog.onboardingOneTitle': '一、把问题问具体', 'dialog.onboardingOneBody': '一次只问一件事，写出情境、时间和你想辨明的方向。',
    'dialog.onboardingTwoTitle': '二、十八变成一爻', 'dialog.onboardingTwoBody': '完整模式会逐步演示分二、挂一、揲四、归奇，三变得到一爻。',
    'dialog.onboardingThreeTitle': '三、完整与快速', 'dialog.onboardingThreeBody': '完整仪式由你逐步推进；快速演蓍每次点击完成一爻，但仍使用同一套算法。',
    'dialog.onboardingFourTitle': '四、结果是研读材料', 'dialog.onboardingFourBody': '卦辞、爻辞和后人规则用于自我反思，不替代医疗、法律或财务判断。',
    'dialog.later': '以后再看', 'dialog.startReading': '开始阅读',
    'dialog.importKicker': '导入记录', 'dialog.importTitle': '确认合并本地记录？', 'dialog.importLoading': '正在读取记录。',
    'dialog.confirmImport': '确认合并',
    'common.loading': '正在载入…', 'common.noData': '暂无数据', 'common.saved': '已保存',
    'common.copy': '复制本段链接', 'common.delete': '删除', 'common.close': '关闭', 'common.today': '今日',
    'edition.status': '底本状态', 'edition.source': '来源：', 'edition.dataDate': '数据时间：',
    'edition.dateMissing': '日期未记录', 'edition.unspecified': '未标注', 'edition.variants': '异文：当前未另列校勘，原文依底本录入',
    'language.label': 'Language', 'language.zh': '中文', 'language.en': 'English',
  },
  en: {
    'app.title': 'Guanxiang · Zhouyi Study',
    'nav.home': 'Study overview', 'nav.hexagrams': '64 Hexagrams', 'nav.divination': 'Great Derivation',
    'nav.history': 'Journal', 'nav.classics': 'Ten Wings', 'nav.principles': 'Principles', 'nav.more': 'More',
    'nav.classicsIndex': 'Classics index', 'nav.closeMore': 'Close More menu', 'brand.subtitle': 'ZHOUYI STUDY',
    'cover.masthead': 'Zhouyi study & Great Derivation', 'cover.overline': 'Observe images · Play with the text · Trace principles',
    'cover.quote': 'Observe the patterns of heaven to discern the changes of time', 'cover.footer': '64 hexagrams · Ten Wings · Principles · Divination',
    'cover.enter': 'Enter Guanxiang', 'cover.caption': 'Enter through images; clarity follows change',
    'home.eyebrow': 'Observe · Read · Understand', 'home.title': 'Within change, perceive what does not change.',
    'home.description': 'Enter through the hexagrams and read the Classic and its commentaries at a measured pace. Guanxiang brings together the 64 hexagrams, the Ten Wings, a study of principles, and a complete Great Derivation ritual.',
    'home.descriptionCompact': 'Study the 64 hexagrams, the Ten Wings, and core principles, or bring one question to the Great Derivation ritual.',
    'home.start': 'Begin a reading', 'home.startNote': 'Complete ritual or quick casting', 'home.browse': 'Browse the hexagrams', 'home.quickAccess': 'Start here',
    'home.pathsLabel': 'Study paths', 'home.hexShort': 'Judgment, line texts, and Image', 'home.wingsShort': 'Read every commentary in order', 'home.principlesShort': 'Images, numbers, timing, and change',
    'home.quickNote': 'Classics, images, and one question', 'home.hexDesc': 'Browse the images, judgments, line texts, and Image commentaries in order.',
    'home.wingDesc': 'An index to the Tuan, Image, Xici, Wenyan, and other commentaries.', 'home.divinationDesc': 'Follow the classical divide, set aside, count-by-four process, line by line.',
    'home.quote': 'The Yi is without thought and without action; still and unmoving, it responds and penetrates the affairs of the world.',
    'hex.title': '64 Hexagrams', 'hex.description': 'Six lines form one hexagram. Select one to open its texts and study notes.',
    'hex.search': 'Search names, judgments, or keywords', 'filter.all': 'All', 'filter.upper': 'Upper Canon (1–30)', 'filter.lower': 'Lower Canon (31–64)',
    'hex.notFound': 'No matching hexagram', 'hex.back': 'Back to hexagrams', 'hex.order': 'Hexagram {n} · {section}', 'hex.upper': 'Upper Canon', 'hex.lower': 'Lower Canon',
    'hex.judgment': 'Judgment · 卦辞', 'hex.tuan': 'Tuan commentary · 彖传', 'hex.xiang': 'Image commentary · 象传',
    'hex.lines': 'Line texts · 爻辞', 'hex.related': 'Ten Wings links', 'hex.loading': 'Related index is loading.',
    'classics.title': 'The Ten Wings', 'classics.description': 'Read the Ten Wings in their classical sequence. Select a work to jump to it.',
    'classics.ancient': 'Classical sequence', 'classics.modern': 'Modern reading', 'classics.search': 'Search the original text',
    'classics.bookmark': 'Bookmark this work', 'classics.bookmarked': 'Bookmarked', 'classics.noMatch': 'No matching passage in the Ten Wings.',
    'principles.title': 'Principles', 'principles.description': 'Build a reviewable map through lines, images, numbers, timing, change, and schools of thought.',
    'principles.count': 'topics', 'principles.path': 'Study path', 'principles.pathTitle': 'Eight-step study path',
    'principles.done': 'Completed', 'principles.markDone': 'Mark as reviewed',
    'divination.title': 'Great Derivation', 'divination.questionTitle': 'Make the question precise', 'divination.questionPlaceholder': 'Write one specific question, for example: What should I pay attention to in next week’s interview?',
    'divination.confirm': 'Confirm question and begin', 'divination.confirmed': 'Question confirmed', 'divination.reset': 'Start over', 'divination.next': 'Start next reading',
    'divination.complete': 'Complete ritual', 'divination.quick': 'Quick casting', 'divination.prepare': 'Confirm your question to begin',
    'divination.records': 'Ritual record', 'divination.empty': 'Three changes make one line\nSix lines rise from the bottom',
    'divination.result': 'Primary · Relating', 'divination.reading': 'This reading', 'divination.openFull': 'Open full hexagram text',
    'history.title': 'Journal', 'history.description': 'Completed readings stay in this browser and can be revisited at any time.',
    'history.search': 'Search questions, hexagrams, or notes', 'history.export': 'Export records', 'history.import': 'Import records',
    'history.none': 'No readings yet', 'history.emptyDescription': 'Your hexagram and question will appear here after a completed reading.', 'history.noMatch': 'No matching records', 'history.noMatchDescription': 'Try another question keyword, hexagram name, or note.', 'history.localOnly': 'Stored only in this browser', 'history.selectPrompt': 'Select a journal entry to view the complete reading.', 'history.searchEmpty': 'No search results.', 'history.back': 'Back to journal', 'history.timeMissing': 'Time not recorded', 'history.hasNote': 'Has note',
    'history.noteLabel': 'Study note', 'history.notePlaceholder': 'Record later observations and actions.', 'history.openHex': 'Open the primary hexagram text', 'history.saveNote': 'Save note', 'history.delete': 'Delete record', 'history.deleteConfirm': 'Delete this reading? This cannot be undone.', 'history.deleted': 'Reading deleted.', 'history.questionLabel': 'Question asked', 'history.linesLabel': 'Six-line figure', 'history.linesHint': 'Cast from the bottom upward; shown here from top line to first line', 'history.importSummary': 'The file contains {count} valid records: {added} new, {updated} updated, and {conflicts} same-time conflicts. Local notes will be kept and tags merged.', 'history.importInvalid': 'Import failed: this is not a valid Guanxiang journal file.', 'history.imported': 'Merged {count} records.',
    'annotations.count': '{count} annotations',
    'reading.local': 'Offline interpretation', 'reading.ai': 'AI deep reading', 'reading.generate': 'Generate AI reading',
    'reading.note': 'My note', 'reading.save': 'Save note', 'reading.original': 'I · Classic text',
    'reading.rule': 'II · Changing-line method', 'reading.structure': 'III · Hexagram structure', 'reading.principle': 'IV · Principle prompt',
    'reading.related': 'Ten Wings passages related to this hexagram', 'reading.offline': 'Available offline · Reviewable',
    'reading.core': 'Core judgment', 'reading.situation': 'Present situation', 'reading.turningPoint': 'Key change',
    'reading.trend': 'Developing trend', 'reading.actions': 'Suggested actions', 'reading.cautions': 'Watch for',
    'reading.basis': 'Basis', 'reading.current': 'This interpretation', 'reading.question': 'Question: {question}',
    'reading.focus': 'The sections below separate the source text from later methods and study prompts; none are presented as original Zhouyi wording.',
    'reading.aiPrivacy': 'Your question and hexagram data are sent to Cloudflare Workers AI; the complete result remains only in this browser.',
    'reading.aiSaved': 'Saved complete result', 'reading.regenerate': 'Generate again', 'reading.generating': 'Reading', 'reading.retry': 'Try again', 'reading.unconfigured': 'AI service is not configured',
    'reading.moving': 'Changing lines: {lines}', 'reading.still': 'All six lines are still',
    'classics.loading': 'Loading the Ten Wings…', 'classics.fallbackSummary': 'Arranged in source order; original paragraphs are preserved.', 'classics.fallbackQuote': 'Original text · from the selected edition',
    'classics.wing': 'WING {n}', 'classics.copySection': 'Copy link to {title}, section {n}', 'classics.progress': 'Work {current} / 10 · {count} sections', 'classics.found': '{count} sections found',
    'classics.edition': 'Edition: {edition} · {source}', 'classics.linkCopied': 'Passage link copied.', 'classics.linkLocated': 'Located this passage; copy the link from the address bar.',
    'principles.loading': 'Loading principles…', 'principles.kicker': 'PRINCIPLE', 'principles.completed': '{done} / {total} completed', 'principles.completedLabel': 'Completed', 'principles.markReviewed': 'Mark as reviewed',
    'history.stored': 'Journal entry', 'history.quick': 'Quick casting', 'history.complete': 'Complete ritual',
    'dialog.cancel': 'Cancel', 'dialog.continue': 'Continue ritual', 'dialog.confirm': 'Confirm',
    'dialog.divinationKicker': 'Before consulting', 'dialog.divinationTitle': 'Approach the consultation with care',
    'dialog.divinationBodyOne': 'Do not cast casually. Before you begin, set aside distractions and focus calmly and sincerely on one question that truly needs attention.',
    'dialog.divinationBodyTwo': 'The hexagram and interpretation are for classical study and self-reflection. They are reference material, not a substitute for personal, medical, legal, or financial judgment.',
    'dialog.thinkAgain': 'Think again', 'dialog.confirmBegin': 'I am settled and ready to begin',
    'dialog.resetKicker': 'Start over', 'dialog.resetTitle': 'Discard this reading in progress?',
    'dialog.resetBody': 'The current question, completed lines, and change records will be cleared. This cannot be undone.',
    'dialog.continueRitual': 'Continue this ritual', 'dialog.confirmReset': 'Confirm restart',
    'dialog.onboardingKicker': 'First visit · A short introduction', 'dialog.onboardingTitle': 'Know what you are about to do',
    'dialog.onboardingOneTitle': '1. Make the question specific', 'dialog.onboardingOneBody': 'Ask one thing at a time, including the situation, timeframe, and direction you want to clarify.',
    'dialog.onboardingTwoTitle': '2. Eighteen changes make one line', 'dialog.onboardingTwoBody': 'The complete ritual demonstrates divide, set aside, count by fours, and gather the remainders across three changes.',
    'dialog.onboardingThreeTitle': '3. Complete or quick', 'dialog.onboardingThreeBody': 'Advance through the complete ritual yourself, or use quick casting to demonstrate the same method one line at a time.',
    'dialog.onboardingFourTitle': '4. The result is study material', 'dialog.onboardingFourBody': 'The classic text, changing-line method, and study prompts support reflection; they do not replace professional advice.',
    'dialog.later': 'Later', 'dialog.startReading': 'Start reading',
    'dialog.importKicker': 'Import records', 'dialog.importTitle': 'Merge these local records?', 'dialog.importLoading': 'Reading the file.',
    'dialog.confirmImport': 'Merge records',
    'common.loading': 'Loading…', 'common.noData': 'No data', 'common.saved': 'Saved',
    'common.copy': 'Copy passage link', 'common.delete': 'Delete', 'common.close': 'Close', 'common.today': 'Today',
    'edition.status': 'Edition status', 'edition.source': 'Source: ', 'edition.dataDate': 'Data date: ',
    'edition.dateMissing': 'Date not recorded', 'edition.unspecified': 'Not specified', 'edition.variants': 'Variants: not separately collated; source text follows the selected edition',
    'language.label': 'Language', 'language.zh': '中文', 'language.en': 'English',
  },
  fa: {},
};

Object.assign(DICTIONARY.fa, DICTIONARY.en, PERSIAN_OVERRIDES);
Object.assign(DICTIONARY['zh-CN'], {
  'language.fa': 'فارسی', 'auth.title': '观象账户', 'auth.login': '登录', 'auth.register': '注册', 'auth.email': '邮箱', 'auth.password': '密码', 'auth.submitLogin': '登录账户', 'auth.submitRegister': '创建账户', 'auth.logout': '退出登录', 'auth.guest': '游客模式', 'auth.guestDescription': '记录只保存在此设备。', 'auth.accountDescription': '记录会在不同设备间同步。', 'auth.mergeTitle': '合并此设备的记录？', 'auth.mergeBody': '旧的本机记录会保留并添加到你的账户。', 'auth.merge': '合并记录', 'auth.keepCloud': '只保留云端记录', 'auth.invalid': '邮箱或密码无效。', 'auth.network': '账户服务暂时不可用。', 'auth.loggedIn': '已登录',
});
Object.assign(DICTIONARY.en, {
  'language.fa': 'Persian', 'auth.title': 'Guanxiang account', 'auth.login': 'Log in', 'auth.register': 'Create account', 'auth.email': 'Email', 'auth.password': 'Password', 'auth.submitLogin': 'Log in', 'auth.submitRegister': 'Create account', 'auth.logout': 'Log out', 'auth.guest': 'Guest mode', 'auth.guestDescription': 'Records stay on this device.', 'auth.accountDescription': 'Records sync across your devices.', 'auth.mergeTitle': 'Merge this device’s records?', 'auth.mergeBody': 'Your existing local records will be kept and added to your account.', 'auth.merge': 'Merge records', 'auth.keepCloud': 'Keep cloud records only', 'auth.invalid': 'The email or password is not valid.', 'auth.network': 'The account service is temporarily unavailable.', 'auth.loggedIn': 'Signed in',
});
Object.assign(DICTIONARY['zh-CN'], {
  'auth.browserTitle': '进入观象 · 账户', 'auth.pageKicker': '观象账户', 'auth.pageTitle': '进入观象',
  'auth.pageDescription': '登录后跨设备保存占问记录，也可以作为游客只在本机使用。',
  'auth.emblemKicker': '观象而入', 'auth.emblemQuote': '穷则变，变则通，通则久。', 'auth.emblemSource': '《周易·系辞下》',
  'auth.passwordHint': '至少 8 位字符', 'auth.or': '或者', 'auth.guestEnter': '游客进入',
  'auth.signedInAs': '当前登录 ID', 'auth.continue': '进入观象', 'auth.backCover': '返回封面',
  'auth.homeLabel': '观象首页', 'auth.modeLabel': '账户方式',
  'auth.footerLeft': '六十四卦 · 十翼 · 大衍筮法', 'auth.footerRight': '账户密码经加密后保存',
});
Object.assign(DICTIONARY.en, {
  'auth.browserTitle': 'Enter Guanxiang · Account', 'auth.pageKicker': 'Guanxiang account', 'auth.pageTitle': 'Enter Guanxiang',
  'auth.pageDescription': 'Sign in to sync your readings across devices, or continue as a guest and keep them on this device.',
  'auth.emblemKicker': 'Enter through the image', 'auth.emblemQuote': 'At an impasse, change; through change, passage; through passage, endurance.', 'auth.emblemSource': 'Zhouyi · Xici II',
  'auth.passwordHint': 'At least 8 characters', 'auth.or': 'or', 'auth.guestEnter': 'Continue as guest',
  'auth.signedInAs': 'Signed-in ID', 'auth.continue': 'Enter Guanxiang', 'auth.backCover': 'Back to cover',
  'auth.homeLabel': 'Guanxiang home', 'auth.modeLabel': 'Account access',
  'auth.footerLeft': '64 Hexagrams · Ten Wings · Great Derivation', 'auth.footerRight': 'Account passwords are stored securely',
});
Object.assign(DICTIONARY.fa, {
  'auth.browserTitle': 'ورود به گوانشیانگ · حساب', 'auth.pageKicker': 'حساب گوانشیانگ', 'auth.pageTitle': 'ورود به گوانشیانگ',
  'auth.pageDescription': 'برای همگام‌سازی خوانش‌ها وارد شوید، یا به‌عنوان مهمان ادامه دهید و آن‌ها را فقط در این دستگاه نگه دارید.',
  'auth.emblemKicker': 'از تصویر وارد شوید', 'auth.emblemQuote': 'در بن‌بست، تغییر؛ با تغییر، گشایش؛ با گشایش، پایداری.', 'auth.emblemSource': 'ژوئی · شی‌تسی ۲',
  'auth.passwordHint': 'حداقل ۸ نویسه', 'auth.or': 'یا', 'auth.guestEnter': 'ورود به‌عنوان مهمان',
  'auth.signedInAs': 'شناسه واردشده', 'auth.continue': 'ورود به گوانشیانگ', 'auth.backCover': 'بازگشت به جلد',
  'auth.homeLabel': 'صفحه اصلی گوانشیانگ', 'auth.modeLabel': 'روش ورود به حساب',
  'auth.footerLeft': '۶۴ هگزاگرام · ده بال · اشتقاق بزرگ', 'auth.footerRight': 'رمز حساب به‌شکل امن ذخیره می‌شود',
});

const TEXT_MAP = Object.fromEntries(Object.keys(DICTIONARY['zh-CN']).map(key => [DICTIONARY['zh-CN'][key], DICTIONARY.en[key]]));
const PERSIAN_TEXT_MAP = Object.fromEntries(Object.keys(DICTIONARY['zh-CN']).map(key => [DICTIONARY['zh-CN'][key], DICTIONARY.fa[key] ?? DICTIONARY.en[key]]));
let currentLanguage = 'zh-CN';

export function getLanguage() {
  try {
    const stored = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh-CN' || stored === 'fa') currentLanguage = stored;
  } catch {}
  return currentLanguage;
}

export function setLanguage(language) {
  currentLanguage = language === 'en' || language === 'fa' ? language : 'zh-CN';
  try { globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, currentLanguage); } catch {}
  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = LANGUAGE_META[currentLanguage].direction;
    document.title = t('app.title');
    document.dispatchEvent(new CustomEvent('guanxiang:languagechange', { detail: { language: currentLanguage } }));
  }
  return currentLanguage;
}

export function t(key, params = {}) {
  const table = DICTIONARY[currentLanguage] || DICTIONARY['zh-CN'];
  let value = table[key] ?? DICTIONARY['zh-CN'][key] ?? key;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

export function languageLabel(language = currentLanguage) { return LANGUAGE_META[language]?.label || LANGUAGE_META['zh-CN'].label; }

export function translateDom(root = document) {
  if (!root?.querySelectorAll) return;
  const nodes = root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]');
  nodes.forEach(node => {
    if (node.dataset.i18n) node.textContent = t(node.dataset.i18n);
    if (node.dataset.i18nPlaceholder) node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
    if (node.dataset.i18nTitle) node.setAttribute('title', t(node.dataset.i18nTitle));
    if (node.dataset.i18nAriaLabel) node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  });
}

const SOURCE_TEXT_SELECTOR = '.wing-original, .classic-quote, .reading-line, .detail-meaning, .quote-strip blockquote, .principle-detail blockquote, .source-metadata, .interpretation-sections, .reading-question, [data-user-content], textarea, input';
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const TRANSLATED_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'data-question-example'];

function translateUiValue(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return value;
  if (TEXT_MAP[normalized]) return TEXT_MAP[normalized];
  let translated = normalized
    .replace(/^所问：\s*/, 'Question: ')
    .replace(/^继续\s*/, 'Resume ')
    .replace(/按住蓍草束，凭感觉松开，为第\s*(\d+)\s*变完成分界/g, 'Hold the stalk bundle and release when it feels right to complete the division for Change $1')
    .replace(/继续第\s*(\d+)\s*变\s*·\s*分二/g, 'Resume Change $1 · Divide in two')
    .replace(/^Resume\s+第\s*(\d+)\s*爻/, 'Resume line $1')
    .replace(/^准备起第\s*(\d+)\s*爻/, 'Prepare line $1')
    .replace(/^准备第\s*(\d+)\s*爻/, 'Prepare line $1')
    .replace(/^第\s*(\d+)\s*爻已成\s*·\s*请继续$/, 'Line $1 complete · Continue')
    .replace(/继续演蓍第\s*(\d+)\s*爻/g, 'Continue casting line $1')
    .replace(/继续第\s*(\d+)\s*爻/g, 'Resume line $1')
    .replace(/按住蓍草束，凭感觉松开，为/g, 'Hold the stalk bundle and release when it feels right to ')
    .replace(/完成分界/g, ' complete the division')
    .replace(/请先按住蓍束再松开/g, 'Hold and release the stalk bundle first')
    .replace(/^第\s*(\d+)\s*卦\s*·\s*上经$/, 'Hexagram $1 · Upper Canon')
    .replace(/^第\s*(\d+)\s*卦\s*·\s*下经$/, 'Hexagram $1 · Lower Canon')
    .replace(/第\s*(\d+)\s*爻/g, 'Line $1')
    .replace(/第\s*(\d+)\s*变/g, 'Change $1')
    .replace(/(\d+)\s*\/\s*6\s*爻/g, '$1 / 6 lines')
    .replace(/(\d+)\s*组\s*×\s*4/g, '$1 groups × 4')
    .replace(/余\s*(\d+)\s*策/g, '$1 stalks remain')
    .replace(/旁置\s*(\d+)\s*策/g, '$1 stalks set aside')
    .replace(/＝\s*(\d+)\s*策/g, '= $1 stalks')
    .replace(/共十八变/g, '18 changes total')
    .replace(/上经/g, 'Upper Canon')
    .replace(/下经/g, 'Lower Canon');
  for (const [chinese, english] of Object.entries(TEXT_MAP).sort((a, b) => b[0].length - a[0].length)) {
    if (chinese && translated.includes(chinese)) translated = translated.replaceAll(chinese, english);
  }
  return translated;
}

export function translateKnownText(root = document) {
  if (!root?.createTreeWalker) return;
  const scope = root.body || root;
  const walker = root.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.parentElement?.closest(SOURCE_TEXT_SELECTOR)) return;
    const value = node.nodeValue.trim();
    if (!value) return;
    if (currentLanguage === 'en' || currentLanguage === 'fa') {
      const translated = currentLanguage === 'fa' ? (PERSIAN_TEXT_MAP[value] || value) : translateUiValue(value);
      if (translated === value) return;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      node.nodeValue = node.nodeValue.replace(value, translated);
      return;
    }
    if (originalText.has(node)) node.nodeValue = originalText.get(node);
    else {
      const chinese = Object.keys(TEXT_MAP).find(key => TEXT_MAP[key] === value);
      if (chinese) node.nodeValue = node.nodeValue.replace(value, chinese);
    }
  });
  scope.querySelectorAll?.(TRANSLATED_ATTRIBUTES.map(name => `[${name}]`).join(',')).forEach(element => {
    let originals = originalAttributes.get(element);
    if (!originals) { originals = {}; originalAttributes.set(element, originals); }
    TRANSLATED_ATTRIBUTES.forEach(name => {
      if (!element.hasAttribute(name)) return;
      if (currentLanguage === 'en' || currentLanguage === 'fa') {
        const value = element.getAttribute(name);
        const translated = currentLanguage === 'fa' ? (PERSIAN_TEXT_MAP[value] || value) : translateUiValue(value);
        if (translated !== value) {
          if (!(name in originals)) originals[name] = value;
          element.setAttribute(name, translated);
        }
      } else if (name in originals) element.setAttribute(name, originals[name]);
    });
  });
}

export function translateUiTextForTests(value) { return translateUiValue(value); }

Object.assign(TEXT_MAP, {'核心判断':'Core judgment','当前处境':'Present situation','关键变化':'Key change','后续趋势':'Developing trend','行动建议':'Suggested actions','需要留意':'Watch for','依据':'Basis','本卦':'Primary','变卦':'Relating','本次取法':'Method used','六爻皆静':'All six lines are still','问题清楚。确认后将锁定，直到本次仪式结束。':'The question is clear. Confirm it to lock it for this ritual.','问题还不够具体，请写明情境和你想辨明的方向。':'Please make the question more specific by naming the situation and what you want to clarify.','请先确认问题':'Confirm your question first','问题已确认':'Question confirmed'});
Object.assign(TEXT_MAP, {
 '静心入问':'Prepare the question','演蓍成卦':'Cast the hexagram','依卦研读':'Read the result',
 '主导航':'Main navigation','今日静观':'Today’s reflection','不疾不徐，观其象而玩其辞。':'Proceed without haste; observe the images and engage the text.',
 '今日 · 顺时而观':'Today · Observe the time','内容与占问仅存于本机':'Content and readings stay on this device',
 '周易':'Zhouyi','切换阅读氛围':'Change reading theme','阅读者':'Reader',
 '从这里开始':'Start here','经典、卦象与一问':'Classics, images, and one question',
 '64 卦 · 384 爻':'64 hexagrams · 384 lines','10 篇 · 观其会通':'10 works · Trace their connections','完整仪式 · 约 8–12 分钟':'Complete ritual · about 8–12 minutes',
 '天行健':'Heaven moves with strength','地势坤':'Earth receives with devotion','卦象':'hexagrams',
 '问卦之前':'Before consulting','先把问题问清楚':'Make the question precise','占筮节奏':'Casting pace',
 '完整仪式':'Complete ritual','十八变逐步推进':'Advance through all 18 changes','快速演蓍':'Quick casting','每次点击完成一爻':'One line per click',
 '如何提出一个好问题':'How to ask a useful question','具体':'Specific','一次只问一件事，说明情境与时间。':'Ask one thing at a time; include context and time.',
 '可行动':'Actionable','把“会不会”改成“我应当注意什么”。':'Replace “will it happen?” with “what should I pay attention to?”',
 '不代替决策':'Not a substitute for decisions','医疗、法律、财务事项仍应寻求专业意见。':'Seek professional advice for medical, legal, or financial matters.',
 '此次所问':'Your question','确认问题，进入仪式':'Confirm question and begin','问题还不够具体，请写明情境和你想辨明的方向。':'Please name the situation and what you want to clarify.',
 '你可以这样问':'Example questions','事业':'Career','关系':'Relationships','学习':'Study',
 '筮法记录':'Ritual record','三变成一爻':'Three changes make one line','六爻自下而上':'Six lines rise from the bottom',
 '本次阅读':'This reading','卦象已成':'The hexagram is complete','打开六十四卦全文':'Open the full hexagram text',
 '先看这次卦象在说什么':'Begin with what this pattern suggests','结合此次所问继续展开':'Continue from your question',
 '生成 AI 深度解读':'Generate AI reading','此次所问与卦象资料会发送至 Cloudflare Workers AI；完整结果只保存在此浏览器。':'Your question and hexagram data are sent to Cloudflare Workers AI; the complete result remains only in this browser.',
 '经传互参':'Cross-reference the Classic and commentaries','我的札记':'My notes','保存札记':'Save note',
 '古法小记':'Classical method','四营成易，十有八变':'Four operations complete a change; eighteen changes complete a hexagram',
 '分二':'Divide in two','任意分为左右两组，象天地。':'Divide freely into two groups, symbolizing Heaven and Earth.',
 '挂一':'Set one aside','从右组取一策挂于指间，象人。':'Take one stalk from the right group and set it aside, symbolizing the human.',
 '揲四':'Count by fours','两组分别以四数之，象四时。':'Count both groups by fours, symbolizing the four seasons.',
 '归奇':'Gather the remainders','余数合为一变，三变而成一爻。':'Gather the remainders; three changes form one line.',
 '依古籍卷次，从右向左读十翼。选择篇次，可直接定位。':'Read the Ten Wings in classical order from right to left. Select a work to jump to it.',
 '录文状态：依所选底本录入；当前数据未另列异文校勘。':'Text status: transcribed from the selected edition; variant readings are not separately collated.',
 '查看电子转录来源':'View transcription source','十翼排版方式':'Ten Wings layout','古籍次序':'Classical order','现代纵读':'Modern vertical reading',
 '搜索十翼原文':'Search the original Ten Wings text','收藏本篇':'Bookmark this work','十翼篇次':'Ten Wings order',
 '从卦爻、象数、时位、变化与学派流变，建立可复核的观易地图。':'Build a reviewable map through lines, images, numbers, timing, change, and schools of thought.',
 '研读专题':'study topics','易理专题':'Principle topics','易理学习路径':'Principles study path',
 '完成的卦象只保存在此浏览器，可随时回来研读。':'Completed readings stay in this browser and can be revisited at any time.',
 '次记录':'records','搜索问题、卦名或札记':'Search questions, hexagrams, or notes','导出记录':'Export records','导入记录':'Import records',
 '舍弃本次进度？':'Discard this progress?','当前问题、已完成的爻和三变记录都会被清除，此操作无法撤销。':'The question, completed lines, and change records will be cleared. This cannot be undone.',
 '继续本次仪式':'Continue this ritual','确认重新开始':'Confirm restart','初次使用 · 观象入门':'First use · Introduction',
 '先知道自己正在做什么':'Know what you are doing first','一、把问题问具体':'1. Make the question specific','一次只问一件事，写出情境、时间和你想辨明的方向。':'Ask one thing at a time and include the situation, time, and what you want to clarify.',
 '二、十八变成一爻':'2. Eighteen changes form the lines','完整模式会逐步演示分二、挂一、揲四、归奇，三变得到一爻。':'Complete mode shows divide, set aside, count by fours, and gather; three changes make one line.',
 '三、完整与快速':'3. Complete and quick modes','完整仪式由你逐步推进；快速演蓍每次点击完成一爻，但仍使用同一套算法。':'You advance every step in complete mode; quick mode completes one line per click with the same algorithm.',
 '四、结果是研读材料':'4. The result is study material','卦辞、爻辞和后人规则用于自我反思，不替代医疗、法律或财务判断。':'Classic texts and later methods support reflection; they do not replace medical, legal, or financial judgment.',
 '以后再看':'View later','开始阅读':'Begin','确认合并本地记录？':'Merge local records?','正在读取记录。':'Reading records.','确认合并':'Confirm merge'
});
Object.assign(TEXT_MAP, {
 '六爻既成，以下按五层展开研读':'Six lines are complete; read through the five layers below',
 '底本原文 · 卦辞':'Source text · Judgment',
 '底本原文 · 变卦卦辞':'Source text · Relating judgment',
 '二 · 变爻规则':'II · Changing-line method',
 '本次取法':'Method used',
 '通行变爻取法说明 · 后世研读规则，不是《周易》经文原句。':'A conventional changing-line method · a later study rule, not an original Zhouyi line.',
 '三 · 卦象结构':'III · Hexagram structure',
 '四 · 易理提示':'IV · Principle prompt',
 '从象与时位开始观察':'Begin with image and timing',
 '研读提示 · 由卦象资料生成，供自我反思，不是经文原句。':'Study prompt · generated from hexagram data for reflection, not a source-text quotation.',
 '本次阅读':'This reading',
 '本地规则解读':'Offline interpretation',
 '结合此次所问继续展开':'Continue from your question',
 '经传互参':'Cross-reference the Classic and commentaries',
 '与本卦相关的十翼原文':'Ten Wings passages related to this hexagram',
 '仅保存在此浏览器':'Stored only in this browser'
});
Object.assign(TEXT_MAP, {
  '观象':'Guanxiang',
  '观象 · 周易研读':'Guanxiang · Zhouyi Study',
  '周易研读与大衍筮法':'Zhouyi Study & Great Derivation',
  '观其象 · 玩其辞':'Observe the images · Engage the text',
  '观乎天文，以察时变':'Observe the patterns of heaven to discern the changes of time',
  '六十四卦 · 十翼 · 易理 · 筮法':'64 Hexagrams · Ten Wings · Principles · Divination',
  '循象而入，因变而明':'Enter through images; clarity follows change',
  '进入观象':'Enter Guanxiang',
  '浏览器未启用脚本，请向下浏览研读内容。':'JavaScript is disabled. Scroll down to browse the study content.',
  '典籍索引':'Classics index',
  '观象 · 玩辞 · 穷理':'Observe · Read · Understand',
  '在变化之中，':'Within change,',
  '见不变之理。':'perceive what does not change.',
  '以卦象为门，循《易》之经与传，安静地读完一部关于变化的书。这里收录六十四卦经文、十翼与易理纲要，并以大衍筮法还原一次古老的提问。':'Enter through the hexagrams and read the Classic and its commentaries at a measured pace. Guanxiang brings together the 64 hexagrams, the Ten Wings, a study of principles, and a complete Great Derivation ritual.',
  '开始一卜':'Begin a reading',
  '浏览六十四卦':'Browse the hexagrams',
  '六十四卦':'64 Hexagrams',
  '按序浏览卦象、卦辞、爻辞与象传。':'Browse the images, judgments, line texts, and Image commentaries in order.',
  '十翼':'Ten Wings',
  '易传十翼':'The Ten Wings',
  '彖、象、系辞、文言等传文索引。':'An index to the Tuan, Image, Xici, Wenyan, and other commentaries.',
  '大衍筮法':'Great Derivation',
  '依古法分二、挂一、揲四，逐爻成卦。':'Follow the classical divide, set aside, and count-by-four process, line by line.',
  '一卦六爻，内外相感。选择一卦，展开其经文与易理。':'Six lines form one hexagram. Select one to open its texts and study notes.',
  '敬其事，正其心。“大衍之数五十，其用四十有九”。虚一策象太极，以四十九蓍草三变成一爻，六爻自下而上。':'Approach the question with care. Set one of fifty stalks aside for the Taiji, then use forty-nine stalks to form six lines from the bottom up.',
  '大衍之数':'Great Derivation',
  '五十':'Fifty',
  '十八变逐营操作 · 默认':'Advance through all 18 changes · Default',
  '逐爻点击，自动演示三变':'One click per line, with three changes demonstrated automatically',
  '一事':'One matter',
  '一次只问一件事，不把两个选择混在一起。':'Ask one thing at a time; do not combine two choices.',
  '写明情境与时间范围，避免只问“吉不吉”。':'Include the situation and time frame; avoid asking only whether it is auspicious.',
  '自问':'Ask about yourself',
  '关注自己可以如何行动，不代替他人作决定。':'Focus on how you can act, rather than deciding for someone else.',
  '本工具用于经典研读与自我反思，不提供确定预测，也不能代替医疗、法律、财务等专业判断。':'This tool supports classical study and reflection. It does not make certain predictions or replace medical, legal, or financial advice.',
  '例如：对于下周的面试，我最需要注意什么？':'For example: What should I pay attention to in next week’s interview?',
  '问题示例':'Question examples',
  '面试准备':'Interview preparation',
  '职业选择':'Career choice',
  '合作关系':'Collaboration',
  '对于下周的面试，我最需要注意什么？':'What should I pay attention to in next week’s interview?',
  '未来三个月，我该如何推进目前的职业选择？':'How should I move forward with my career choice over the next three months?',
  '面对目前的合作分歧，我应当采取什么态度？':'How should I respond to the current disagreement in this collaboration?',
  '请写下一个包含具体情境的问题。':'Write one question with a specific situation.',
  '起卦仪式':'Casting ritual',
  '问题确认后，完整仪式将在这里开始':'The complete ritual begins here after the question is confirmed',
  '按住蓍束，凭感觉松开':'Hold the stalk bundle and release when it feels right',
  '尚未分开':'Not divided yet',
  '按住蓍草束，凭感觉松开以完成分界':'Hold the stalk bundle and release when it feels right to divide it',
  '不显示位置与策数，分二时才揭开左右两堆':'The position and counts remain hidden until the two piles are revealed',
  '三变四营步骤':'Four operations across three changes',
  '天 · 左':'Heaven · Left',
  '地 · 右':'Earth · Right',
  '太极 · 虚一':'Taiji · One set aside',
  '人 · 挂一':'Human · One held',
  '闰 · 归奇':'Remainders · Gathered',
  '策':'stalks',
  '待分':'Awaiting division',
  '待问':'Awaiting question',
  '重新开始':'Start over',
  '乾为天':'The Creative (乾)',
  '离线可用 · 可复核':'Available offline · Reviewable',
  '记下此刻对卦辞、动爻与所问的理解。':'Record your understanding of the judgment, changing lines, and question.',
  '研读札记':'Study note',
  '记下后续的观察与行动。':'Record later observations and actions.',
  '易传十翼':'The Ten Wings',
  '依古籍卷次，从右向左读十翼。选择篇次，可直接定位。':'Read the Ten Wings in their classical sequence. Select a work to jump to it.',
  '录文状态：依所选底本录入；当前数据未另列异文校勘。':'Text status: transcribed from the selected edition; variant readings are not separately collated.',
  '易理体系':'Principles',
  '占问记录':'Journal',
  '舍弃本次进度？':'Discard this progress?',
  '初次使用 · 观象入门':'First use · Introduction',
  '先知道自己正在做什么':'Know what you are doing first',
  '取消':'Cancel',
  '导入记录':'Import records',
  '确认合并本地记录？':'Merge local records?',
  '正在读取记录。':'Reading records.',
  '确认合并':'Confirm merge',
  '本卦专释':'Direct commentary on this hexagram',
  '文中引卦':'Referenced in the passage',
  '无标签':'No tags',
  '未开始':'Not started',
  '研读中':'Studying',
  '已复习':'Reviewed',
  '删除':'Delete',
  '批注已保存。':'Annotation saved.',
  '批注未保存：请检查文字长度。':'Annotation not saved. Check the text length.',
  '本卦':'Primary',
  '互卦':'Nuclear',
  '错卦':'Opposite',
  '综卦':'Inverse',
  '未能映射':'Unable to map',
  '卦象比较 · 互错综':'Hexagram comparison · Nuclear, opposite, and inverse',
  '这些是观察结构的传统工具，不是新增的经文卦辞。':'These are traditional tools for studying structure, not additional source text.',
  '个人批注':'Personal annotations',
  '把这一处读法留下来':'Record your reading of this passage',
  '写下你的理解、疑问或可验证的行动。':'Write your interpretation, question, or a concrete action to review.',
  '标签，用逗号分隔':'Tags, separated by commas',
  '保存批注':'Save annotation',
  '底本状态':'Edition status',
  '日期未记录':'Date not recorded',
  '底本未标注':'Edition not specified',
  '未标注':'Not specified',
  '来源：':'Source: ',
  '数据时间：':'Data date: ',
  '异文：当前未另列校勘，原文依底本录入':'Variants: not separately collated; source text follows the selected edition',
  '十翼原文中没有找到这个词。':'No matching passage in the Ten Wings.',
  '来源见数据说明':'See the data notes for the source',
  '切换为浅色阅读':'Switch to light reading mode',
  '切换为深色阅读':'Switch to dark reading mode',
  '观象已有更新，可立即启用。':'A Guanxiang update is ready.',
  '立即更新':'Update now',
  '经典数据未能完整载入，请检查本地服务后刷新页面。当前不会以摘要冒充完整原文。':'The classical data could not be loaded completely. Check the local service and refresh the page.',
  '六十四卦原文载入失败。':'The 64 Hexagrams source text failed to load.',
  '十翼原文载入失败。':'The Ten Wings source text failed to load.',
  '易理纲要载入失败。':'The principles library failed to load.',
  '老阴 · 变':'Old yin · Changing',
  '老阳 · 变':'Old yang · Changing',
  '少阴':'Young yin',
  '少阳':'Young yang',
 '大衍筮法阶段':'Great Derivation stages',
 '分二':'Divide in two',
 '挂一':'Set one aside',
 '揲四':'Count by fours',
 '归奇':'Gather the remainders',
 '正问与准备':'Question and preparation',
  '定其所问':'Define the question',
  '观卦研读':'Study the result',
  '十八变':'18 changes',
  '本卦与之卦':'Primary and relating hexagrams',
  '揲之以四':'Count by fours',
  '余':'Remainder',
  '本爻三变记录':'Three changes for this line',
  '本爻三变':'Three changes',
  '一变':'Change one',
  '二变':'Change two',
  '三变':'Change three',
  '待行':'Pending',
  '展开本爻策数复核':'Review the stalk counts for this line',
  '每一行都来自本次实际演算记录，不从展示文字反推。':'Every row comes from the recorded calculation, not from displayed labels.',
  '进行中':'In progress',
  '分界已定':'Division set',
  '感受中…':'Sensing…',
  '握住这一束，觉得合适时松开':'Hold the bundle and release when it feels right',
  '本地已有':'There are',
  '条记录，建议导出一份备份。':'local records. Export a backup copy.',
  '稍后提醒':'Remind me later',
  '尚无占问记录':'No readings yet',
  '完成一次占筮后，卦象与所问会保存在这里。':'The hexagram and question will appear here after a completed reading.',
  '每一条记录都只保存在当前浏览器。':'Every record stays in this browser.',
  '没有匹配的记录':'No matching records',
  '换一个问题关键词、卦名或札记内容。':'Try another question keyword, hexagram name, or note.',
  '搜索结果为空。':'No search results.',
  '时间未记录':'Time not recorded',
  '有札记':'Has note',
  '打开本卦全文':'Open the primary hexagram text',
  '确定删除这条占问记录？此操作无法撤销。':'Delete this reading? This cannot be undone.',
  '这条占问记录已删除。':'Reading deleted.',
  '导入失败：文件不是有效的观象占问记录。':'Import failed. The file is not a valid Guanxiang journal export.',
  '快速演蓍 · 约 1–2 分钟':'Quick casting · about 1–2 minutes',
  '问题确认后，占筮仪式将在这里开始':'The casting ritual begins here after the question is confirmed',
  '每次点击演示一爻的完整三变':'Each click demonstrates all three changes for one line',
  '每一营由你亲手推进':'Advance each operation yourself',
  '亲手虚一策 · 象太极':'Set one stalk aside · Symbolize the Taiji',
  '六爻已成':'Six lines complete',
  '请先按住蓍束再松开':'Hold and release the stalk bundle first',
  '执行分二':'Divide in two',
  '执行挂一':'Set one aside',
  '执行揲四':'Count by fours',
  '执行归奇':'Gather remainders',
  '本爻未完成，请重新点击':'This line was not completed. Try again.',
  '本步未完成，请重新点击':'This step was not completed. Try again.',
  '卦象映射失败':'The hexagram could not be mapped',
  '已载入此前札记':'Previous note loaded',
  '已保存':'Saved',
  '请收束到一件事，控制在 100 字以内。':'Keep to one matter and use no more than 100 characters.',
  '这里可能包含多个问题，请一次只保留一件事。':'This may contain more than one question. Keep only one matter.',
  '试着改问“面对这件事，我应当注意什么？”':'Try asking: “What should I pay attention to in this situation?”',
  '五十策已备 · 请亲手虚一':'Fifty stalks ready · Set one aside',
  '先从五十策中取出一策不用':'Take one of the fifty stalks out of use',
  '此一策象太极，不再参与其后的十八变':'This stalk represents the Taiji and takes no part in the 18 changes',
  '检测到一份损坏的起卦进度，已停止恢复；可以重新开始一次占问。':'A damaged casting session was found and was not restored. Start a new reading.',
  '六爻已成 · 可继续研读':'Six lines complete · Continue to the reading',
  '继续本次仪式：先虚一策':'Resume the ritual · Set one stalk aside',
  '进度已从本机恢复':'Progress restored from this device',
  '本次进度已恢复':'This session has been restored',
  '点击一次演示下一爻三变':'Click once to demonstrate the next line’s three changes',
  '点击“准备下一爻”继续':'Click “Prepare next line” to continue',
  '上一步已保存在本机':'The previous step is saved on this device',
  '问题已锁定，当前仪式进度已保存在本机。':'The question is locked and this ritual’s progress is saved on this device.'
});
Object.assign(TEXT_MAP, {
  '逐卦断义，说明卦名、卦辞与上下体之大旨。':'Explains each hexagram’s name, judgment, and central meaning.',
  '承接上经，论三十卦之时位与吉凶。':'Continues the Upper Canon through timing, position, and fortune.',
  '取卦象明君子之用，列上经三十卦大象。':'Uses images to clarify the noble person’s conduct in the Upper Canon.',
  '逐卦取象明德，列下经三十四卦大象。':'Uses each lower hexagram’s image to illuminate its virtue and conduct.',
  '总论天地之道、象数之源与易学体用。':'A general account of the way of Heaven and Earth and the foundations of Yi study.',
  '论圣人设卦、观象玩辞与卜筮之道。':'On establishing the hexagrams, observing images, and the way of divination.',
  '专释乾坤，申说元亨利贞与君子之德。':'A focused reading of Qian and Kun and the virtues of the noble person.',
  '说明八卦取象、方位、性情与万物类象。':'Explains the trigrams’ images, directions, qualities, and correspondences.',
  '说明六十四卦相承的次序与变化的链条。':'Explains the sequence of the 64 hexagrams and their chain of change.',
  '以错综互杂比较诸卦，见相反相成之理。':'Compares hexagrams through inversion and exchange to reveal complementary opposites.'
});
Object.assign(PERSIAN_TEXT_MAP, {
  '在变化之中，':'در میان تغییر،', '见不变之理。':'آنچه تغییر نمی‌کند را ببینید.',
  '观象 · 玩辞 · 穷理':'مشاهده · خواندن · فهمیدن', '观乎天文，以察时变':'با مشاهده نقش‌های آسمان، تغییرات زمان را بشناسید',
  '六十四卦 · 十翼 · 易理 · 筮法':'۶۴ هگزاگرام · ده بال · اصول · پیشگویی', '循象而入，因变而明':'از تصویر وارد شوید؛ روشنایی از تغییر می‌آید',
  '研读六十四卦、十翼与易理，也以大衍筮法郑重回应一问。':'۶۴ هگزاگرام، ده بال و اصول را مطالعه کنید یا پرسشی را به آیین اشتقاق بزرگ بسپارید.',
  '开始一卜':'آغاز یک خوانش', '浏览六十四卦':'مرور هگزاگرام‌ها', '十翼':'ده بال', '易理体系':'اصول', '占问记录':'دفترچه',
  '从这里开始':'از اینجا آغاز کنید', '研读入口':'مسیرهای مطالعه', '今日静观':'تأمل امروز', '内容与占问仅存于本机':'محتوا و خوانش‌ها فقط در این دستگاه ذخیره می‌شوند'
});
export function dictionaryForTests() { return DICTIONARY; }
