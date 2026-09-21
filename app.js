import hexagrams from './hexagram-catalog.mjs';
import { drawYarrowChange, randomSplitCount } from './yarrow-core.mjs';
import { readingRule } from './reading-rules.mjs';
import { catalogLines, hexagramRelations } from './derived-hexagrams.mjs';
import { dailyHexagramIndex, millisecondsUntilNextLocalDay } from './daily-hexagram.mjs';
import { loadAnnotations, loadStudyState, saveAnnotation, saveStudyState, deleteAnnotation } from './study-storage.mjs';
import { backupStatus, mergeJournalRecords, migrateJournalPayload, normalizeHistoryRecords, readJson, writeJson } from './storage.mjs?v=20260916-history2';
import { buildLocalInterpretation, buildEnglishInterpretation } from './interpretation.mjs';
import { AiReadingError, requestAiReading, splitAiReadingSections, splitAiReadingSectionsLocalized } from './ai-reading.mjs';
import { attributeHtml, textHtml } from './html-safety.mjs';
import { createServiceWorkerActivator } from './service-worker-update.mjs';
import { getLanguage, setLanguage, t, translateDom, translateKnownText } from './i18n.mjs?v=20260917-reviewfix1';
import { displayHexagramName, HEXAGRAM_EN, TRIGRAM_EN } from './hexagram-i18n.mjs';
import { selectTenWingSources } from './ai-sources.mjs';

const yaoTexts=['初九：潜龙勿用。','九二：见龙在田，利见大人。','九三：君子终日乾乾，夕惕若厉，无咎。','九四：或跃在渊，无咎。','九五：飞龙在天，利见大人。','上九：亢龙有悔。'];
const canonicalClassicSummaries=['逐卦断义，说明卦名、卦辞与上下体之大旨。','承接上经，论三十卦之时位与吉凶。','取卦象明君子之用，列上经三十卦大象。','逐卦取象明德，列下经三十四卦大象。','总论天地之道、象数之源与易学体用。','论圣人设卦、观象玩辞与卜筮之道。','专释乾坤，申说元亨利贞与君子之德。','说明八卦取象、方位、性情与万物类象。','说明六十四卦相承的次序与变化的链条。','以错综互杂比较诸卦，见相反相成之理。'];
const canonicalClassicQuotes=['彖者，言乎象者也；爻者，言乎变者也。','刚柔相推而生变化，吉凶者，失得之象也。','君子见善则迁，有过则改。','君子以思不出其位，居贤德而善俗。','易与天地准，故能弥纶天地之道。','易无思也，无为也，寂然不动，感而遂通天下之故。','夫大人者，与天地合其德，与日月合其明。','天地定位，山泽通气，雷风相薄，水火不相射。','物不可穷也，故受之以未济终焉。','乾刚坤柔，比乐师忧。'];
const AI_REFERENCE_NOTES={
  zh:{
    水风井:['井卦初六：井底有泥、旧井废弃，指资源尚未整理到可用状态。','井卦九二：浅处逐鱼且汲水器漏，指资源误用或工具不足。','井卦九三：井已经淘清却无人饮用，重点是能力已备但尚未被识别；不可解释为井水污浊或不可饮。','井卦六四：用砖石修整井壁，指继续筑牢基础。','井卦九五：井水清冽可饮，指价值进入稳定输出阶段。','井卦上六：井成后不要遮盖，指让成果开放流通并以诚信维持。'],
    山天大畜:['大畜初九：前行有危险，适宜暂时停止，不是自我完善之意。','大畜九二：车轴连接处脱开而停止，指能够审时自止，不是组织调适或车轮顺畅运行。','大畜九三：良马追逐仍须艰贞，并每日训练车驾防卫，指准备充分后再进。','大畜六四：幼牛尚未长角就加以防护，指防患于未然、及早建立约束。','大畜六五：从根本驯服危险力量，指治本而非只压制表面。','大畜上九：通达于天衢，指蓄积完成后道路开放。']
  },
  en:{
    水风井:['Well line 1: mud at the bottom and an abandoned old well mean resources are not yet organized for use.','Well line 2: hunting fish in the shallows with a leaking vessel means resources are misdirected or the tools are inadequate.','Well line 3: the well has already been cleaned but nobody drinks from it; ability is ready but unrecognized. Do not interpret the water as muddy or undrinkable.','Well line 4: lining the well with masonry means continuing to strengthen the foundation.','Well line 5: the clear, cold spring can be drunk, meaning value has reached stable output.','Well line 6: do not cover a completed well; let results circulate openly and sustain them through trust.'],
    山天大畜:['Great Taming line 1: danger lies ahead, so stopping for now is beneficial; it does not mean self-improvement.','Great Taming line 2: the axle fastening comes loose and the vehicle stops; this means knowing when to stop, not smooth motion or organizational adjustment.','Great Taming line 3: the good horse pursues, but daily training in driving and defense is required; proceed only after preparation.','Great Taming line 4: restraining a young bull before its horns grow means preventing trouble early and setting constraints in advance.','Great Taming line 5: dangerous force is tamed at its root rather than suppressed only at the surface.','Great Taming line 6: reaching the highway of heaven means the road opens after accumulation is complete.']
  }
};
let currentView='home', selectedHex=0, selectedWing=0, selectedPrinciple=0, selectedClassicSection=null, historySelectedId='', historyQuery='', filter='all', readingMode='ancient', pendingImport=null, currentReading=null, aiReadingAbort=null, castState={lines:[],working:false,runId:0,ritual:null,confirmed:false,prepared:false,question:'',sessionId:'',mode:'complete'}, tenWings=null, hexagramTexts=null, principleLibrary=null, principleLibraryEn=null, relationsLibrary=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const TRIGRAM_GLYPHS={'天':'☰','泽':'☱','火':'☲','雷':'☳','风':'☴','水':'☵','山':'☶','地':'☷'};
let dailyCoverTimer=0;
function updateDailyCoverHexagram(date=new Date()){
  const cover=$('#dailyCoverHexagram');
  if(!cover)return;
  const index=dailyHexagramIndex(date),hexagram=hexagrams[index],lines=catalogLines(index);
  if(!hexagram||!lines)return;
  cover.dataset.name=hexagram[0];
  cover.dataset.summary=hexagram[2];
  const disc=cover.querySelector('.cover-disc');
  if(disc){disc.dataset.upper=`${hexagram[6]}  ${TRIGRAM_GLYPHS[hexagram[6]]||''}`.trim();disc.dataset.lower=`${hexagram[7]}  ${TRIGRAM_GLYPHS[hexagram[7]]||''}`.trim()}
  cover.querySelectorAll('.cover-line').forEach((line,lineIndex)=>{
    const solid=lines[lineIndex]===1;
    line.classList.toggle('broken',!solid);
    line.replaceChildren(...Array.from({length:solid?1:2},()=>document.createElement('b')));
  });
  const label=getLanguage()==='en'
    ?`Daily hexagram: ${HEXAGRAM_EN[index]||hexagram[2]}, ${TRIGRAM_EN[hexagram[6]]||hexagram[6]} over ${TRIGRAM_EN[hexagram[7]]||hexagram[7]}`
    :`今日一卦：第${index+1}卦${hexagram[2]}`;
  cover.setAttribute('aria-label',label);
}
function scheduleDailyCoverHexagram(){
  clearTimeout(dailyCoverTimer);
  dailyCoverTimer=setTimeout(()=>{updateDailyCoverHexagram();scheduleDailyCoverHexagram()},Math.max(1000,millisecondsUntilNextLocalDay()+50));
}
function initDailyCoverHexagram(){
  updateDailyCoverHexagram();
  scheduleDailyCoverHexagram();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateDailyCoverHexagram()});
}
function initLandingCover(){
  const cover=$('#siteCover'),app=$('.app-shell'),enter=$('#enterSite');
  if(!cover||!app||!enter)return;
  app.setAttribute('inert','');
  app.setAttribute('aria-hidden','true');
  document.body.classList.add('cover-active');
  const finish=()=>{
    if(cover.hidden)return;
    cover.hidden=true;
    app.removeAttribute('inert');
    app.removeAttribute('aria-hidden');
    document.body.classList.remove('cover-active');
    $('.main-content')?.focus({preventScroll:true});
    requestAnimationFrame(()=>document.dispatchEvent(new Event('guanxiang:entered')));
  };
  enter.addEventListener('click',()=>{
    if(cover.classList.contains('is-leaving'))return;
    cover.classList.add('is-leaving');
    if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)finish();
    else{const complete=event=>{if(event.target!==cover)return;cover.removeEventListener('animationend',complete);finish()};cover.addEventListener('animationend',complete)}
  });
  requestAnimationFrame(()=>enter.focus({preventScroll:true}));
}
const searchCharMap=Object.fromEntries([...`傳經數萬與為無後來見龍時國陰陽學觀義禮樂風澤貞變應聖體書辭問斷說損艱廣開閉東門雲氣順處進退長終實虛剛柔動靜險濟師謙豫隨蠱臨頤過離咸恆遯壯晉夷睽蹇解夬姤萃升困井革鼎震巽兌渙節孚過既未`].map((char,index)=>[char,[...`传经数万与为无后来见龙时国阴阳学观义礼乐风泽贞变应圣体书辞问断说损艰广开闭东门云气顺处进退长终实虚刚柔动静险济师谦豫随蛊临颐过离咸恒遁壮晋夷睽蹇解夬姤萃升困井革鼎震巽兑涣节孚过既未`][index]]));
function normalizeSearchText(value){return [...String(value||'').toLowerCase()].map(char=>searchCharMap[char]||char).join('')}
function setMobileDetail(view,open){document.querySelector(`#view-${view}`)?.classList.toggle('mobile-detail-open',Boolean(open))}
function closeMobileMore(returnFocus=false){
  document.body.classList.remove('mobile-more-open');
  const toggle=$('#mobileMoreToggle');
  toggle?.setAttribute('aria-expanded','false');
  if(returnFocus)toggle?.focus();
}
function toggleMobileMore(){
  const open=!document.body.classList.contains('mobile-more-open');
  closeMobileMore();
  if(open){document.body.classList.add('mobile-more-open');$('#mobileMoreToggle')?.setAttribute('aria-expanded','true');$('#mobileMoreMenu .nav-item')?.focus()}
}
function routeForView(view){if(view==='hexagrams')return `#hexagrams/${selectedHex+1}`;if(view==='classics')return `#classics/${selectedWing+1}`;if(view==='principles')return `#principles/${selectedPrinciple+1}`;if(view==='divination')return `#divination/${$('#view-divination')?.dataset.phase||'prepare'}`;if(view==='history')return historySelectedId?`#history/${encodeURIComponent(historySelectedId)}`:'#history';return '#home'}
function nav(view,updateRoute=true){currentView=view;closeMobileMore();$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${view}`));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#mobileMoreToggle')?.classList.toggle('active',view==='classics'||view==='principles');const names={home:t('nav.home'),hexagrams:t('nav.hexagrams'),divination:t('nav.divination'),history:t('nav.history'),classics:t('nav.classics'),principles:t('nav.principles')};$('#breadcrumbCurrent').textContent=names[view]||names.home;if(updateRoute&&location.hash!==routeForView(view))history.pushState(null,'',routeForView(view));window.scrollTo({top:0,behavior:'smooth'})}
function applyRoute(){const [view='home',value='',section='']=(location.hash.slice(1)||'home').split('/');if(view==='hexagrams'){selectedHex=Math.max(0,Math.min(63,(Number(value)||1)-1));nav('hexagrams',false);setMobileDetail('hexagrams',Boolean(value));renderHexList();renderHexDetail();return}if(view==='classics'){selectedWing=Math.max(0,Math.min(9,(Number(value)||1)-1));selectedClassicSection=section?Math.max(0,(Number(section)||1)-1):null;nav('classics',false);renderClassics();return}if(view==='principles'){selectedPrinciple=Math.max(0,Math.min(7,(Number(value)||1)-1));nav('principles',false);renderPrinciples();return}if(view==='divination'){nav('divination',false);setDivinationPhase(value||'prepare',false,false);return}if(view==='history'){try{historySelectedId=decodeURIComponent(value||'')}catch{historySelectedId=''}nav('history',false);renderHistory();return}nav('home',false)}
function hexSearchCorpus(index,hexagram){const source=hexagramTexts?.hexagrams?.[index],suffix=index<30?'shang':'xia',tuan=tenWings?.wings?.find(wing=>wing.id===`tuan-${suffix}`)?.sections?.find(section=>section.number===index+1),xiang=tenWings?.wings?.find(wing=>wing.id===`xiang-${suffix}`)?.sections?.find(section=>section.number===index+1);return [hexagram.join(' '),source?.text,...(source?.lines||[]).flatMap(line=>[line.label,line.text]),tuan?.text,xiang?.text].filter(Boolean).join(' ')}
function renderHexList(){const q=normalizeSearchText(($('#hexSearch')?.value||'').trim());const rows=hexagrams.map((hex,i)=>({hex,i})).filter(({hex,i})=>(filter==='all'||(filter==='upper'?i<30:i>=30))&&(!q||normalizeSearchText(hexSearchCorpus(i,hex)).includes(q)));$('#hexList').innerHTML=rows.map(({hex:h,i})=>`<button type="button" class="hex-row ${i===selectedHex?'selected':''}" data-index="${i}" aria-pressed="${i===selectedHex}"><span class="hex-num">${String(i+1).padStart(2,'0')}</span><span class="hex-glyph">${h[1]}</span><span class="hex-row-copy"><span class="hex-row-name">${h[2]}</span><span class="hex-row-trigram">${h[6]}上 · ${h[7]}下</span></span><span class="hex-row-tag">${h[0]}</span></button>`).join('')||'<div class="record-empty">未找到相应卦象</div>';$$('.hex-row').forEach(row=>row.addEventListener('click',()=>{selectedHex=+row.dataset.index;nav('hexagrams');setMobileDetail('hexagrams',true);renderHexList();renderHexDetail();if(innerWidth<=680)window.scrollTo({top:0,behavior:'smooth'})}))}
function relationCards(hexIndex,limit=12){const refs=relationsLibrary?.hexagrams?.[String(hexIndex+1)]?.references||[];return refs.slice(0,limit).map(ref=>`<button type="button" class="relation-link" data-classic-ref="${ref.wingIndex}/${ref.sectionIndex}"><b>${textHtml(ref.wingTitle)}</b><span>第 ${ref.sectionNumber} 段 · ${ref.kind==='direct'?'本卦专释':'文中引卦'}</span><small>${textHtml(ref.excerpt)}${ref.excerpt.length>=92?'…':''}</small></button>`).join('')}
function openClassicReference(wingIndex,sectionIndex){selectedWing=Number(wingIndex);selectedClassicSection=Number(sectionIndex);location.hash=`#classics/${selectedWing+1}/${selectedClassicSection+1}`}
function bindRelationLinks(root=document){root.querySelectorAll?.('[data-classic-ref]').forEach(button=>button.addEventListener('click',()=>{const [wing,section]=button.dataset.classicRef.split('/');openClassicReference(wing,section)}))}
function renderHexDetail(){const h=hexagrams[selectedHex],source=hexagramTexts?.hexagrams?.[selectedHex],wingSuffix=selectedHex<30?'shang':'xia',tuanWing=tenWings?.wings?.find(w=>w.id===`tuan-${wingSuffix}`),xiangWing=tenWings?.wings?.find(w=>w.id===`xiang-${wingSuffix}`),tuan=tuanWing?.sections?.find(s=>s.number===selectedHex+1),xiang=xiangWing?.sections?.find(s=>s.number===selectedHex+1),yao=source?.lines||yaoTexts.map(text=>{const [label,...rest]=text.split('：');return {label,text:rest.join('：')}}),relations=relationCards(selectedHex);$('#hexDetail').innerHTML=`<button type="button" class="mobile-back-button" data-mobile-back="hexagrams">‹ ${t('hex.back')}</button><div class="detail-top"><div><div class="detail-order">第 ${String(selectedHex+1).padStart(2,'0')} 卦 · ${selectedHex<30?'上经':'下经'}</div><div class="detail-glyph">${h[1]}</div><h2 class="detail-title">${h[2]}</h2><div class="detail-subtitle">${h[6]}上${h[7]}下 · ${h[0]}卦</div></div></div><div class="detail-meaning">${h[3]}</div><div class="detail-section"><h4>卦辞 · THE JUDGMENT</h4><p class="wing-original">${source?.text?textHtml(source.text):h[4]}</p></div><div class="detail-section"><h4>彖传 · 本卦总断</h4><p class="wing-original">${tuan?.text?textHtml(tuan.text):`${h[5]}。观其时，察其位，行其中道。`}</p></div><div class="detail-section"><h4>象传 · 大象与小象</h4><p class="wing-original">${xiang?.text?textHtml(xiang.text):'象传正在载入。'}</p></div><div class="detail-section"><h4>爻辞 · 六爻与用九/用六</h4><div class="yao-list">${yao.map(line=>`<div class="yao-item"><b>${textHtml(line.label)}</b><span>${textHtml(line.text)}</span></div>`).join('')}</div></div><div class="detail-section relation-section"><h4>十翼关联 · 经传互参</h4><div class="relation-list">${relations||'<p class="library-loading">关联索引正在载入。</p>'}</div></div>`;$('#hexDetail [data-mobile-back]')?.addEventListener('click',()=>{setMobileDetail('hexagrams',false);history.replaceState(null,'','#hexagrams');window.scrollTo({top:0,behavior:'smooth'})});bindRelationLinks($('#hexDetail'));renderHexStudy()}
function annotationFormHtml(target, records) {
  return `<section class="annotation-panel"><div class="annotation-head"><div><span class="panel-kicker">个人批注</span><h4>把这一处读法留下来</h4></div><span>${t('annotations.count',{count:records.length})}</span></div><form class="annotation-form" data-annotation-type="${attributeHtml(target.sourceType)}" data-annotation-id="${attributeHtml(target.sourceId)}"><textarea name="note" maxlength="2000" required placeholder="写下你的理解、疑问或可验证的行动。"></textarea><input name="tags" maxlength="180" placeholder="标签，用逗号分隔" /><button type="submit" class="secondary-button">保存批注</button></form>${records.map(record=>`<article class="annotation-item"><p>${textHtml(record.note)}</p><small>${textHtml(record.tags.join(' · ')||'无标签')} · ${textHtml(record.reviewState)}</small><div><select data-annotation-review="${attributeHtml(record.id)}" aria-label="批注复习状态"><option ${record.reviewState==='未开始'?'selected':''}>未开始</option><option ${record.reviewState==='研读中'?'selected':''}>研读中</option><option ${record.reviewState==='已复习'?'selected':''}>已复习</option></select><button type="button" class="text-button" data-delete-annotation="${attributeHtml(record.id)}">删除</button></div></article>`).join('')}</section>`;
}
function bindAnnotationPanel(root, target) {
  const form = root.querySelector('.annotation-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    try { saveAnnotation({sourceType:target.sourceType,sourceId:target.sourceId,note:String(data.get('note')||'').trim(),tags:String(data.get('tags')||'').split(',').map(tag=>tag.trim()).filter(Boolean)}); renderStudyPanels(); showNotice('批注已保存。'); } catch { showNotice('批注未保存：请检查文字长度。'); }
  });
  root.querySelectorAll('[data-delete-annotation]').forEach(button => button.addEventListener('click', () => { deleteAnnotation(button.dataset.deleteAnnotation); renderStudyPanels(); }));
  root.querySelectorAll('[data-annotation-review]').forEach(select => select.addEventListener('change', () => { const record=loadAnnotations().find(item=>item.id===select.dataset.annotationReview); if(record){ saveAnnotation({...record,reviewState:select.value}); renderStudyPanels(); } }));
}
function renderAnnotationPanel(container, sourceType, sourceId) {
  if (!container) return;
  let panel = container.querySelector(':scope > .annotation-panel');
  if (!panel) { panel=document.createElement('div'); container.appendChild(panel); }
  const records=loadAnnotations().filter(item=>item.sourceType===sourceType&&item.sourceId===sourceId);
  panel.outerHTML=annotationFormHtml({sourceType,sourceId},records);
  bindAnnotationPanel(container,{sourceType,sourceId});
}
function renderHexStudy() {
  const detail=$('#hexDetail'); if(!detail) return;
  let panel=detail.querySelector('#hexComparePanel');
  if(!panel){ panel=document.createElement('section'); panel.id='hexComparePanel'; panel.className='hex-compare-panel'; detail.appendChild(panel); }
  const relations=hexagramRelations(catalogLines(selectedHex)), labels={self:'本卦',mutual:'互卦',opposite:'错卦',inverse:'综卦'};
  panel.innerHTML=`<div class="detail-section"><h4>卦象比较 · 互错综</h4><p class="compare-note">这些是观察结构的传统工具，不是新增的经文卦辞。</p><div class="compare-grid">${Object.entries({self:selectedHex,...relations}).map(([kind,index])=>{const h=hexagrams[index];return `<button type="button" class="compare-card ${kind==='self'?'active':''}" data-compare-index="${index}"><small>${labels[kind]}</small><strong>${h?.[1]||'—'}</strong><b>${h?textHtml(displayHexagramName(index,getLanguage(),h[2])):'未能映射'}</b></button>`}).join('')}</div></div>`;
  panel.querySelectorAll('[data-compare-index]').forEach(button=>button.addEventListener('click',()=>{selectedHex=Number(button.dataset.compareIndex);nav('hexagrams');renderHexList();renderHexDetail()}));
  renderAnnotationPanel(detail,'hexagram',String(selectedHex));
}
function activePrincipleLibrary(){return getLanguage()==='en'&&principleLibraryEn?principleLibraryEn:principleLibrary}
function renderStudyPath() {
  const target=$('#studyPath'),sections=activePrincipleLibrary()?.sections||[]; if(!target||!sections.length)return;
  const state=loadStudyState(),completed=new Set(state.completed);
  target.innerHTML=`<div class="study-path-head"><div><span class="panel-kicker">${t('principles.path')}</span><h2>${t('principles.pathTitle')}</h2></div><span>${t('principles.completed',{done:completed.size,total:sections.length})}</span></div><div class="study-path-grid">${sections.map((section,index)=>`<button type="button" class="study-step ${completed.has(section.id)?'done':''}" data-study-id="${section.id}" data-study-index="${index}"><span>${String(index+1).padStart(2,'0')}</span><b>${section.title}</b><small>${completed.has(section.id)?t('principles.completedLabel'):t('principles.markReviewed')}</small></button>`).join('')}</div>`;
  target.querySelectorAll('[data-study-id]').forEach(button=>button.addEventListener('click',()=>{const next=loadStudyState(),id=button.dataset.studyId;next.completed=next.completed.includes(id)?next.completed.filter(item=>item!==id):[...next.completed,id];next.current=Number(button.dataset.studyIndex);saveStudyState(next);renderStudyPath();}));
}
function renderStudyPanels(){renderHexStudy();renderClassics();renderPrinciples();renderStudyPath();}
function wingBookmarks(){try{return JSON.parse(localStorage.getItem('guanxiang-wing-bookmarks')||'[]')}catch{return []}}
function renderEditionStatus(){const target=$('#editionStatus');if(!target||!tenWings)return;const language=getLanguage(),retrieved=tenWings.retrievedAt?new Date(tenWings.retrievedAt).toLocaleDateString(language==='en'?'en-US':'zh-CN'):t('edition.dateMissing');target.innerHTML=`<b>${t('edition.status')}</b><span class="source-metadata">${textHtml(tenWings.edition||t('edition.unspecified'))}</span><span>${t('edition.source')}<span class="source-metadata">${textHtml(tenWings.source||t('edition.unspecified'))}</span></span><span>${t('edition.dataDate')}${textHtml(retrieved)}</span><span>${t('edition.variants')}</span>`}
function showOnboardingIfNeeded(){if(document.body.classList.contains('cover-active')){document.addEventListener('guanxiang:entered',showOnboardingIfNeeded,{once:true});return}const dialog=$('#onboardingDialog');if(!dialog)return;let dismissed=false;try{dismissed=localStorage.getItem('guanxiang-onboarding-v1')==='dismissed'}catch{}if(dismissed)return;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');requestAnimationFrame(()=>$('#onboardingStart')?.focus())}
function dismissOnboarding(){try{localStorage.setItem('guanxiang-onboarding-v1','dismissed')}catch{}const dialog=$('#onboardingDialog');if(dialog?.open)dialog.close();else dialog?.removeAttribute('open')}
function renderClassics(){const grid=$('#classicsGrid'),order=$('#wingOrder');if(!tenWings){order.innerHTML='';grid.innerHTML=`<div class="library-loading">${t('classics.loading')}</div>`;return}const wings=tenWings.wings,names=wings.map(wing=>wing.title),query=($('#wingSearch')?.value||'').trim(),normalizedQuery=normalizeSearchText(query),bookmarks=wingBookmarks(),visible=wings.map((wing,index)=>({wing,index,sections:wing.sections.map((section,sectionIndex)=>({section,sectionIndex})).filter(({section})=>!query||normalizeSearchText(`${section.hexagram||''}${section.text}`).includes(normalizedQuery))})).filter(item=>(!query||item.sections.length)&&(readingMode==='ancient'||query||item.index===selectedWing));order.innerHTML=names.map((name,index)=>`<button type="button" class="wing-order-item ${index===selectedWing?'active':''}" data-wing="${index}"><span>${String(index+1).padStart(2,'0')}</span>${bookmarks.includes(wings[index].id)?'◆ ':''}${name}</button>`).join('');grid.className=`classics-grid ${readingMode}`;grid.innerHTML=visible.map(({wing,index,sections})=>`<article class="classic-card" id="wing-${index}"><div class="classic-card-head"><div><h3>${names[index]}</h3><span class="classic-subtitle">${canonicalClassicSummaries[index]||t('classics.fallbackSummary')}</span></div><span>${t('classics.wing',{n:String(index+1).padStart(2,'0')})}</span></div><p class="classic-quote">${canonicalClassicQuotes[index]||t('classics.fallbackQuote')}</p><div class="classic-readings">${sections.map(({section,sectionIndex})=>`<div class="classic-reading" id="wing-${index}-section-${sectionIndex}"><span>${String(section.number||sectionIndex+1).padStart(2,'0')}</span><p>${section.hexagram?`<button class="reading-ref" data-hex-name="${section.hexagram}">${section.hexagram}</button> `:''}${textHtml(section.text||'')}</p><button type="button" class="section-link" data-section-ref="${index}/${sectionIndex}" aria-label="${t('classics.copySection',{title:names[index],n:section.number||sectionIndex+1})}" title="复制本段链接">§</button></div>`).join('')}</div></article>`).join('')||'<div class="library-loading">十翼原文中没有找到这个词。</div>';$$('.wing-order-item').forEach(button=>button.addEventListener('click',()=>{selectedWing=+button.dataset.wing;selectedClassicSection=null;nav('classics');renderClassics();if(readingMode==='ancient')requestAnimationFrame(()=>document.querySelector(`#wing-${selectedWing}`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}))}));$$('.reading-ref').forEach(button=>button.addEventListener('click',()=>{const index=hexagrams.findIndex(hexagram=>hexagram[0]===button.dataset.hexName);if(index<0)return;selectedHex=index;nav('hexagrams');renderHexList();renderHexDetail()}));$$('.section-link').forEach(button=>button.addEventListener('click',async()=>{const [wing,section]=button.dataset.sectionRef.split('/').map(Number),url=new URL(`#classics/${wing+1}/${section+1}`,location.href).href;try{await navigator.clipboard.writeText(url);showNotice(t('classics.linkCopied'))}catch{location.hash=`#classics/${wing+1}/${section+1}`;showNotice(t('classics.linkLocated'))}}));$$('[data-reading-mode]').forEach(button=>button.classList.toggle('active',button.dataset.readingMode===readingMode));$('#bookmarkWing').textContent=bookmarks.includes(wings[selectedWing].id)?t('classics.bookmarked'):t('classics.bookmark');$('#wingProgress').textContent=query?`${t('classics.found',{count:visible.reduce((sum,item)=>sum+item.sections.length,0)})}`:`${t('classics.progress',{current:selectedWing+1,count:wings[selectedWing].sections.length})}`;if(tenWings.edition)$('#editionNote').textContent=` · ${t('classics.edition',{edition:tenWings.edition,source:tenWings.source||'来源见数据说明'})}`;if(selectedClassicSection!==null)requestAnimationFrame(()=>document.querySelector(`#wing-${selectedWing}-section-${selectedClassicSection}`)?.scrollIntoView({behavior:'smooth',block:'center',inline:'center'}))}
function showNotice(message,action){const notice=$('#appNotice');if(!notice)return;notice.replaceChildren();const text=document.createElement('span');text.textContent=message;notice.appendChild(text);if(action?.label&&typeof action.onClick==='function'){const button=document.createElement('button');button.type='button';button.className='text-button';button.textContent=action.label;button.addEventListener('click',()=>{button.disabled=true;action.onClick()},{once:true});notice.appendChild(button)}notice.classList.remove('hidden')}
function lunarDayName(day){const digits=['','一','二','三','四','五','六','七','八','九'];if(day===10)return '初十';if(day<10)return `初${digits[day]}`;if(day<20)return `十${digits[day-10]}`;if(day===20)return '二十';if(day<30)return `廿${digits[day-20]}`;return '三十'}
function renderCalendarMeta(){const target=$('#calendarMeta');if(!target)return;const today=new Date(),language=getLanguage();try{if(language==='en'){const solar=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',weekday:'short'}).format(today),lunar=new Intl.DateTimeFormat('en-US-u-ca-chinese',{year:'numeric',month:'long',day:'numeric'}).format(today);target.textContent=`${solar} · Chinese calendar ${lunar}`;return}const solar=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'short'}).format(today),parts=new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{year:'numeric',month:'long',day:'numeric'}).formatToParts(today),part=type=>parts.find(item=>item.type===type)?.value||'',lunar=`${part('yearName')}年${part('month')}${lunarDayName(Number(part('day')))}`;target.textContent=`${solar} · 农历${lunar}`}catch{target.textContent=new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(today)}}
function applyTheme(theme,persist=false){const dark=theme==='dark';document.body.classList.toggle('dark-mode',dark);const button=$('#themeToggle');if(button){button.setAttribute('aria-pressed',String(dark));button.title=dark?'切换为浅色阅读':'切换为深色阅读'}if(persist)try{localStorage.setItem('guanxiang-theme',theme)}catch(error){console.warn('主题未能保存',error)}}
function initTheme(){let theme='';try{theme=localStorage.getItem('guanxiang-theme')||''}catch{}if(!['light','dark'].includes(theme))theme=globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light';applyTheme(theme)}
async function registerServiceWorker(){if(!('serviceWorker' in navigator)||location.protocol==='file:')return;try{const registration=await navigator.serviceWorker.register('./service-worker.js');const announce=worker=>{if(!worker)return;const activate=createServiceWorkerActivator({container:navigator.serviceWorker,reload:()=>location.reload()});showNotice('观象已有更新，可立即启用。',{label:'立即更新',onClick:()=>activate(worker)})};if(registration.waiting)announce(registration.waiting);registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)announce(worker)})})}catch(error){console.warn('离线缓存未能注册',error)}}
async function loadTenWings(){try{const [wingsResponse,textsResponse,principlesResponse,principlesEnResponse,relationsResponse]=await Promise.all([fetch('ten-wings.json'),fetch('hexagram-texts.json'),fetch('principles.json'),fetch('principles-en.json'),fetch('relations.json')]);if(!wingsResponse.ok||!textsResponse.ok||!principlesResponse.ok||!principlesEnResponse.ok||!relationsResponse.ok)throw new Error('library response failed');[tenWings,hexagramTexts,principleLibrary,principleLibraryEn,relationsLibrary]=await Promise.all([wingsResponse.json(),textsResponse.json(),principlesResponse.json(),principlesEnResponse.json(),relationsResponse.json()]);$('#appNotice')?.classList.add('hidden');renderEditionStatus();renderClassics();renderAnnotationPanel($('#classicsGrid'),'classic',String(selectedWing));renderHexList();renderHexDetail();renderPrinciples();renderStudyPath();applyRoute();if(castState.lines.length===6)showResult()}catch(error){showNotice('经典数据未能完整载入，请检查本地服务后刷新页面。当前不会以摘要冒充完整原文。');$('#hexDetail').innerHTML='<div class="library-loading">六十四卦原文载入失败。</div>';$('#classicsGrid').innerHTML='<div class="library-loading">十翼原文载入失败。</div>';$('#principleDetail').innerHTML='<div class="library-loading">易理纲要载入失败。</div>';console.error(error)}}
function renderPrinciples(){const sections=activePrincipleLibrary()?.sections||[],principleNav=$('#principleNav'),detail=$('#principleDetail');if(!principleNav||!detail)return;if(!sections.length){principleNav.innerHTML='';detail.innerHTML=`<div class="library-loading">${t('principles.loading')}</div>`;return}selectedPrinciple=Math.min(selectedPrinciple,sections.length-1);principleNav.innerHTML=sections.map((section,index)=>`<button type="button" class="principle-nav-item ${index===selectedPrinciple?'active':''}" data-principle="${index}"><span>${String(index+1).padStart(2,'0')}</span><b>${textHtml(section.title)}</b><small>${textHtml(section.subtitle)}</small></button>`).join('');const section=sections[selectedPrinciple];detail.innerHTML=`<header><div><span class="panel-kicker">${String(selectedPrinciple+1).padStart(2,'0')} · ${t('principles.kicker')}</span><h2>${textHtml(section.title)}</h2><p>${textHtml(section.subtitle)}</p></div><blockquote>${textHtml(section.quote)}<cite>——${textHtml(section.source)}</cite></blockquote></header><p class="principle-overview">${textHtml(section.overview)}</p><div class="principle-concepts">${section.concepts.map((concept,index)=>`<section><span>${String(index+1).padStart(2,'0')}</span><div><h3>${textHtml(concept.name)}</h3><p>${textHtml(concept.text)}</p></div></section>`).join('')}</div>`;$$('[data-principle]').forEach(button=>button.addEventListener('click',()=>{selectedPrinciple=+button.dataset.principle;nav('principles');renderPrinciples();detail.scrollIntoView({behavior:'smooth',block:'start'})}))}
function lineName(value){if(getLanguage()==='en')return value===6?'Old yin · changing':value===9?'Old yang · changing':value===8?'Young yin':'Young yang';return value===6?'老阴 · 变':value===9?'老阳 · 变':value===8?'少阴':'少阳'}
function renderRecords(){const rec=$('#lineRecords');$('#recordEmpty').classList.toggle('hidden',castState.lines.length>0);rec.innerHTML=castState.lines.map((line,i)=>{const path=line.changes?.length?`<em>${line.changes.map(change=>change.remaining).join(' → ')} ÷ 4</em>`:'';return `<div class="line-record"><strong>${line.value===6?'⚋ ×':line.value===9?'⚊ ○':line.value===8?'⚋':'⚊'}</strong><span>第${i+1}爻 · ${lineName(line.value)}${path}</span><small>${line.value}</small></div>`}).join('')}
function wait(ms){const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const factor=reduced?.01:castState.mode==='quick'&&castState.working?.18:1;return new Promise(resolve=>setTimeout(resolve,Math.max(1,ms*factor)))}
function setProcedure(hint,result,active){$('#stageHint').textContent=hint;$('#stageResult').textContent=result||'';$('.procedure-symbol').textContent=active;$('#leftPile').classList.toggle('active',active==='左');$('#rightPile').classList.toggle('active',active==='右')}
function stalkBox(id){return $(`#${id} .stalks`)}
function paintStalks(id,count,kind=''){const box=stalkBox(id);if(!box)return;box.innerHTML='';for(let i=0;i<count;i++){const stalk=document.createElement('span');stalk.className=`stalk ${kind}`;stalk.style.setProperty('--i',i);stalk.style.setProperty('--h',`${48+(i*17+count*3)%22}px`);stalk.style.setProperty('--lean',`${(i*11+count)%9-4}deg`);stalk.style.setProperty('--tone',i%5);box.appendChild(stalk)}}
function moveStalks(fromId,toId,count,kind=''){const from=stalkBox(fromId),to=stalkBox(toId);if(!from||!to)return;const moving=[...from.children].slice(-count);moving.forEach(stalk=>{stalk.className=`stalk ${kind}`;stalk.style.setProperty('--i',to.children.length);to.appendChild(stalk)})}
function markOperation(step){const board=$('#stalkBoard');board.className=`stalk-board ${step?`step-${step}`:''}`;const order=['split','hang','count','return'];$$('#operationRail span').forEach(item=>{const current=item.dataset.operation;item.classList.toggle('active',current===step);item.classList.toggle('done',order.indexOf(current)>=0&&order.indexOf(current)<order.indexOf(step))});if(!step)hideCountingBoard();renderRitualProgress();renderChangeLedger();if(castState.lines.length>=6)setDivinationPhase('result',false)}
function setTotal(value,label='策'){const total=$('#stalkTotal strong');if(!total)return;total.textContent=value;$('#stalkTotal small').textContent=label;total.classList.remove('bump');void total.offsetWidth;total.classList.add('bump')}
function ensureDivinationPhases(){if($('#divinationPhases'))return;const phases=document.createElement('nav');phases.id='divinationPhases';phases.className='divination-phases';phases.setAttribute('aria-label','大衍筮法阶段');phases.innerHTML='<button type="button" data-cast-phase="prepare"><span>壹</span><b>正问与准备</b><small>定其所问</small></button><button type="button" data-cast-phase="cast"><span>贰</span><b>演蓍成卦</b><small>十八变</small></button><button type="button" data-cast-phase="result"><span>叁</span><b>观卦研读</b><small>本卦与之卦</small></button>';$('.divination-intro').after(phases)}
function setDivinationPhase(requested,scroll=true,updateRoute=true){const view=$('#view-divination');if(!view)return;let phase=['prepare','cast','result'].includes(requested)?requested:'prepare';if(phase==='cast'&&!castState.confirmed)phase='prepare';if(phase==='result'&&castState.lines.length<6)phase=castState.confirmed?'cast':'prepare';view.classList.remove('phase-prepare','phase-cast','phase-result');view.classList.add(`phase-${phase}`);view.dataset.phase=phase;$$('[data-cast-phase]').forEach(button=>{const name=button.dataset.castPhase;button.classList.toggle('active',name===phase);button.disabled=(name==='cast'&&!castState.confirmed)||(name==='result'&&castState.lines.length<6);button.setAttribute('aria-current',name===phase?'step':'false')});if(updateRoute&&currentView==='divination'&&location.hash!==routeForView('divination'))history.pushState(null,'',routeForView('divination'));if(scroll)window.scrollTo({top:0,behavior:'smooth'})}
function ensureRitualEnhancements(){if($('#ritualProgress'))return;const progress=document.createElement('div');progress.id='ritualProgress';progress.className='ritual-progress';progress.setAttribute('aria-live','polite');$('#operationRail').after(progress);const counting=document.createElement('div');counting.id='countingBoard';counting.className='counting-board hidden';counting.innerHTML='<section class="count-side"><header><span>天 · 左</span><strong id="leftGroupCount">—</strong></header><div class="quartet-track" id="leftGroups"></div><div class="remainder-row"><span>余</span><div id="leftRemainder"></div></div></section><div class="count-formula" id="countFormula">揲之以四</div><section class="count-side"><header><span>地 · 右</span><strong id="rightGroupCount">—</strong></header><div class="quartet-track" id="rightGroups"></div><div class="remainder-row"><span>余</span><div id="rightRemainder"></div></div></section>';$('#stalkBoard').after(counting);const ledger=document.createElement('div');ledger.id='changeLedger';ledger.className='change-ledger';ledger.setAttribute('aria-label','本爻三变记录');ledger.innerHTML='<div class="ledger-label">本爻三变</div><div class="ledger-slot" data-ledger="0"><b>一变</b><span>待行</span></div><div class="ledger-slot" data-ledger="1"><b>二变</b><span>待行</span></div><div class="ledger-slot" data-ledger="2"><b>三变</b><span>待行</span></div>';counting.after(ledger);const audit=document.createElement('details');audit.id='methodAudit';audit.className='method-audit';audit.innerHTML='<summary>展开本爻策数复核</summary><div class="method-audit-intro">每一行都来自本次实际演算记录，不从展示文字反推。</div><div id="methodAuditRows"></div>';ledger.after(audit)}
function renderMethodAudit(line=castState.lines.at(-1)){const rows=$('#methodAuditRows'),audit=$('#methodAudit');if(!rows||!audit)return;const changes=line?.changes||castState.ritual?.history||[];if(!changes.length){audit.classList.add('hidden');rows.innerHTML='';return}audit.classList.remove('hidden');rows.innerHTML=changes.map((change,index)=>`<div class="method-audit-row"><b>第${index+1}变 · ${change.before} − ${change.removed} = ${change.remaining}</b><span>分二：左 ${change.left}，右 ${change.right}</span><span>挂一后右余 ${change.rightAfter} · 左余 ${change.leftR} · 右余 ${change.rightR}</span><small>挂一 1 + 左余 ${change.leftR} + 右余 ${change.rightR} = ${change.removed} 策</small></div>`).join('');const final=changes.at(-1)?.remaining;if(final)rows.insertAdjacentHTML('beforeend',`<div class="method-audit-final"><b>得爻：${final} ÷ 4 = ${final/4}</b><span>${lineName(final/4)}</span></div>`)}
function renderRitualProgress(){const progress=$('#ritualProgress');if(!progress)return;progress.classList.toggle('hidden',!castState.confirmed);progress.innerHTML='';const completed=castState.lines.length,ritual=castState.ritual;for(let line=0;line<6;line++){const group=document.createElement('div');group.className='progress-line';group.setAttribute('aria-label',`第${line+1}爻`);for(let change=0;change<3;change++){const dot=document.createElement('i'),done=line<completed||(line===completed&&ritual&&change<ritual.history.length),active=line===completed&&ritual&&change===ritual.changeNumber-1;dot.className=`${done?'done ':''}${active?'active':''}`.trim();group.appendChild(dot)}progress.appendChild(group)}const label=document.createElement('span');label.textContent=ritual?`第 ${ritual.lineNumber} 爻 · 第 ${ritual.changeNumber} 变 / 共十八变`:completed===6?'十八变已毕':`已成 ${completed} 爻`;progress.appendChild(label)}
function renderChangeLedger(ritual=castState.ritual,draft=null){const ledger=$('#changeLedger');if(!ledger)return;ledger.classList.toggle('hidden',!castState.prepared);const history=ritual?.history||castState.lines.at(-1)?.changes||[],currentIndex=ritual?ritual.changeNumber-1:-1;$$('#changeLedger .ledger-slot').forEach((slot,index)=>{const item=history[index]||(draft&&index===currentIndex?draft:null);slot.classList.toggle('done',Boolean(history[index]));slot.classList.toggle('current',Boolean(draft&&index===currentIndex&&!history[index]));slot.querySelector('span').textContent=item?`${item.before} − ${item.removed} = ${item.remaining}`:index===currentIndex?'进行中':'待行'})}
function paintRemainder(id,count){const box=$(`#${id}`);box.innerHTML='';for(let i=0;i<count;i++){const stalk=document.createElement('i');stalk.style.setProperty('--r',i);box.appendChild(stalk)}}
function renderCountingBoard(change,animate=true){const board=$('#countingBoard');if(!board)return;const sides=[{groups:'leftGroups',count:'leftGroupCount',remainder:'leftRemainder',total:change.left,rest:change.leftR},{groups:'rightGroups',count:'rightGroupCount',remainder:'rightRemainder',total:change.rightAfter,rest:change.rightR}];let sequence=0;sides.forEach(side=>{const track=$(`#${side.groups}`),groupCount=(side.total-side.rest)/4;track.innerHTML='';for(let group=0;group<groupCount;group++){const quartet=document.createElement('span');quartet.className='quartet';quartet.style.setProperty('--g',sequence++);for(let stalk=0;stalk<4;stalk++)quartet.appendChild(document.createElement('i'));track.appendChild(quartet)}$(`#${side.count}`).textContent=`${groupCount} 组 × 4`;paintRemainder(side.remainder,side.rest)});$('#countFormula').innerHTML=`<small>归奇</small><strong>挂一 1 ＋ 左余 ${change.leftR} ＋ 右余 ${change.rightR}</strong><b>＝ ${change.removed} 策</b>`;board.classList.remove('hidden','returning');board.classList.toggle('static',!animate);$('#stalkBoard').classList.add('counting-muted')}
function hideCountingBoard(){const board=$('#countingBoard');if(board)board.classList.add('hidden');$('#stalkBoard')?.classList.remove('counting-muted')}
function prepareSplitControl(){const ritual=castState.ritual,control=$('#splitControl'),chooser=$('#splitChooser');if(!ritual||ritual.stepIndex!==0){control.classList.add('hidden');return}const selectionBelongsHere=ritual.splitForChange===ritual.changeNumber&&ritual.splitForStalks===ritual.stalks&&Number.isFinite(ritual.proposedLeft);if(!selectionBelongsHere){ritual.splitReady=false;ritual.proposedLeft=null;ritual.splitForChange=null;ritual.splitForStalks=null}control.classList.remove('hidden');chooser.classList.remove('sensing');chooser.classList.toggle('selected',Boolean(ritual.splitReady));previewSplit();updateCastButton()}
function previewSplit(){const ritual=castState.ritual,chooser=$('#splitChooser');if(!ritual||ritual.stepIndex!==0)return;chooser.removeAttribute('aria-valuenow');chooser.removeAttribute('aria-valuemin');chooser.removeAttribute('aria-valuemax');if(!ritual.splitReady){$('#splitPreview').textContent='尚未分开';chooser.classList.remove('selected');chooser.setAttribute('aria-label',`按住蓍草束，凭感觉松开，为第${ritual.changeNumber}变完成分界`);return}chooser.classList.add('selected');chooser.setAttribute('aria-label','分界已定，左右策数将在执行分二后揭示；可以再次按住重分');$('#splitPreview').textContent='分界已定'}
const splitFeeling={active:false,pointerId:null,startedAt:0,startX:0,lastX:0,movement:0,pressure:0,samples:0};
function feelHash(values){let hash=2166136261;for(const char of values.join('|')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
function feltSplitCount(stalks,feel){const samples=new Uint32Array(4);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(samples);else for(let i=0;i<samples.length;i++)samples[i]=Math.floor(Math.random()*4294967296);const userEntropy=feelHash([feel.elapsed.toFixed(3),feel.movement.toFixed(3),feel.lastX.toFixed(3),feel.pressure.toFixed(5),performance.timeOrigin]);const average=[...samples].reduce((sum,value,index)=>sum+((value^(Math.imul(userEntropy+index*2654435761,2246822519)>>>0))>>>0)/4294967296,0)/samples.length;const ratio=.28+average*.44;return Math.max(1,Math.min(stalks-2,Math.round(stalks*ratio)))}
function beginSplitFeeling(event){const ritual=castState.ritual,chooser=$('#splitChooser');if(!ritual||ritual.stepIndex!==0||castState.working||splitFeeling.active)return;if(event.type==='keydown'&&![' ','Enter'].includes(event.key))return;if(event.type==='keydown')event.preventDefault();Object.assign(splitFeeling,{active:true,pointerId:event.pointerId??null,startedAt:performance.now(),startX:event.clientX||0,lastX:event.clientX||0,movement:0,pressure:event.pressure||0,samples:1});chooser.classList.remove('selected');chooser.classList.add('sensing');$('#splitPreview').textContent='感受中…';setProcedure(`第${ritual.changeNumber}变 · 分二`,'握住这一束，觉得合适时松开','');if(event.pointerId!==undefined)chooser.setPointerCapture?.(event.pointerId);navigator.vibrate?.(10)}
function trackSplitFeeling(event){if(!splitFeeling.active||event.pointerId!==splitFeeling.pointerId)return;splitFeeling.movement+=Math.abs((event.clientX||0)-splitFeeling.lastX);splitFeeling.lastX=event.clientX||splitFeeling.lastX;splitFeeling.pressure+=(event.pressure||0);splitFeeling.samples++}
function finishSplitFeeling(event){const ritual=castState.ritual,chooser=$('#splitChooser');if(!splitFeeling.active||!ritual||ritual.stepIndex!==0)return;if(event.type==='keyup'&&![' ','Enter'].includes(event.key))return;if(event.pointerId!==undefined&&splitFeeling.pointerId!==null&&event.pointerId!==splitFeeling.pointerId)return;if(event.type==='keyup')event.preventDefault();trackSplitFeeling(event);const feel={elapsed:performance.now()-splitFeeling.startedAt,movement:splitFeeling.movement,lastX:splitFeeling.lastX,pressure:splitFeeling.pressure/Math.max(1,splitFeeling.samples)};splitFeeling.active=false;splitFeeling.pointerId=null;chooser.classList.remove('sensing');ritual.proposedLeft=feltSplitCount(ritual.stalks,feel);ritual.splitReady=true;ritual.splitForChange=ritual.changeNumber;ritual.splitForStalks=ritual.stalks;ritual.feel={elapsed:Math.round(feel.elapsed),movement:Math.round(feel.movement)};previewSplit();setProcedure(`第${ritual.changeNumber}变 · 分二`,'松开时机与细微移动已经入数；左右策数仍藏在束中','');updateCastButton();navigator.vibrate?.([8,35,8]);saveCast()}
function cancelSplitFeeling(){if(!splitFeeling.active)return;splitFeeling.active=false;splitFeeling.pointerId=null;$('#splitChooser').classList.remove('sensing');previewSplit();updateCastButton()}
function newSessionId(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();return `cast-${Date.now()}-${Math.random().toString(36).slice(2,10)}`}
function validChange(change){return change&&[change.before,change.left,change.right,change.rightAfter,change.leftR,change.rightR,change.removed,change.remaining].every(Number.isFinite)&&change.before-change.removed===change.remaining}
function validLine(line){return line&&[6,7,8,9].includes(line.value)&&Array.isArray(line.changes)&&line.changes.length===3&&line.changes.every(validChange)}
function validRitual(ritual,lineCount){if(ritual===null)return true;if(!ritual||ritual.lineNumber!==lineCount+1||ritual.changeNumber<1||ritual.changeNumber>3||ritual.stepIndex<0||ritual.stepIndex>3||!Number.isFinite(ritual.stalks)||!Array.isArray(ritual.history)||!ritual.history.every(validChange))return false;return ritual.change===null||validChange(ritual.change)}
function saveCast(){try{writeJson(localStorage,'guanxiang-cast-v3',{version:3,savedAt:new Date().toISOString(),sessionId:castState.sessionId,question:castState.question,confirmed:castState.confirmed,prepared:castState.prepared,mode:castState.mode,lines:castState.lines,ritual:castState.ritual})}catch(error){console.warn('起卦进度未能保存',error)}}
const HISTORY_KEY='guanxiang-history-v1';
function loadHistory(){const records=normalizeHistoryRecords(readJson(localStorage,HISTORY_KEY,[]));return records.filter(record=>record.lines.every(validLine))}
function persistHistory(records){writeJson(localStorage,HISTORY_KEY,normalizeHistoryRecords(records))}
function journalMeta(){return readJson(localStorage,'guanxiang-journal-meta-v1',{})||{}}
function persistJournalMeta(meta){writeJson(localStorage,'guanxiang-journal-meta-v1',meta)}
function renderBackupReminder(){const target=$('#backupReminder');if(!target)return;const status=backupStatus(loadHistory(),journalMeta());const dismissed=readJson(localStorage,'guanxiang-backup-dismissed-v1',false);if(!status.due||dismissed){target.classList.add('hidden');return}target.classList.remove('hidden');target.innerHTML=`<span>本地已有 ${status.count} 条记录，建议导出一份备份。</span><button type="button" class="text-button" id="dismissBackup">稍后提醒</button>`;$('#dismissBackup').onclick=()=>{writeJson(localStorage,'guanxiang-backup-dismissed-v1',true);target.classList.add('hidden')}}
function saveReadingHistory(originalIndex,changedIndex,moving){if(!castState.sessionId||castState.lines.length!==6||!castState.lines.every(validLine))return;try{const records=loadHistory(),stamp=new Date().toISOString(),record={id:castState.sessionId,completedAt:stamp,createdAt:stamp,updatedAt:stamp,question:castState.question,lines:castState.lines,originalIndex,changedIndex,moving,mode:castState.mode,tags:[],reviewState:'未开始'};const existing=records.findIndex(item=>item.id===record.id);if(existing>=0)records[existing]={...records[existing],...record,note:records[existing].note||'',createdAt:records[existing].createdAt||record.createdAt};else records.unshift({...record,note:''});persistHistory(records);renderBackupReminder();if(currentView==='history')renderHistory()}catch(error){console.warn('占问记录未能保存',error)}}
function updateHistoryNote(id,note){const records=loadHistory(),record=records.find(item=>item.id===id);if(!record)return false;record.note=String(note||'').trim().slice(0,2000);persistHistory(records);return true}
function renderHistory(){
  const list=$('#historyList'),detail=$('#historyDetail'),indexPage=$('#historyIndexPage'),recordPage=$('#historyRecordPage');
  if(!list||!detail||!indexPage||!recordPage)return;
  const records=loadHistory(),selected=historySelectedId?records.find(record=>record.id===historySelectedId):null;
  if(historySelectedId&&!selected){
    historySelectedId='';
    if(currentView==='history')history.replaceState(null,'','#history');
  }
  if(selected){
    indexPage.hidden=true;
    recordPage.hidden=false;
    renderHistoryDetail(selected);
    return;
  }
  indexPage.hidden=false;
  recordPage.hidden=true;
  detail.replaceChildren();
  $('#historyCount').textContent=records.length;
  const query=normalizeSearchText(historyQuery),visible=query?records.filter(record=>normalizeSearchText(`${record.question} ${record.note||''} ${hexagrams[record.originalIndex]?.[2]||''} ${hexagrams[record.changedIndex]?.[2]||''}`).includes(query)):records;
  if(!records.length){list.innerHTML=`<div class="history-empty"><span>☷</span><b>${t('history.none')}</b><p>${t('history.emptyDescription')}</p></div>`;return}
  if(!visible.length){list.innerHTML=`<div class="history-empty"><b>${t('history.noMatch')}</b><p>${t('history.noMatchDescription')}</p></div>`;return}
  const english=getLanguage()==='en',dateLocale=english?'en-US':'zh-CN';
  list.innerHTML=visible.map(record=>{const original=hexagrams[record.originalIndex],changed=hexagrams[record.changedIndex],date=new Date(record.completedAt),dateText=Number.isNaN(date.getTime())?t('history.timeMissing'):date.toLocaleString(dateLocale,{year:'numeric',month:english?'short':'long',day:'numeric',hour:'2-digit',minute:'2-digit'}),name=english?`${displayHexagramName(record.originalIndex,'en',original?.[0])} → ${displayHexagramName(record.changedIndex,'en',changed?.[0])}`:`${original?.[2]||'本卦'}之${changed?.[2]||'变卦'}`;return `<div class="history-item" data-history-id="${attributeHtml(record.id)}"><button type="button" class="history-item-open" aria-label="${attributeHtml(record.question)}"><span class="history-glyph">${original?.[1]||'—'}<i>→</i>${changed?.[1]||'—'}</span><span class="history-item-copy"><b data-user-content>${textHtml(record.question)}</b><small>${textHtml(name)}${record.note?` · ${t('history.hasNote')}`:''}</small></span><time>${textHtml(dateText)}</time><span class="history-item-arrow" aria-hidden="true">→</span></button><button type="button" class="history-item-delete" data-history-delete="${attributeHtml(record.id)}" aria-label="${attributeHtml(t('history.delete'))}" title="${attributeHtml(t('history.delete'))}">×</button></div>`}).join('');
  list.querySelectorAll('.history-item').forEach(item=>item.addEventListener('click',event=>{if(event.target.closest('[data-history-delete]'))return;historySelectedId=item.dataset.historyId;nav('history');renderHistory()}));
  list.querySelectorAll('[data-history-delete]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const id=button.dataset.historyDelete;if(!confirm(t('history.deleteConfirm')))return;persistHistory(loadHistory().filter(item=>item.id!==id));if(historySelectedId===id){historySelectedId='';history.replaceState(null,'','#history')}renderHistory();renderBackupReminder();showNotice(t('history.deleted'))}));
}
function renderHistoryDetail(record){
  const detail=$('#historyDetail');
  if(!detail||!record)return;
  const original=hexagrams[record.originalIndex],changed=hexagrams[record.changedIndex];
  const moving=Array.isArray(record.moving)?record.moving:record.lines.map((line,index)=>line.value===6||line.value===9?index:-1).filter(index=>index>=0);
  const date=new Date(record.completedAt),english=getLanguage()==='en';
  const positions=english?['Line 1','Line 2','Line 3','Line 4','Line 5','Line 6']:['初','二','三','四','五','上'];
  const title=english?`${displayHexagramName(record.originalIndex,'en',original?.[0])} → ${displayHexagramName(record.changedIndex,'en',changed?.[0])}`:`${original?.[2]||'本卦'}之${changed?.[2]||'变卦'}`;
  const movingText=moving.length?t('reading.moving',{lines:moving.map(index=>english?index+1:positions[index]).join(english?', ':'、')}):t('reading.still');
  detail.innerHTML=`<button type="button" class="history-back-button" data-history-back><span aria-hidden="true">←</span>${t('history.back')}</button><header><span class="panel-kicker">${t('history.stored')} · ${record.mode==='quick'?t('history.quick'):t('history.complete')}</span><time>${Number.isNaN(date.getTime())?'':date.toLocaleString(english?'en-US':'zh-CN')}</time></header><section class="history-detail-hero"><div><span class="history-question-label">${t('history.questionLabel')}</span><blockquote data-user-content>${textHtml(record.question)}</blockquote></div><div class="history-result-block"><div class="history-result"><span>${original?.[1]||'—'}</span><i>→</i><span>${changed?.[1]||'—'}</span></div><h1>${title}</h1><p>${movingText}</p></div></section><section class="history-line-section"><div class="history-section-heading"><span>${t('history.linesLabel')}</span><small>${t('history.linesHint')}</small></div><div class="history-lines">${record.lines.map((line,index)=>`<div><b>${positions[index]}</b><span>${line.value===6?'⚋ ×':line.value===9?'⚊ ○':line.value===8?'⚋':'⚊'}</span><small>${lineName(line.value)}</small></div>`).reverse().join('')}</div></section><div class="history-interpretation-anchor"></div><section class="history-note"><label for="historyNote">${t('history.noteLabel')}</label><textarea id="historyNote" rows="5" maxlength="2000" placeholder="${t('history.notePlaceholder')}">${textHtml(record.note||'')}</textarea><small id="historyNoteStatus">${t('history.localOnly')}</small></section><div class="history-detail-actions"><button type="button" class="secondary-button" data-history-hex="${record.originalIndex}">${t('history.openHex')}</button><button type="button" class="primary-button" id="saveHistoryNote">${t('history.saveNote')}</button><button type="button" class="danger-button" id="deleteHistory">${t('history.delete')}</button></div>`;
  detail.querySelector('[data-history-back]')?.addEventListener('click',()=>{historySelectedId='';history.replaceState(null,'','#history');renderHistory();window.scrollTo({top:0,behavior:'smooth'})});
  detail.querySelector('[data-history-hex]')?.addEventListener('click',event=>{selectedHex=Number(event.currentTarget.dataset.historyHex)||0;setMobileDetail('hexagrams',true);nav('hexagrams');renderHexList();renderHexDetail()});
  $('#saveHistoryNote')?.addEventListener('click',()=>{if(updateHistoryNote(record.id,$('#historyNote').value))$('#historyNoteStatus').textContent=t('common.saved')});
  $('#deleteHistory')?.addEventListener('click',()=>{if(!confirm(t('history.deleteConfirm')))return;persistHistory(loadHistory().filter(item=>item.id!==record.id));historySelectedId='';history.replaceState(null,'','#history');renderHistory();renderBackupReminder();showNotice(t('history.deleted'))});
  const reading=createReadingContext({question:record.question,originalIndex:record.originalIndex,changedIndex:record.changedIndex,moving}).local;
  const cached=record.aiReading&&(!record.aiReading.language||record.aiReading.language===getLanguage())?record.aiReading:null;
  renderHistoryInterpretation(detail,reading,cached);
  detail.querySelector('[data-history-ai]')?.addEventListener('click',()=>generateHistoryAiReading(record.id));
}
function exportHistory(){const exportedAt=new Date().toISOString(),payload={type:'guanxiang-history',...migrateJournalPayload({records:loadHistory(),exportedAt})},blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`观象占问记录-${exportedAt.slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);persistJournalMeta({...journalMeta(),lastExportAt:exportedAt});try{localStorage.removeItem('guanxiang-backup-dismissed-v1')}catch{}renderBackupReminder()}
	async function importHistoryFile(file){if(!file)return;try{const parsed=JSON.parse(await file.text()),raw=Array.isArray(parsed)?parsed:parsed?.records;if(!Array.isArray(raw))throw new Error('invalid format');const incoming=migrateJournalPayload(parsed).records;if(incoming.length!==raw.length||!incoming.every(record=>record.lines.every(validLine)))throw new Error('invalid records');const local=loadHistory(),localById=new Map(local.map(record=>[record.id,record])),added=incoming.filter(record=>!localById.has(record.id)).length,updated=incoming.filter(record=>localById.has(record.id)&&new Date(record.updatedAt)>new Date(localById.get(record.id).updatedAt)).length,conflicts=incoming.filter(record=>localById.has(record.id)&&new Date(record.updatedAt).getTime()===new Date(localById.get(record.id).updatedAt).getTime()&&JSON.stringify(record)!==JSON.stringify(localById.get(record.id))).length;pendingImport={records:mergeJournalRecords(local,incoming),firstId:incoming[0]?.id||'',count:incoming.length};$('#importSummary').textContent=t('history.importSummary',{count:incoming.length,added,updated,conflicts});const dialog=$('#importDialog');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}catch(error){pendingImport=null;showNotice(t('history.importInvalid'));console.warn(error)}finally{$('#historyFile').value=''}}
	function confirmHistoryImport(){if(!pendingImport)return;persistHistory(pendingImport.records);historySelectedId=pendingImport.firstId;const count=pendingImport.count;pendingImport=null;nav('history');renderHistory();renderBackupReminder();showNotice(t('history.imported',{count}))}
function setCastMode(mode,force=false){if((castState.confirmed&&!force)||!['complete','quick'].includes(mode))return;castState.mode=mode;$$('[data-cast-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.castMode===mode);button.setAttribute('aria-pressed',String(button.dataset.castMode===mode));button.disabled=castState.confirmed});$('#guideTime').textContent=mode==='quick'?'快速演蓍 · 约 1–2 分钟':'完整仪式 · 约 8–12 分钟';$('#view-divination').classList.toggle('quick-mode',mode==='quick');if(!castState.confirmed)setProcedure('问题确认后，占筮仪式将在这里开始',mode==='quick'?'每次点击演示一爻的完整三变':'每一营由你亲手推进','')}
function updateCastButton(){const button=$('#castButton'),resetButton=$('#resetButton'),nextButton=$('#nextReadingButton'),ritual=castState.ritual,nextTranslation=t('divination.next'),nextLabel=nextTranslation==='divination.next'?(getLanguage()==='en'?'Start next reading':'开始下一卦'):nextTranslation;if(resetButton)resetButton.textContent=castState.lines.length>=6?nextLabel:t('divination.reset');if(nextButton)nextButton.textContent=nextLabel;if(!castState.confirmed){button.innerHTML='请先确认问题';button.disabled=true;return}if(!castState.prepared){button.innerHTML='亲手虚一策 · 象太极 <span>→</span>';button.disabled=false;return}if(castState.lines.length>=6){button.innerHTML='六爻已成';button.disabled=true;return}button.disabled=castState.working;if(castState.mode==='quick'&&!ritual){button.innerHTML=`演蓍成第${castState.lines.length+1}爻 <span>→</span>`;return}if(!ritual){button.innerHTML=`准备第${castState.lines.length+1}爻 <span>→</span>`;return}if(ritual.stepIndex===0&&!ritual.splitReady){button.innerHTML=`请先按住蓍束再松开 · 第${ritual.lineNumber}爻`;button.disabled=true;return}const labels=['分二','挂一','揲四','归奇'];button.innerHTML=`执行${labels[ritual.stepIndex]} · 第${ritual.lineNumber}爻 <span>→</span>`}
function beginRitual(){castState.ritual={lineNumber:castState.lines.length+1,changeNumber:1,stepIndex:0,stalks:49,change:null,history:[]};$('#ritualTitle').textContent=`准备起第${castState.lines.length+1}爻 · 三变十二营`;setTotal(49);paintStalks('leftStalks',49);paintStalks('rightStalks',0);paintStalks('hangStalks',0);paintStalks('discardStalks',0);markOperation('split');setProcedure('第一变 · 按住蓍束，凭感觉松开','分界与策数暂不显露，执行分二时才揭开','');prepareSplitControl();saveCast()}
async function animateCurrentOperation(ritual,operation){
  if(operation==='split')ritual.change=drawYarrowChange(ritual.stalks,ritual.proposedLeft);
  const change=ritual.change;
  if(!change)throw new Error('请先完成分二');
  const leftStrong=$('#leftPile strong'),rightStrong=$('#rightPile strong'),leftMeta=$('#leftPile span'),rightMeta=$('#rightPile span');
  markOperation(operation);
  $('#splitControl').classList.add('hidden');
  if(operation==='split'){
    hideCountingBoard();
    setTotal(ritual.stalks);
    paintStalks('leftStalks',change.left);
    paintStalks('rightStalks',change.right);
    leftStrong.textContent=change.left;
    rightStrong.textContent=change.right;
    leftMeta.textContent='分二 · 天';
    rightMeta.textContent='分二 · 地';
    setProcedure(`第${ritual.changeNumber}变 · 分二`,`${ritual.stalks} 策此时揭开：左 ${change.left}、右 ${change.right}`,'左');
    await wait(1400);
    return;
  }
  if(operation==='hang'){
    hideCountingBoard();
    moveStalks('rightStalks','hangStalks',1,'hanging');
    setTotal(ritual.stalks-1,'待揲');
    rightStrong.textContent=change.rightAfter;
    rightMeta.textContent='挂一后 · 余';
    setProcedure(`第${ritual.changeNumber}变 · 挂一`,`右堆取一策悬于中央：右堆 ${change.right} − 1 = ${change.rightAfter}`,'右');
    await wait(1250);
    return;
  }
  if(operation==='count'){
    renderCountingBoard(change,true);
    setTotal(change.removed,'归奇');
    leftStrong.textContent=change.leftR;
    rightStrong.textContent=change.rightR;
    leftMeta.textContent=`${(change.left-change.leftR)/4}组四策 · 余 ${change.leftR}`;
    rightMeta.textContent=`${(change.rightAfter-change.rightR)/4}组四策 · 余 ${change.rightR}`;
    setProcedure(`第${ritual.changeNumber}变 · 揲四`,`左余 ${change.leftR} + 挂一 1 + 右余 ${change.rightR} = ${change.removed} 策`,'');
    const groups=(change.left-change.leftR+change.rightAfter-change.rightR)/4;
    await wait(Math.min(3200,1100+groups*170));
    return;
  }
  const counting=$('#countingBoard');
  counting?.classList.add('returning');
  await wait(520);
  hideCountingBoard();
  paintStalks('discardStalks',change.removed,'discarded');
  paintStalks('leftStalks',change.remaining);
  paintStalks('rightStalks',0);
  paintStalks('hangStalks',0);
  setTotal(change.remaining);
  leftStrong.textContent=change.remaining;
  rightStrong.textContent='—';
  leftMeta.textContent=`归奇 · 旁置 ${change.removed} 策`;
  rightMeta.textContent='余下合拢';
  renderChangeLedger(ritual,change);
  setProcedure(`第${ritual.changeNumber}变 · 归奇`,`${change.before} − (${change.leftR} + 1 + ${change.rightR}) = ${change.remaining} 策`,'');
  await wait(1200);
}
function finishCastLine(ritual){const value=ritual.stalks/4;castState.lines.push({value,changes:ritual.history});castState.ritual=null;$('#lineCount').textContent=`${castState.lines.length} / 6 爻`;$('#ritualTitle').textContent=castState.lines.length===6?'六爻已成 · 可观本卦与变卦':`第${castState.lines.length}爻已成 · 请继续`;$('#stageResult').textContent=`${ritual.history.map(item=>item.before+'−'+item.removed+'='+item.remaining).join('；')}；${ritual.stalks}÷4=${value} · ${lineName(value)}`;renderRecords();renderMethodAudit(castState.lines.at(-1));if(castState.lines.length===6)showResult()}
function secureRandom(){if(!globalThis.crypto?.getRandomValues)return Math.random();const value=new Uint32Array(1);crypto.getRandomValues(value);return value[0]/4294967296}
async function castQuickLine(){const runId=++castState.runId,ritual={lineNumber:castState.lines.length+1,changeNumber:1,stepIndex:0,stalks:49,change:null,history:[]};castState.ritual=ritual;castState.working=true;$('#castButton').disabled=true;$('.yarrow-stage').classList.add('is-calculating','quick-running');$('#splitControl').classList.add('hidden');try{for(let changeNumber=1;changeNumber<=3;changeNumber++){ritual.changeNumber=changeNumber;ritual.stepIndex=0;ritual.proposedLeft=randomSplitCount(ritual.stalks,secureRandom);for(const operation of ['split','hang','count','return']){ritual.stepIndex=['split','hang','count','return'].indexOf(operation);await animateCurrentOperation(ritual,operation);if(castState.runId!==runId)return}ritual.history.push({...ritual.change});ritual.stalks=ritual.change.remaining;ritual.change=null;renderRitualProgress();renderChangeLedger(ritual)}finishCastLine(ritual);markOperation('');saveCast()}catch(error){if(castState.runId===runId){castState.ritual=null;$('#stageHint').textContent='本爻未完成，请重新点击';console.error(error)}}finally{if(castState.runId===runId){castState.working=false;$('.yarrow-stage').classList.remove('is-calculating','quick-running');updateCastButton();saveCast()}}}
async function castLine(){if(castState.working||!castState.confirmed||castState.lines.length>=6)return;if(!castState.prepared){const runId=++castState.runId;castState.working=true;$('#castButton').disabled=true;$('.yarrow-stage').classList.add('is-calculating');moveStalks('leftStalks','taijiStalks',1,'discarded');setTotal(49);setProcedure('大衍之数五十，其用四十有九','你亲自取出一策不用，象太极；余四十九策入筮','');await wait(1500);if(castState.runId!==runId)return;castState.working=false;castState.prepared=true;$('.yarrow-stage').classList.remove('is-calculating');if(castState.mode==='complete')beginRitual();else{paintStalks('leftStalks',49);$('#ritualTitle').textContent='四十九策在前 · 点击演蓍成初爻';setProcedure('快速演蓍仍守三变十二营','点击一次，依次观看分二、挂一、揲四、归奇','')}updateCastButton();saveCast();return}if(castState.mode==='quick'){await castQuickLine();return}if(!castState.ritual){beginRitual();updateCastButton();return}if(castState.ritual.stepIndex===0&&!castState.ritual.splitReady)return;const ritual=castState.ritual,runId=++castState.runId,operation=['split','hang','count','return'][ritual.stepIndex];castState.working=true;$('#castButton').disabled=true;$('.yarrow-stage').classList.add('is-calculating');try{await animateCurrentOperation(ritual,operation);if(castState.runId!==runId)return;castState.working=false;ritual.stepIndex++;if(operation==='return'){ritual.history.push({...ritual.change});ritual.stalks=ritual.change.remaining;ritual.change=null;if(ritual.changeNumber===3)finishCastLine(ritual);else{ritual.changeNumber++;ritual.stepIndex=0;$('#stageResult').textContent=`第${ritual.changeNumber-1}变完成 · 余 ${ritual.stalks} 策`}}if(castState.ritual){const next=['分二','挂一','揲四','归奇'][castState.ritual.stepIndex];$('#stageHint').textContent=`下一步：第${castState.ritual.changeNumber}变 · ${next}`;markOperation(['split','hang','count','return'][castState.ritual.stepIndex]);prepareSplitControl()}else{markOperation('')}$('.yarrow-stage').classList.remove('is-calculating');updateCastButton();saveCast()}catch(error){if(castState.runId===runId){castState.working=false;$('.yarrow-stage').classList.remove('is-calculating');$('#stageHint').textContent='本步未完成，请重新点击';updateCastButton();console.error(error)}}}
const trigramByLines={'111':'天','110':'泽','101':'火','100':'雷','011':'风','010':'水','001':'山','000':'地'};
function hexIndexForLines(lines,changed=false){const bits=lines.map(line=>{if(changed&&line.value===6)return 1;if(changed&&line.value===9)return 0;return line.value===7||line.value===9?1:0});const lower=trigramByLines[bits.slice(0,3).join('')],upper=trigramByLines[bits.slice(3,6).join('')];return hexagrams.findIndex(hexagram=>hexagram[6]===upper&&hexagram[7]===lower)}
function createReadingContext({question,originalIndex,changedIndex,moving}){
  const original=hexagrams[originalIndex],changed=hexagrams[changedIndex],source=hexagramTexts?.hexagrams?.[originalIndex],changedSource=hexagramTexts?.hexagrams?.[changedIndex],rule=readingRule(moving,originalIndex),originalLines=source?.lines||[],changedLines=changedSource?.lines||[];
  const lineSource=rule.fromChanged?changedLines:originalLines,primaryLines=rule.primary.map(index=>lineSource[index]).filter(Boolean);
  const context={question,originalIndex,changedIndex,original,changed,moving,rule,originalLines,changedLines,primaryLines};
  return {...context,local:getLanguage()==='en'?buildEnglishInterpretation(context):buildLocalInterpretation(context)};
}
function localReadingBodyHtml(reading){
  return `<article class="interpretation-lead"><span>${t('reading.core')}</span><p>${textHtml(reading.summary)}</p></article><article><span>${t('reading.situation')}</span><p>${textHtml(reading.situation)}</p></article><article><span>${t('reading.turningPoint')}</span><p>${textHtml(reading.turningPoint)}</p></article><article><span>${t('reading.trend')}</span><p>${textHtml(reading.trend)}</p></article><article class="interpretation-actions"><span>${t('reading.actions')}</span><ol>${reading.actions.map(action=>`<li>${textHtml(action)}</li>`).join('')}</ol></article><article class="interpretation-cautions"><span>${t('reading.cautions')}</span><p>${reading.cautions.map(textHtml).join('<br>')}</p></article>`;
}
function renderLocalReading(reading){
  $('#localReadingContent').innerHTML=localReadingBodyHtml(reading);
  const labels=reading.evidence.primaryLabels.length?` · ${getLanguage()==='en'?'lines: ':'取 '}${reading.evidence.primaryLabels.map(textHtml).join(getLanguage()==='en'?', ':'、')}`:'';
  $('#localReadingEvidence').innerHTML=`${t('reading.basis')}：${textHtml(reading.evidence.originalName)} → ${textHtml(reading.evidence.changedName)}${labels} · ${textHtml(reading.evidence.ruleText)}`;
}
function aiReadingBodyHtml(text){return (getLanguage()==='en'?splitAiReadingSectionsLocalized(text,'en'):splitAiReadingSections(text)).map(section=>`<article data-ai-section="${section.id}"><span>${textHtml(section.title)}</span><p>${textHtml(section.text)}</p></article>`).join('')}
function renderAiReadingText(text,target=$('#aiReadingContent')){if(target)target.innerHTML=aiReadingBodyHtml(text)}
function renderHistoryInterpretation(detail,reading,cached){
  const anchor=detail.querySelector('.history-interpretation-anchor');if(!anchor)return;
  anchor.replaceChildren();
  const local=document.createElement('section');local.className='interpretation-band local-interpretation history-interpretation';local.innerHTML=`<div class="interpretation-heading"><div><span class="panel-kicker">${t('reading.local')}</span><h3>${t('reading.current')}</h3></div></div><div class="interpretation-sections">${localReadingBodyHtml(reading)}</div>`;anchor.appendChild(local);
  const endpoint=String(globalThis.GUANXIANG_AI_ENDPOINT||'').trim(),ai=document.createElement('section');ai.className='interpretation-band ai-interpretation history-interpretation';ai.innerHTML=`<div class="interpretation-heading"><div><span class="panel-kicker">${t('reading.ai')}</span><h3>${cached?.text?t('reading.aiSaved'):t('reading.ai')}</h3></div><div class="history-ai-heading-actions">${cached?.generatedAt?`<time>${textHtml(new Date(cached.generatedAt).toLocaleString(getLanguage()==='en'?'en-US':'zh-CN'))}</time>`:''}<button type="button" class="primary-button" data-history-ai ${endpoint?'':'disabled'}>${endpoint?(cached?.text?t('reading.regenerate'):t('reading.generate')):t('reading.unconfigured')}</button></div></div><p class="ai-privacy">${t('reading.aiPrivacy')}</p><div class="interpretation-sections ai-reading-content" data-history-ai-content>${cached?.text?aiReadingBodyHtml(cached.text):''}</div><p class="ai-reading-error hidden" data-history-ai-error role="alert"></p>`;anchor.appendChild(ai);
}
function observeHistoryInterpretation(){
  const detail=$('#historyDetail');if(!detail)return;
  const enhance=()=>{if(detail.querySelector('.history-interpretation')||!historySelectedId)return;const record=loadHistory().find(item=>item.id===historySelectedId);if(!record||!detail.querySelector('.history-interpretation-anchor'))return;const moving=Array.isArray(record.moving)?record.moving:record.lines.map((line,index)=>line.value===6||line.value===9?index:-1).filter(index=>index>=0),cached=record.aiReading&&(!record.aiReading.language||record.aiReading.language===getLanguage())?record.aiReading:null;renderHistoryInterpretation(detail,createReadingContext({question:record.question,originalIndex:record.originalIndex,changedIndex:record.changedIndex,moving}).local,cached)};
  new MutationObserver(enhance).observe(detail,{childList:true});enhance();
}
function aiPayload(context){
  const details=(hexagram,source)=>({name:hexagram[2],upper:hexagram[6],lower:hexagram[7],theme:hexagram[5],imageText:hexagram[3],judgment:source?.text||hexagram[4],lines:(source?.lines||[]).map(line=>({label:line.label,text:line.text}))});
  const local=context.local,tenWings=selectTenWingSources({relations:relationsLibrary,originalIndex:context.originalIndex,changedIndex:context.changedIndex,fromChanged:Boolean(context.rule.fromChanged),primaryLines:context.primaryLines});
  const lineSource=context.rule.fromChanged?context.changedLines:context.originalLines;
  const movingLines=context.moving.map(index=>({position:index+1,label:lineSource[index]?.label||'',text:lineSource[index]?.text||''})).filter(line=>line.label&&line.text);
  const original=details(context.original,hexagramTexts?.hexagrams?.[context.originalIndex]),changed=details(context.changed,hexagramTexts?.hexagrams?.[context.changedIndex]);
  const years=[...new Set((String(context.question||'').match(/20\d{2}/g)||[]))];
  const noteLanguage=getLanguage()==='en'?'en':'zh',referenceNotes=[...(AI_REFERENCE_NOTES[noteLanguage][original.name]||[]),...(original.name===changed.name?[]:(AI_REFERENCE_NOTES[noteLanguage][changed.name]||[]))];
  return {version:1,language:getLanguage(),question:context.question,originalIndex:context.originalIndex,changedIndex:context.changedIndex,original,changed,moving:context.moving,movingLines,rule:{text:context.rule.text,fromChanged:Boolean(context.rule.fromChanged),primary:context.rule.primary},primaryLines:context.primaryLines.map(line=>({label:line.label,text:line.text})),tenWings,analysisPlan:{years,detailTarget:years.length>1?'long':'standard',originalLineLabels:original.lines.map(line=>line.label),relatingLineLabels:changed.lines.map(line=>line.label),movingLineLabels:movingLines.map(line=>line.label),sequence:years.length?['核心主线','本卦当前基础','动爻转折','变卦后续背景','逐年条件性落地']:['核心主线','本卦当前基础','动爻转折','变卦后续背景'],referenceNotes},localReading:{summary:local.summary,situation:local.situation,turningPoint:local.turningPoint,trend:local.trend,actions:local.actions,cautions:local.cautions}};
}
function updateHistoryAiReading(id,aiReading){
  const records=loadHistory(),record=records.find(item=>item.id===id);if(!record)return false;
  record.aiReading=aiReading;record.updatedAt=new Date().toISOString();persistHistory(records);return true;
}
async function generateHistoryAiReading(id){
  const detail=$('#historyDetail'),record=loadHistory().find(item=>item.id===id),button=detail?.querySelector('[data-history-ai]'),content=detail?.querySelector('[data-history-ai-content]'),errorBox=detail?.querySelector('[data-history-ai-error]');
  if(!detail||!record||!button||!content||!errorBox||aiReadingAbort)return;
  const endpoint=String(globalThis.GUANXIANG_AI_ENDPOINT||'').trim();if(!endpoint)return;
  const moving=Array.isArray(record.moving)?record.moving:record.lines.map((line,index)=>line.value===6||line.value===9?index:-1).filter(index=>index>=0),context=createReadingContext({question:record.question,originalIndex:record.originalIndex,changedIndex:record.changedIndex,moving});
  aiReadingAbort=new AbortController();button.disabled=true;button.textContent=t('reading.generating');errorBox.textContent='';errorBox.classList.add('hidden');content.replaceChildren();
  try{
    const text=await requestAiReading({endpoint,payload:aiPayload(context),signal:aiReadingAbort.signal,onChunk:(chunk,complete)=>renderAiReadingText(complete,content)}),cached={text,language:getLanguage(),generatedAt:new Date().toISOString(),modelLabel:'Workers AI',version:1};
    updateHistoryAiReading(id,cached);renderHistoryInterpretation(detail,context.local,cached);detail.querySelector('[data-history-ai]')?.addEventListener('click',()=>generateHistoryAiReading(id));
  }catch(error){
    const failure=error instanceof AiReadingError?error:new AiReadingError('SERVICE_ERROR');if(failure.partialText)renderAiReadingText(failure.partialText,content);errorBox.textContent=failure.message;errorBox.classList.remove('hidden');button.disabled=false;button.textContent=t('reading.retry');
  }finally{aiReadingAbort=null}
}
function prepareAiReading(stored){
  const endpoint=String(globalThis.GUANXIANG_AI_ENDPOINT||'').trim(),button=$('#generateAiReading'),error=$('#aiReadingError'),usable=stored&&(!stored.language||stored.language===getLanguage())?stored:null;
  renderAiReadingText(usable?.text||'');error.textContent='';error.classList.add('hidden');button.disabled=!endpoint;button.textContent=endpoint?(usable?t('reading.regenerate'):t('reading.generate')):t('reading.unconfigured');
}
async function generateAiReading(){
  const endpoint=String(globalThis.GUANXIANG_AI_ENDPOINT||'').trim(),button=$('#generateAiReading'),errorBox=$('#aiReadingError');if(!endpoint||!currentReading||aiReadingAbort)return;
  aiReadingAbort=new AbortController();button.disabled=true;button.textContent=t('reading.generating');errorBox.textContent='';errorBox.classList.add('hidden');renderAiReadingText('');
  try{
    const text=await requestAiReading({endpoint,payload:aiPayload(currentReading),signal:aiReadingAbort.signal,onChunk:(chunk,complete)=>renderAiReadingText(complete)});
    const cached={text,language:getLanguage(),generatedAt:new Date().toISOString(),modelLabel:'Workers AI',version:1};updateHistoryAiReading(castState.sessionId,cached);prepareAiReading(cached);
  }catch(error){
    const failure=error instanceof AiReadingError?error:new AiReadingError('SERVICE_ERROR');if(failure.partialText)renderAiReadingText(failure.partialText);errorBox.textContent=failure.message;errorBox.classList.remove('hidden');button.disabled=false;button.textContent=t('reading.retry');
  }finally{aiReadingAbort=null}
}
function showResult(){
  const idx=hexIndexForLines(castState.lines),changedIndex=hexIndexForLines(castState.lines,true);
  if(idx<0||changedIndex<0){console.error('卦象映射失败');return}
  selectedHex=idx;
  const hexagram=hexagrams[idx],changed=hexagrams[changedIndex],moving=castState.lines.map((line,index)=>line.value===6||line.value===9?index:-1).filter(index=>index>=0),rule=readingRule(moving,idx),source=hexagramTexts?.hexagrams?.[idx],changedSource=hexagramTexts?.hexagrams?.[changedIndex];
  currentReading=createReadingContext({question:castState.question,originalIndex:idx,changedIndex,moving});
  const positions=['初','二','三','四','五','上'],originalLines=source?.lines||[],changedFocus=rule.fromChanged?rule.primary.map(index=>changedSource?.lines?.[index]).filter(Boolean):[],principleText=hexagram[3]||'先观其象，再察其时位，最后回到当下可以采取的行动。';
  const lineRows=castState.lines.map((line,index)=>`<div class="result-line-row"><b>${positions[index]}爻</b><span>${line.value===6?'⚋ ×':line.value===9?'⚊ ○':line.value===8?'⚋':'⚊'}</span><small>${lineName(line.value)}${line.changes?.length?` · ${line.changes.map(change=>change.remaining).join(' → ')} ÷ 4`:''}</small></div>`).join('');
  $('#resultCard').classList.remove('hidden');$('#resultPrimary').textContent=hexagram[1];$('#resultChanged').textContent=changed[1];$('#resultName').textContent=`${displayHexagramName(idx,getLanguage(),hexagram[2])} → ${displayHexagramName(changedIndex,getLanguage(),changed[2])}`;$('#resultSummary').textContent=moving.length?t('reading.moving',{lines:moving.map(index=>positions[index]).join(getLanguage()==='en'?', ':'、')}):t('reading.still');$('#stageHint').textContent=t('reading.focus');$('#readingPanel').classList.remove('hidden');$('#readingTitle').textContent=`${displayHexagramName(idx,getLanguage(),hexagram[2])} → ${displayHexagramName(changedIndex,getLanguage(),changed[2])}`;$('#readingQuestion').textContent=t('reading.question',{question:castState.question});$('#readingFocus').textContent=t('reading.focus');
  renderLocalReading(currentReading.local);
  $('#readingColumns').innerHTML=`<article class="result-layer" id="resultOriginal"><div class="result-layer-kicker">一 · 经文原文</div><h3>${hexagram[1]} ${hexagram[2]} · 本卦</h3><p class="result-source-note">底本原文 · 卦辞</p><p class="wing-original">${textHtml(source?.text||hexagram[4])}</p><div class="reading-lines">${originalLines.map(line=>`<div class="reading-line"><b>${textHtml(line.label)}</b>${textHtml(line.text)}</div>`).join('')}</div>${changedIndex!==idx?`<h4>之卦 · ${changed[1]} ${changed[2]}</h4><p class="result-source-note">底本原文 · 变卦卦辞</p><p class="wing-original">${textHtml(changedSource?.text||changed[4])}</p>`:''}</article><article class="result-layer" id="resultRule"><div class="result-layer-kicker">二 · 变爻规则</div><h3>本次取法</h3><p>${textHtml(rule.text)}</p><p class="result-source-note">通行变爻取法说明 · 后世研读规则，不是《周易》经文原句。</p>${changedFocus.length?`<div class="reading-lines">${changedFocus.map(line=>`<div class="reading-line"><b>${textHtml(line.label)}</b>${textHtml(line.text)}</div>`).join('')}</div>`:''}</article><article class="result-layer" id="resultStructure"><div class="result-layer-kicker">三 · 卦象结构</div><h3>${hexagram[2]} → ${changed[2]}</h3><div class="structure-pair"><div><span>本卦</span><strong>${hexagram[1]}</strong><small>${hexagram[6]}上 · ${hexagram[7]}下</small></div><b>→</b><div><span>变卦</span><strong>${changed[1]}</strong><small>${changed[6]}上 · ${changed[7]}下</small></div></div><div class="result-line-grid">${lineRows}</div></article><article class="result-layer" id="resultPrinciple"><div class="result-layer-kicker">四 · 易理提示</div><h3>从象与时位开始观察</h3><p>${textHtml(principleText)}</p><p class="result-source-note">研读提示 · 由卦象资料生成，供自我反思，不是经文原句。</p></article>`;
  const originalRelations=relationCards(idx,6),changedRelations=changedIndex===idx?'':relationCards(changedIndex,4);
  $('#readingRelated').innerHTML=`<div class="reading-relation-group"><h4>本卦 · ${hexagram[2]}</h4><div class="relation-list">${originalRelations||'<p class="library-loading">关联索引正在载入。</p>'}</div></div>${changedRelations?`<div class="reading-relation-group"><h4>变卦 · ${changed[2]}</h4><div class="relation-list">${changedRelations}</div></div>`:''}`;
  bindRelationLinks($('#readingRelated'));
  saveReadingHistory(idx,changedIndex,moving);
  const stored=loadHistory().find(record=>record.id===castState.sessionId);
  prepareAiReading(stored?.aiReading);
  $('#readingNote').value=stored?.note||'';
  $('#readingNoteStatus').textContent=stored?.note?'已载入此前札记':'仅保存在此浏览器';
  saveCast();
}
function saveCurrentReadingNote(){if(!castState.sessionId||castState.lines.length!==6)return;if(updateHistoryNote(castState.sessionId,$('#readingNote').value)){$('#readingNoteStatus').textContent='已保存';if(currentView==='history')renderHistory()}}
function validateQuestion(){const value=$('#questionInput').value.trim(),feedback=$('#questionFeedback'),button=$('#confirmQuestion');let message='',valid=true;if(value.length<8){valid=false;message='问题还不够具体，请写明情境和你想辨明的方向。'}else if(value.length>100){valid=false;message='请收束到一件事，控制在 100 字以内。'}else if((value.match(/[？?]/g)||[]).length>1||/[、，,].*(还是|或者)/.test(value)){valid=false;message='这里可能包含多个问题，请一次只保留一件事。'}else if(/^(吉不吉|能不能|会不会|好不好)[？?]?$/.test(value)){valid=false;message='试着改问“面对这件事，我应当注意什么？”'}else{message='问题清楚。确认后将锁定，直到本次仪式结束。'}feedback.textContent=message;feedback.className=valid?'valid':'invalid';button.disabled=!valid;return valid}
function requestDivinationConfirmation(){if(!validateQuestion())return;const dialog=$('#divinationConfirmDialog');if(typeof dialog?.showModal==='function'){dialog.showModal();requestAnimationFrame(()=>$('#confirmDivination')?.focus());return}if(confirm('占筮当慎。请暂放杂念，静下心来，以平和、诚敬之心专注于此次所问。卦象与解读仅供经典研读和自我反思，不替代现实判断或专业建议。确认开始吗？')){confirmQuestion();if(castState.confirmed)setDivinationPhase('cast')}}
function confirmQuestion(){if(!validateQuestion())return;castState.question=$('#questionInput').value.trim();castState.sessionId=newSessionId();castState.confirmed=true;castState.prepared=false;$('#questionInput').readOnly=true;$('#consultationGuide').classList.add('confirmed');$$('[data-cast-mode]').forEach(button=>button.disabled=true);$('#confirmQuestion').disabled=true;$('#confirmQuestion').textContent='问题已确认';$('#lockedQuestion').textContent=`所问：${castState.question}`;$('#lockedQuestion').classList.remove('hidden');$('#ritualTitle').textContent='五十策已备 · 请亲手虚一';paintStalks('leftStalks',50);paintStalks('rightStalks',0);paintStalks('taijiStalks',0);paintStalks('hangStalks',0);paintStalks('discardStalks',0);setTotal(50);setProcedure('先从五十策中取出一策不用','此一策象太极，不再参与其后的十八变','');updateCastButton();document.querySelector('.ritual-panel').scrollIntoView({behavior:'smooth',block:'start'});saveCast()}
function restoreCast(){
  let saved=null,source='';
  for(const key of ['guanxiang-cast-v3','guanxiang-cast-v2','guanxiang-cast']){
    const candidate=readJson(localStorage,key,null);
    if(candidate){saved=candidate;source=key;break}
  }
  if(!saved?.confirmed||typeof saved.question!=='string'||!saved.question.trim())return;
  const lines=Array.isArray(saved.lines)?saved.lines:[];
  if(lines.length>6||!lines.every(validLine)||!validRitual(saved.ritual||null,lines.length)){showNotice('检测到一份损坏的起卦进度，已停止恢复；可以重新开始一次占问。');return}
  castState={lines,working:false,runId:0,ritual:saved.ritual||null,confirmed:true,prepared:Boolean(saved.prepared),question:saved.question.trim(),sessionId:typeof saved.sessionId==='string'&&saved.sessionId?saved.sessionId:newSessionId(),mode:saved.mode==='quick'?'quick':'complete'};
  setCastMode(castState.mode,true);
  if(source!=='guanxiang-cast-v3')saveCast();
  $('#questionInput').value=castState.question;$('#questionInput').readOnly=true;$('#consultationGuide').classList.add('confirmed');$('#confirmQuestion').disabled=true;$('#confirmQuestion').textContent='问题已确认';$('#lockedQuestion').textContent=`所问：${castState.question}`;$('#lockedQuestion').classList.remove('hidden');$('#lineCount').textContent=`${castState.lines.length} / 6 爻`;renderRecords();
  if(castState.lines.length===6){$('#ritualTitle').textContent='六爻已成 · 可继续研读';updateCastButton();renderMethodAudit(castState.lines.at(-1));showResult();return}
  if(!castState.prepared){$('#ritualTitle').textContent='五十策已备 · 请亲手虚一';paintStalks('leftStalks',50);setTotal(50);setProcedure('继续本次仪式：先虚一策','进度已从本机恢复','');updateCastButton();return}
  if(!castState.ritual){$('#ritualTitle').textContent=castState.mode==='quick'?`继续演蓍第${castState.lines.length+1}爻`:`第${castState.lines.length}爻已成 · 请准备下一爻`;paintStalks('leftStalks',49);setTotal(49);setProcedure('本次进度已恢复',castState.mode==='quick'?'点击一次演示下一爻三变':'点击“准备下一爻”继续','');updateCastButton();return}
  const ritual=castState.ritual,change=ritual.change;
  $('#ritualTitle').textContent=`继续第${ritual.lineNumber}爻 · 第${ritual.changeNumber}变`;
  if(ritual.stepIndex===0){paintStalks('leftStalks',ritual.stalks);paintStalks('rightStalks',0);setTotal(ritual.stalks);setProcedure(`继续第${ritual.changeNumber}变 · 分二`,ritual.splitReady?'分界已经保留，可直接执行分二':'请在蓍草束上重新落指','');prepareSplitControl()}
  else if(change){paintStalks('leftStalks',change.left);paintStalks('rightStalks',ritual.stepIndex>=2?change.rightAfter:change.right);paintStalks('hangStalks',ritual.stepIndex>=2?1:0,'hanging');setTotal(ritual.stepIndex>=2?ritual.stalks-1:ritual.stalks);const next=['分二','挂一','揲四','归奇'][ritual.stepIndex];setProcedure(`继续第${ritual.changeNumber}变 · ${next}`,'上一步已保存在本机','');markOperation(['split','hang','count','return'][ritual.stepIndex])}
  updateCastButton();
}
function resetCast(){
  aiReadingAbort?.abort();aiReadingAbort=null;currentReading=null;
  const mode=castState.mode;
  castState={lines:[],working:false,runId:castState.runId+1,ritual:null,confirmed:false,prepared:false,question:'',sessionId:'',mode};
  try{['guanxiang-cast','guanxiang-cast-v2','guanxiang-cast-v3'].forEach(key=>localStorage.removeItem(key))}catch(error){console.warn('起卦进度未能清除',error)}
  $('#questionInput').value='';$('#questionInput').readOnly=false;$('#consultationGuide').classList.remove('confirmed');$('#confirmQuestion').textContent='确认问题，进入仪式';$('#lockedQuestion').classList.add('hidden');$('#readingPanel').classList.add('hidden');$('#lineCount').textContent='0 / 6 爻';$('#ritualTitle').textContent='请先确认此次所问';$('#castButton').innerHTML='请先确认问题';markOperation('');$('#splitControl').classList.add('hidden');['leftStalks','rightStalks','taijiStalks','hangStalks','discardStalks'].forEach(id=>paintStalks(id,0));setTotal('—');$('#leftPile strong').textContent='—';$('#rightPile strong').textContent='—';$('#leftPile span').textContent='待分';$('#rightPile span').textContent='待分';$('.yarrow-stage').classList.remove('is-calculating','quick-running');$('#resultCard').classList.add('hidden');renderRecords();renderMethodAudit(null);setCastMode(mode,true);validateQuestion();updateCastButton();
}
function startNextReading(){resetCast();setDivinationPhase('prepare');requestAnimationFrame(()=>$('#questionInput')?.focus())}
function localizeHexagramLabels(){
  if(getLanguage()!=='en')return
  document.querySelectorAll('.hex-row').forEach(row=>{const index=Number(row.dataset.index),h=hexagrams[index];if(!h)return;const name=row.querySelector('.hex-row-name'),trigrams=row.querySelector('.hex-row-trigram');if(name)name.textContent=displayHexagramName(index,'en',h[2]);if(trigrams)trigrams.textContent=(TRIGRAM_EN[h[6]]||h[6])+' over '+(TRIGRAM_EN[h[7]]||h[7])})
  const h=hexagrams[selectedHex],title=document.querySelector('.detail-title'),subtitle=document.querySelector('.detail-subtitle')
  if(h&&title)title.textContent=displayHexagramName(selectedHex,'en',h[2])
  if(h&&subtitle)subtitle.textContent=(TRIGRAM_EN[h[6]]||h[6])+' over '+(TRIGRAM_EN[h[7]]||h[7])
  const order=document.querySelector('.detail-order');
  if(order)order.textContent=`Hexagram ${String(selectedHex+1).padStart(2,'0')} · ${selectedHex<30?'Upper Canon':'Lower Canon'}`
}
function closeLanguageMenus(returnFocus=false){
  document.querySelectorAll('[data-language-menu]').forEach(menu=>{
    menu.classList.remove('open');
    const trigger=menu.querySelector('[data-language-menu-trigger]');
    const options=menu.querySelector('.language-menu-options');
    trigger?.setAttribute('aria-expanded','false');
    if(options)options.hidden=true;
    if(returnFocus&&menu.dataset.focusReturn==='true'){trigger?.focus();delete menu.dataset.focusReturn}
  })
}
function updateLanguageMenus(){
  const language=getLanguage();
  document.querySelectorAll('[data-language-menu]').forEach(menu=>{
    const trigger=menu.querySelector('[data-language-menu-trigger]');
    const label=menu.querySelector('[data-language-menu-label]');
    if(label)label.textContent='Language';
    trigger?.setAttribute('aria-label','Language');
    menu.querySelectorAll('[data-language]').forEach(option=>{
      const selected=option.dataset.language===language;
      option.setAttribute('aria-checked',String(selected));
      option.classList.toggle('selected',selected);
    })
  })
}
function toggleLanguageMenu(menu){
  const trigger=menu.querySelector('[data-language-menu-trigger]');
  const options=menu.querySelector('.language-menu-options');
  if(!trigger||!options)return;
  const open=!menu.classList.contains('open');
  closeLanguageMenus();
  if(open){
    menu.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
    options.hidden=false;
    menu.dataset.focusReturn='true';
    const selected=menu.querySelector('[data-language][aria-checked="true"]');
    (selected||options.querySelector('[data-language]'))?.focus();
  }
}function initLanguageMenus(){
  document.querySelectorAll('[data-language-menu]').forEach(menu=>{
    const trigger=menu.querySelector('[data-language-menu-trigger]');
    trigger?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggleLanguageMenu(menu)});
    menu.querySelectorAll('[data-language]').forEach(option=>option.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();refreshLanguage(option.dataset.language);closeLanguageMenus()}));
  });
}function refreshLanguage(language=getLanguage()){
  setLanguage(language)
  translateDom(document)
  translateKnownText(document)
  renderCalendarMeta()
  renderEditionStatus()
  nav(currentView,false)
  renderHexList()
  renderHexDetail()
  localizeHexagramLabels()
  renderClassics()
  renderPrinciples()
  renderStudyPath()
  renderHistory()
  if(castState.lines.length===6)showResult()
  renderBackupReminder()
  updateCastButton()
  translateKnownText(document)
  updateLanguageMenus()
  updateDailyCoverHexagram()
}
document.addEventListener('DOMContentLoaded',()=>{
  setLanguage(getLanguage());
  initDailyCoverHexagram();
  initLandingCover();
  initTheme();
  registerServiceWorker();
  renderCalendarMeta();
  observeHistoryInterpretation();
  try{const savedMode=localStorage.getItem('guanxiang-reading-mode');if(['ancient','modern'].includes(savedMode))readingMode=savedMode}catch(error){console.warn('阅读模式未能读取',error)}
  ensureDivinationPhases();
  ensureRitualEnhancements();
  showOnboardingIfNeeded();
  setCastMode('complete',true);
  renderHexList();
  renderHexDetail();
  renderClassics();
  renderAnnotationPanel($('#classicsGrid'),'classic',String(selectedWing));
  renderPrinciples();
  renderStudyPath();
  renderHistory();
  renderBackupReminder();
  validateQuestion();
  restoreCast();
  renderRitualProgress();
  renderChangeLedger();
  if(castState.ritual?.stepIndex===0)setProcedure(`继续第${castState.ritual.changeNumber}变 · 分二`,castState.ritual.splitReady?'分界已经保留，左右策数仍未揭开':'按住蓍束，凭感觉松开','');
  if(castState.ritual?.stepIndex===3&&castState.ritual.change)renderCountingBoard(castState.ritual.change,false);
  setDivinationPhase(castState.lines.length>=6?'result':castState.confirmed?'cast':'prepare',false,false);
  applyRoute();
  loadTenWings();
  $$('[data-view]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.view==='history'){historySelectedId='';setMobileDetail('history',false)}
    if(button.dataset.view==='hexagrams')setMobileDetail('hexagrams',false)
    nav(button.dataset.view)
  }));
  $('#mobileMoreToggle')?.addEventListener('click',toggleMobileMore);
  $('#mobileMoreClose')?.addEventListener('click',()=>closeMobileMore(true));
  $('#mobileMoreBackdrop')?.addEventListener('click',()=>closeMobileMore(true));
  $$('[data-cast-phase]').forEach(button=>button.addEventListener('click',()=>setDivinationPhase(button.dataset.castPhase)));
  $('#hexSearch').addEventListener('input',renderHexList);
  $('#wingSearch').addEventListener('input',renderClassics);
  $$('[data-reading-mode]').forEach(button=>button.addEventListener('click',()=>{readingMode=button.dataset.readingMode;try{localStorage.setItem('guanxiang-reading-mode',readingMode)}catch(error){console.warn('阅读模式未能保存',error)}renderClassics()}));
  $('#bookmarkWing').addEventListener('click',()=>{if(!tenWings?.wings?.[selectedWing])return;const id=tenWings.wings[selectedWing].id,bookmarks=wingBookmarks(),next=bookmarks.includes(id)?bookmarks.filter(item=>item!==id):[...bookmarks,id];try{localStorage.setItem('guanxiang-wing-bookmarks',JSON.stringify(next))}catch(error){console.warn('收藏未能保存',error)}renderClassics()});
  $$('.filter-button').forEach(button=>button.addEventListener('click',()=>{$$('.filter-button').forEach(item=>item.classList.remove('active'));button.classList.add('active');filter=button.dataset.filter;renderHexList()}));
  $('#questionInput').addEventListener('input',validateQuestion);
  $$('[data-cast-mode]').forEach(button=>button.addEventListener('click',()=>setCastMode(button.dataset.castMode)));
  $$('[data-question-example]').forEach(button=>button.addEventListener('click',()=>{$('#questionInput').value=button.dataset.questionExample;validateQuestion()}));
  $('#confirmQuestion').addEventListener('click',requestDivinationConfirmation);
  $('#confirmDivination').addEventListener('click',()=>{confirmQuestion();if(castState.confirmed)setDivinationPhase('cast')});
  $('#splitChooser').addEventListener('pointerdown',beginSplitFeeling);
  $('#splitChooser').addEventListener('pointermove',trackSplitFeeling);
  $('#splitChooser').addEventListener('pointerup',finishSplitFeeling);
  $('#splitChooser').addEventListener('pointercancel',cancelSplitFeeling);
  $('#splitChooser').addEventListener('keydown',beginSplitFeeling);
  $('#splitChooser').addEventListener('keyup',finishSplitFeeling);
  $('#castButton').addEventListener('click',castLine);
  $('#resetButton').addEventListener('click',()=>{if(castState.lines.length>=6){startNextReading();return}if(castState.confirmed||castState.lines.length||castState.ritual){const dialog=$('#resetDialog');if(typeof dialog.showModal==='function')dialog.showModal();else if(confirm(t('dialog.resetTitle'))){resetCast();setDivinationPhase('prepare')}}else{resetCast();setDivinationPhase('prepare')}});
  $('#confirmReset').addEventListener('click',()=>{resetCast();setDivinationPhase('prepare')});
  $('#nextReadingButton').addEventListener('click',startNextReading);
  $('#resultRead').addEventListener('click',()=>{nav('hexagrams');renderHexList();renderHexDetail()});
  $('#generateAiReading').addEventListener('click',generateAiReading);
  $('#saveReadingNote').addEventListener('click',saveCurrentReadingNote);
  $('#historySearch').addEventListener('input',event=>{historyQuery=event.target.value;renderHistory()});
  $('#exportHistory').addEventListener('click',exportHistory);
  $('#importHistory').addEventListener('click',()=>$('#historyFile').click());
  $('#historyFile').addEventListener('change',event=>importHistoryFile(event.target.files?.[0]));
  $('#confirmImport').addEventListener('click',confirmHistoryImport);
  $('#cancelImport').addEventListener('click',()=>{pendingImport=null});
  $('#themeToggle').addEventListener('click',()=>applyTheme(document.body.classList.contains('dark-mode')?'light':'dark',true));
  document.addEventListener('click',event=>{if(event.target.closest('.wing-order-item'))requestAnimationFrame(()=>renderAnnotationPanel($('#classicsGrid'),'classic',String(selectedWing)))});
  $('#onboardingStart')?.addEventListener('click',dismissOnboarding);
  $('#onboardingLater')?.addEventListener('click',dismissOnboarding);
  $('#onboardingDialog')?.addEventListener('cancel',dismissOnboarding);
});
window.addEventListener('hashchange',applyRoute);
document.addEventListener('DOMContentLoaded',()=>{if(!castState.confirmed)return;$('#questionFeedback').textContent='问题已锁定，当前仪式进度已保存在本机。';$('#questionFeedback').className='valid';if(castState.prepared)paintStalks('taijiStalks',1,'discarded')});

document.addEventListener('click',event=>{if(!event.target.closest('[data-language-menu]'))closeLanguageMenus()});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    if(document.body.classList.contains('mobile-more-open')){closeMobileMore(true);event.preventDefault();return}
    const open=document.querySelector('[data-language-menu].open');
    if(open){closeLanguageMenus(true);event.preventDefault()}
  }
});
window.addEventListener('resize',()=>{if(innerWidth>680)closeMobileMore()});
document.addEventListener('DOMContentLoaded',()=>{
  setLanguage(getLanguage());
  translateDom(document);
  translateKnownText(document);
  updateLanguageMenus();
  initLanguageMenus();
  let translationFrame=0;
  const observer=new MutationObserver(()=>{
    if(getLanguage()!=='en'||translationFrame)return;
    translationFrame=requestAnimationFrame(()=>{translationFrame=0;translateKnownText(document);localizeHexagramLabels()});
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','data-question-example']});
});
