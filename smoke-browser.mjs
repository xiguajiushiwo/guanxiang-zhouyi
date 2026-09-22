import assert from 'node:assert/strict';

const port = process.argv[2] || '9223';
const host = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let targets;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    targets = await (await fetch(`${host}/json/list`)).json();
    if (targets.length) break;
  } catch {}
  await sleep(200);
}
assert.ok(targets?.length, 'browser debugging target unavailable');
const target = targets.find(item => item.type === 'page') || targets[0];
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let commandId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});
function command(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);
  return response.result.value;
}
async function waitFor(expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await command('Page.navigate', { url: 'http://127.0.0.1:4175/#divination/prepare' });
await waitFor(`document.querySelector('[data-cast-mode="quick"]') && document.querySelector('#questionInput')`);
await evaluate(`(async()=>{
  ['guanxiang-onboarding-v1','guanxiang-cast-v3','guanxiang-cast-v2','guanxiang-cast','guanxiang-history-v1','guanxiang-history-guest-v1','guanxiang-language','guanxiang-study-v1','guanxiang-history-legacy-owner-v1'].forEach(key=>localStorage.removeItem(key));
  Object.keys(localStorage).filter(key=>key.startsWith('guanxiang-history-account-v1:')||key.startsWith('guanxiang-sync-queue-v1:')).forEach(key=>localStorage.removeItem(key));
  localStorage.setItem('guanxiang-account-mode-v1','guest');
  if('serviceWorker' in navigator){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.map(registration=>registration.unregister()))}
  if('caches' in window){const keys=await caches.keys();await Promise.all(keys.map(key=>caches.delete(key)))}
  location.reload();return true;
})()`);
await waitFor(`document.body?.classList.contains('cover-active') && document.querySelector('#enterSite') && document.querySelector('#siteCover') && !document.querySelector('#siteCover').hidden`);
await evaluate(`document.querySelector('#enterSite').click();true`);
await waitFor(`location.pathname.endsWith('/auth')||location.pathname.endsWith('/auth.html')`);
await waitFor(`document.querySelector('#authForm')`);
await evaluate(`localStorage.setItem('guanxiang-account-mode-v1','guest');true`);
await command('Page.navigate', { url: 'http://127.0.0.1:4175/?entry=account#divination/prepare' });
await waitFor(`document.querySelector('#siteCover')?.hidden && document.querySelector('#onboardingDialog')?.open`);
await waitFor(`document.querySelector('#onboardingDialog')?.open`);
const onboarding = await evaluate(`({open:document.querySelector('#onboardingDialog').open,grid:document.querySelectorAll('#onboardingDialog .onboarding-grid section').length})`);
assert.equal(onboarding.open, true);
assert.equal(onboarding.grid, 4);
await evaluate(`document.querySelector('#onboardingStart').click(); true`);
await waitFor(`!document.querySelector('#onboardingDialog').open`);
await command('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
await evaluate(`document.querySelector('.nav-item[data-view="home"]').click(); true`);
await waitFor(`document.querySelector('#view-home').classList.contains('active')`);
await sleep(300);
const homeLayout = await evaluate(`(()=>{
  const home=document.querySelector('#view-home').getBoundingClientRect();
  const paths=document.querySelector('.home-paths').getBoundingClientRect();
  const cta=document.querySelector('.home-primary-action').getBoundingClientRect();
  const ring=document.querySelector('#view-home .ring-two').getBoundingClientRect();
  const quote=document.querySelector('#view-home .home-symbol-quote').getBoundingClientRect();
  return {viewportHeight:innerHeight,scrollHeight:document.documentElement.scrollHeight,homeBottom:Math.round(home.bottom),pathsBottom:Math.round(paths.bottom),ctaWidth:Math.round(cta.width),ctaHeight:Math.round(cta.height),ringBottom:Math.round(ring.bottom),quoteTop:Math.round(quote.top),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
})()`);
assert.ok(homeLayout.pathsBottom <= homeLayout.viewportHeight, 'desktop home paths must fit in one viewport');
assert.ok(homeLayout.scrollHeight <= homeLayout.viewportHeight + 1, 'desktop home must not require scrolling');
assert.ok(homeLayout.ctaWidth >= 245 && homeLayout.ctaHeight >= 60, 'primary reading action must remain prominent');
assert.ok(homeLayout.quoteTop >= homeLayout.ringBottom - 4, 'home quote must sit below the diagram');
assert.equal(homeLayout.horizontalOverflow, false);
await evaluate(`document.querySelector('.nav-item[data-view="divination"]').click(); true`);
await waitFor(`document.querySelector('#view-divination').classList.contains('active')`);
await sleep(1200);
const castTimeControls = await evaluate(`({date:Boolean(document.querySelector('#castDate')?.value),clock:Boolean(document.querySelector('#castClock')?.value),zone:document.querySelector('#castTimeZone')?.value||''})`);
assert.equal(castTimeControls.date && castTimeControls.clock, true);
assert.ok(castTimeControls.zone);
await evaluate(`document.querySelector('[data-cast-mode="quick"]').click();
  const input=document.querySelector('#questionInput');
  input.value='面对未来三个月的职业选择，我应当注意什么？';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('#confirmQuestion').click(); true`);
await waitFor(`document.querySelector('#divinationConfirmDialog')?.open`);
await evaluate(`document.querySelector('#confirmDivination').click(); true`);
await waitFor(`document.querySelector('#view-divination').classList.contains('quick-mode') && !document.querySelector('#castButton').disabled`);
await evaluate(`document.querySelector('#castButton').click(); true`);
await waitFor(`document.querySelector('#castButton').textContent.includes('演蓍成第1爻')`);
const edition = await evaluate(`({visible:Boolean(document.querySelector('#editionStatus')?.textContent),text:document.querySelector('#editionStatus')?.textContent||''})`);
assert.equal(edition.visible, true);
for (let line = 1; line <= 6; line += 1) {
  await evaluate(`document.querySelector('#castButton').click(); true`);
  await waitFor(`document.querySelector('#lineCount').textContent.includes('${line} / 6')`, 20000);
  if (line === 1) {
    await waitFor(`document.querySelectorAll('#methodAuditRows .method-audit-row').length===3`);
  }
}
await waitFor(`!document.querySelector('#readingPanel').classList.contains('hidden')`);
const layers = await evaluate(`({
  original:Boolean(document.querySelector('#resultOriginal')),
  rule:Boolean(document.querySelector('#resultRule')),
  structure:Boolean(document.querySelector('#resultStructure')),
  principle:Boolean(document.querySelector('#resultPrinciple')),
  note:Boolean(document.querySelector('#resultNote'))
})`);
assert.equal(Object.values(layers).every(Boolean), true);
const liuyao = await evaluate(`(()=>{const button=document.querySelector('[data-reading-result-mode="liuyao"]');button.click();return {rows:document.querySelectorAll('#liuyaoReadingMode .liuyao-table tbody tr').length,calendar:document.querySelector('#liuyaoReadingMode .liuyao-overview')?.textContent||'',classicHidden:document.querySelector('#classicReadingMode').classList.contains('hidden'),chart:Boolean(JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]')[0]?.liuyao)}})()`);
assert.equal(liuyao.rows,6);
assert.match(liuyao.calendar,/月建/);
assert.equal(liuyao.classicHidden&&liuyao.chart,true);
await evaluate(`document.querySelector('[data-reading-result-mode="classic"]').click();true`);
const localReading = await evaluate(`({
  visible:Boolean(document.querySelector('#localReading')?.textContent.trim()),
  actions:document.querySelectorAll('#localReading .interpretation-actions li').length,
  noProgress:!document.querySelector('#aiReading progress, #aiReading [role="progressbar"], #aiReading .spinner')
})`);
assert.equal(localReading.visible, true);
assert.equal(localReading.actions, 3);
assert.equal(localReading.noProgress, true);
await evaluate(`(() => {
  window.GUANXIANG_AI_ENDPOINT='https://mock.example/reading';
  window.__guanxiangRealFetch=window.__guanxiangRealFetch||window.fetch.bind(window);
  window.fetch=(url,options)=>{
    if(String(url)!==window.GUANXIANG_AI_ENDPOINT)return window.__guanxiangRealFetch(url,options);
    const encoder=new TextEncoder(),detailed='条件仍在形成。'.repeat(220),payload=JSON.parse(options?.body||'{}'),movingEvidence=(payload.movingLines||[]).map(line=>line.label+'“'+line.text+'”。').join('\\n');
    return Promise.resolve(new Response(new ReadableStream({start(controller){controller.enqueue(encoder.encode('【核心判断】\\n首段已经到达。\\n【当前处境】\\n'+detailed));setTimeout(()=>{controller.enqueue(encoder.encode('\\n【关键变化】\\n'+movingEvidence+'\\n先核实转折条件。\\n思考方向：先辨明事实。\\n思维调整：从确定答案转向逐步验证。\\n【后续趋势】\\n后续倾向逐步展开。\\n【行动建议】\\n1. 核实事实\\n2. 小步验证\\n3. 按期复盘'));controller.close()},600)}}),{status:200,headers:{'content-type':'text/plain; charset=utf-8'}}));
  };
  const button=document.querySelector('#generateAiReading');button.disabled=false;button.click();return true;
})()`);
await waitFor(`document.querySelector('#aiReadingContent').textContent.includes('首段已经到达')`);
const streaming = await evaluate(`({disabled:document.querySelector('#generateAiReading').disabled,label:document.querySelector('#generateAiReading').textContent})`);
assert.equal(streaming.disabled, true);
assert.equal(streaming.label, '正在解读');
await waitFor(`document.querySelector('#generateAiReading').textContent==='重新生成'`);
const cachedAi = await evaluate(`JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]')[0]?.aiReading?.text||''`);
assert.ok(cachedAi.includes('先核实转折条件'));
await evaluate(`(() => {
  const records=JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]');window.__cachedAiReading=records[0].aiReading;delete records[0].aiReading;localStorage.setItem('guanxiang-history-guest-v1',JSON.stringify(records));
  window.fetch=(url,options)=>{if(String(url)!==window.GUANXIANG_AI_ENDPOINT)return window.__guanxiangRealFetch(url,options);const encoder=new TextEncoder();return Promise.resolve(new Response(new ReadableStream({start(controller){controller.enqueue(encoder.encode('【核心判断】\\n断流前内容。'));setTimeout(()=>controller.error(new Error('closed')),50)}}),{status:200}))};
  document.querySelector('#generateAiReading').click();return true;
})()`);
await waitFor(`!document.querySelector('#aiReadingError').classList.contains('hidden')`);
const interruptedAi=await evaluate(`({partial:document.querySelector('#aiReadingContent').textContent,error:document.querySelector('#aiReadingError').textContent,cached:Boolean(JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]')[0]?.aiReading)})`);
assert.ok(interruptedAi.partial.includes('断流前内容'));
assert.ok(interruptedAi.error.includes('连接中断'));
assert.equal(interruptedAi.cached,false);
await evaluate(`(()=>{const records=JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]');records[0].aiReading=window.__cachedAiReading;localStorage.setItem('guanxiang-history-guest-v1',JSON.stringify(records));return true})()`);
await evaluate(`(() => {
  const records=JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]');delete records[0].aiReading;localStorage.setItem('guanxiang-history-guest-v1',JSON.stringify(records));
  window.fetch=(url,options)=>{if(String(url)!==window.GUANXIANG_AI_ENDPOINT)return window.__guanxiangRealFetch(url,options);return Promise.resolve(new Response('【核心判断】\\n正常关闭但未完成。',{status:200,headers:{'content-type':'text/plain; charset=utf-8'}}))};
  document.querySelector('#generateAiReading').click();return true;
})()`);
await waitFor(`document.querySelector('#aiReadingError').textContent.includes('未完整生成')`);
const incompleteAi=await evaluate(`({partial:document.querySelector('#aiReadingContent').textContent,error:document.querySelector('#aiReadingError').textContent,cached:Boolean(JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]')[0]?.aiReading)})`);
assert.ok(incompleteAi.partial.includes('正常关闭但未完成'));
assert.ok(incompleteAi.error.includes('未完整生成'));
assert.equal(incompleteAi.cached,false);
await evaluate(`(()=>{const records=JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]');records[0].aiReading=window.__cachedAiReading;localStorage.setItem('guanxiang-history-guest-v1',JSON.stringify(records));return true})()`);
await evaluate(`(()=>{const note=document.querySelector('#readingNote');note.value='浏览器冒烟测试札记';document.querySelector('#saveReadingNote').click();return true})()`);
const result = await evaluate(`(() => {
  const records=JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]');
  return {
    lineCount:document.querySelector('#lineCount').textContent,
    result:document.querySelector('#readingTitle').textContent,
    related:document.querySelectorAll('#readingRelated .relation-link').length,
    history:records.length,
    note:records[0]?.note||''
  };
})()`);
assert.equal(result.lineCount.includes('6 / 6'), true);
assert.ok(result.result.length > 0);
assert.ok(result.related >= 2);
assert.equal(result.history, 1);
assert.equal(result.note, '浏览器冒烟测试札记');

await evaluate(`location.hash='#history'; true`);
await waitFor(`document.querySelectorAll('#historyList .history-item').length===1 && !document.querySelector('#historyIndexPage').hidden && document.querySelector('#historyRecordPage').hidden`);
const journalIndex = await evaluate(`({
  items:document.querySelectorAll('#historyList .history-item').length,
  detailVisible:document.querySelector('#historyRecordPage').getBoundingClientRect().height>0,
  indexVisible:document.querySelector('#historyIndexPage').getBoundingClientRect().height>0,
  recordId:JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')||'[]')[0]?.id||''
})`);
assert.equal(journalIndex.items, 1);
assert.equal(journalIndex.detailVisible, false);
assert.equal(journalIndex.indexVisible, true);
assert.ok(journalIndex.recordId);
await evaluate(`const search=document.querySelector('#historySearch');search.value='浏览器冒烟';search.dispatchEvent(new Event('input',{bubbles:true}));true`);
await waitFor(`document.querySelectorAll('#historyList .history-item').length===1`);
await evaluate(`document.querySelector('#historyList .history-item').click(); true`);
await waitFor(`location.hash.startsWith('#history/') && document.querySelector('#historyDetail #historyNote') && document.querySelector('#historyIndexPage').hidden && !document.querySelector('#historyRecordPage').hidden`);
await waitFor(`document.querySelector('#historyDetail .ai-interpretation')?.textContent.includes('先核实转折条件')`);
const journal = await evaluate(`({
  route:location.hash,
  note:document.querySelector('#historyNote').value,
  exportButton:Boolean(document.querySelector('#exportHistory')),
  importButton:Boolean(document.querySelector('#importHistory')),
  deleteButton:Boolean(document.querySelector('#deleteHistory'))
  ,aiReading:Boolean(document.querySelector('#historyDetail .ai-interpretation')),
  liuyaoRows:document.querySelectorAll('#historyDetail .history-liuyao .liuyao-table tbody tr').length,
  detailWidth:Math.round(document.querySelector('#historyRecordPage').getBoundingClientRect().width)
})`);
assert.ok(journal.route.includes(encodeURIComponent(journalIndex.recordId)));
assert.equal(journal.note, '浏览器冒烟测试札记');
assert.equal(journal.aiReading, true);
assert.equal(journal.liuyaoRows, 6);
assert.equal(journal.exportButton && journal.importButton && journal.deleteButton, true);
assert.ok(journal.detailWidth >= 800, 'desktop history detail should use a full reading page');
await evaluate(`document.querySelector('#saveHistoryNote').click();true`);
await waitFor(`document.querySelector('#historyNoteStatus').textContent.includes('已保存')`);
await evaluate(`history.back();true`);
await waitFor(`location.hash==='#history' && !document.querySelector('#historyIndexPage').hidden && document.querySelector('#historyRecordPage').hidden`);
await evaluate(`document.querySelector('#historyList .history-item').click();true`);
await waitFor(`location.hash.startsWith('#history/') && !document.querySelector('#historyRecordPage').hidden`);
await evaluate(`document.querySelector('[data-history-back]').click();true`);
await waitFor(`location.hash==='#history' && !document.querySelector('#historyIndexPage').hidden`);
await evaluate(`location.hash='#history/not-a-real-record';true`);
await waitFor(`location.hash==='#history' && !document.querySelector('#historyIndexPage').hidden && document.querySelectorAll('#historyList .history-item').length===1`);
await evaluate(`location.hash='#history/${encodeURIComponent(journalIndex.recordId)}';true`);
await waitFor(`!document.querySelector('#historyRecordPage').hidden && document.querySelector('#historyDetail #historyNote')`);
const originalQuestion = await evaluate(`document.querySelector('.history-detail blockquote').textContent`);
await evaluate(`document.querySelector('#languageToggle [data-language-menu-trigger]').click();document.querySelector('#languageToggle [data-language="en"]').click();true`);
await waitFor(`document.documentElement.lang==='en' && document.querySelector('[data-history-back]').textContent.includes('Back to journal')`);
const journalEnglish = await evaluate(`({question:document.querySelector('.history-detail blockquote').textContent,aiVisible:Boolean(document.querySelector('#historyDetail .ai-interpretation')),lineLabel:document.querySelector('.history-lines b').textContent,liuyaoTitle:document.querySelector('.history-liuyao h3').textContent,liuyaoMode:document.querySelector('[data-reading-result-mode="liuyao"]')?.textContent||''})`);
assert.equal(journalEnglish.question, originalQuestion, 'saved questions must remain exactly as written');
assert.equal(journalEnglish.aiVisible, false, 'AI readings in another language must not appear as translated results');
assert.equal(journalEnglish.lineLabel, 'Line 6');
assert.equal(journalEnglish.liuyaoTitle, 'Restored from the casting time');
await evaluate(`document.querySelector('#languageToggle [data-language-menu-trigger]').click();document.querySelector('#languageToggle [data-language="fa"]').click();true`);
await waitFor(`document.documentElement.lang==='fa' && document.querySelector('.history-liuyao h3').textContent.includes('بازسازی')`);
const journalPersian = await evaluate(`({lineLabel:document.querySelector('.history-lines b').textContent,lineRecord:document.querySelector('#lineRecords .line-record span')?.textContent||'',liuyaoTitle:document.querySelector('.history-liuyao h3').textContent,overflow:document.documentElement.scrollWidth>innerWidth})`);
assert.equal(journalPersian.lineLabel, 'خط 6');
assert.match(journalPersian.lineRecord, /^خط 1 ·/);
assert.doesNotMatch(journalPersian.lineRecord, /第1爻|老[阴阳]|少[阴阳]/);
assert.equal(journalPersian.liuyaoTitle, 'بازسازی‌شده از زمان فال');
assert.equal(journalPersian.overflow, false);
await evaluate(`document.querySelector('#languageToggle [data-language-menu-trigger]').click();document.querySelector('#languageToggle [data-language="zh-CN"]').click();true`);
await waitFor(`document.documentElement.lang==='zh-CN' && document.querySelector('#historyDetail .ai-interpretation')`);

await command('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await command('Page.navigate', { url: `http://127.0.0.1:4175/#history/${encodeURIComponent(journalIndex.recordId)}` });
await waitFor(`!document.querySelector('#historyRecordPage').hidden && document.querySelector('#historyDetail #historyNote')`);
const historyMobile = await evaluate(`({width:document.documentElement.scrollWidth,viewport:innerWidth,indexHidden:document.querySelector('#historyIndexPage').hidden,detailVisible:document.querySelector('#historyRecordPage').getBoundingClientRect().height>0})`);
assert.ok(historyMobile.width <= historyMobile.viewport, 'mobile history detail must not overflow horizontally');
assert.equal(historyMobile.indexHidden && historyMobile.detailVisible, true);
await command('Page.navigate', { url: 'http://127.0.0.1:4175/#home' });
await waitFor(`document.querySelector('#view-home').classList.contains('active')`);
const homeMobile = await evaluate(`(()=>{const cta=document.querySelector('.home-primary-action').getBoundingClientRect(),strong=document.querySelector('.home-primary-copy strong').getBoundingClientRect(),small=document.querySelector('.home-primary-copy small').getBoundingClientRect(),ring=document.querySelector('#view-home .ring-two').getBoundingClientRect(),quote=document.querySelector('#view-home .home-symbol-quote'),daily=document.querySelector('#dailyCoverHexagram'),nav=document.querySelector('.sidebar>.primary-nav');return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,ctaWidth:Math.round(cta.width),ctaVisible:cta.top<innerHeight&&cta.bottom>0,copyGap:Math.round(small.top-strong.bottom),navBackground:getComputedStyle(nav).backgroundColor,ringWidth:Math.round(ring.width),quoteVisible:getComputedStyle(quote).display!=='none'&&quote.getBoundingClientRect().height>0,dailyLabel:daily.getAttribute('aria-label'),dailyLines:daily.querySelectorAll('.cover-line').length}})()`);
assert.ok(homeMobile.scrollWidth <= homeMobile.viewport);
assert.ok(homeMobile.ctaWidth <= homeMobile.viewport && homeMobile.ctaVisible);
assert.ok(homeMobile.copyGap >= 4, 'mobile primary action labels must not overlap');
assert.ok(!homeMobile.navBackground.includes('rgba'), 'mobile navigation must fully mask scrolling text');
assert.ok(homeMobile.ringWidth >= 260, 'mobile home must retain the complete circular diagram');
assert.equal(homeMobile.quoteVisible, true, 'mobile home must retain the classic quotation');
assert.match(homeMobile.dailyLabel, /今日一卦/);
assert.equal(homeMobile.dailyLines, 6);
await command('Page.navigate', { url: 'http://127.0.0.1:4175/#classics/1/1' });
await waitFor(`document.querySelector('#wing-0-section-0 .section-link')`);
await sleep(500);
const responsive = await evaluate(`({
  width:document.documentElement.scrollWidth,
  viewport:innerWidth,
  reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
  source:Boolean(document.querySelector('.edition-source')),
  anchor:Boolean(document.querySelector('#wing-0-section-0'))
})`);
assert.ok(responsive.width <= responsive.viewport);
assert.equal(responsive.reduced, true);
assert.equal(responsive.source, true);
assert.equal(responsive.anchor, true);

await command('Page.navigate', { url: 'http://127.0.0.1:4175/#hexagrams/1' });
await waitFor(`document.querySelector('#hexComparePanel .compare-card')`);
const comparison = await evaluate(`({
  labels:[...document.querySelectorAll('#hexComparePanel .compare-card small')].map(item=>item.textContent),
  annotation:Boolean(document.querySelector('.annotation-form')),
  manifest:Boolean(document.querySelector('link[rel="manifest"]'))
})`);
assert.deepEqual(comparison.labels, ['本卦','互卦','错卦','综卦']);
assert.equal(comparison.annotation && comparison.manifest, true);
await evaluate(`(()=>{const annotationNote=document.querySelector('.annotation-form textarea');annotationNote.value='移动端冒烟批注';document.querySelector('.annotation-form').requestSubmit();return true})()`);
await waitFor(`document.querySelectorAll('.annotation-item').length===1`);
await evaluate(`document.querySelector('[data-delete-annotation]').click();true`);
await waitFor(`document.querySelectorAll('.annotation-item').length===0`);

await command('Page.navigate', { url: 'http://127.0.0.1:4175/#principles/1' });
await waitFor(`document.querySelectorAll('#studyPath .study-step').length===8`);
await evaluate(`document.querySelector('#studyPath .study-step').click();true`);
await waitFor(`document.querySelector('#studyPath .study-step.done')`);
const study = await evaluate(`({done:document.querySelectorAll('#studyPath .study-step.done').length,stored:Boolean(localStorage.getItem('guanxiang-study-v1')),importDialog:Boolean(document.querySelector('#importDialog'))})`);
assert.equal(study.done, 1);
assert.equal(study.stored && study.importDialog, true);

await evaluate(`localStorage.removeItem('guanxiang-cast-v3'); true`);
await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await command('Page.navigate', { url: 'http://127.0.0.1:4175/?complete-test=1#divination/prepare' });
await waitFor(`document.querySelector('[data-cast-mode="complete"].active') && !document.querySelector('#questionInput').readOnly`);
await sleep(1000);
await evaluate(`const input=document.querySelector('#questionInput');
  input.value='面对下周的重要沟通，我应当注意什么？';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('#confirmQuestion').click(); true`);
await waitFor(`document.querySelector('#divinationConfirmDialog')?.open`);
await evaluate(`document.querySelector('#confirmDivination').click(); true`);
await waitFor(`!document.querySelector('#castButton').disabled`);
await evaluate(`document.querySelector('#castButton').click(); true`);
await waitFor(`document.querySelector('#castButton').textContent.includes('请先按住蓍束')`);
const gateBefore = await evaluate(`document.querySelector('#castButton').disabled`);
await evaluate(`const chooser=document.querySelector('#splitChooser');
  chooser.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,clientX:30,pressure:.4}));
  chooser.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,clientX:34,pressure:.4})); true`);
await waitFor(`!document.querySelector('#castButton').disabled && document.querySelector('#splitPreview').textContent.includes('分界已定')`);
await evaluate(`document.querySelector('#castButton').click(); true`);
await waitFor(`document.querySelector('#leftPile strong').textContent !== '—'`);
const complete = await evaluate(`({
  defaultMode:document.querySelector('[data-cast-mode="complete"]').classList.contains('active'),
  gateBefore:${gateBefore},
  splitReady:document.querySelector('#splitPreview').textContent.includes('分界已定'),
  left:Number(document.querySelector('#leftPile strong').textContent),
  right:Number(document.querySelector('#rightPile strong').textContent)
})`);
assert.equal(complete.defaultMode, true);
assert.equal(complete.gateBefore, true);
assert.equal(complete.splitReady, true);
assert.equal(complete.left + complete.right, 49);
socket.close();
console.log(JSON.stringify({ homeLayout, homeMobile, result, localReading, streaming, interruptedAi, journal, responsive, complete }, null, 2));
