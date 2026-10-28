import {attributeHtml as attr,textHtml as text} from './html-safety.mjs';
import {buildCaseReviewPayload,caseSignature,relatedReadings,CASE_CANDIDATE_LIMIT} from './case-review.mjs';

const COPY={
  title:['同一件事，持续看它的变化','Follow the same matter over time','پیگیری یک موضوع در گذر زمان'],
  label:['AI 关联复盘','AI review across readings','بازنگری خوانش‌های مرتبط با هوش مصنوعی'],
  intro:['把相关的问题与历次卦象连起来，看看哪些判断延续了、哪些发生了变化。','Connect related questions and compare what continued or changed.','پرسش‌های مرتبط را پیوند دهید و تداوم و تغییر را بررسی کنید.'],
  find:['AI 查找关联并复盘','Find connections and review with AI','یافتن ارتباط و بازنگری با هوش مصنوعی'],
  review:['AI 对照历次占问','Compare these readings with AI','مقایسه این خوانش‌ها با هوش مصنوعی'],
  followup:['再次占问这件事','Ask about this matter again','دوباره درباره این موضوع بپرسید'],
  timeline:['这件事的历次占问','Readings about this matter','خوانش‌های این موضوع'],
  current:['本次查看','Current reading','خوانش کنونی'],
  open:['打开记录','Open reading','باز کردن خوانش'],remove:['取消关联','Remove connection','حذف ارتباط'],
  same:['再次占问同一件事','Follow-up on the same matter','پیگیری همان موضوع'],
  aiLink:['AI 推测关联','AI-suggested connection','ارتباط پیشنهادی هوش مصنوعی'],
  empty:['还没有关联记录。可以让 AI 从历史问题中查找，也可以从这里再次占问。','No connected readings yet. Let AI search your history, or ask about this matter again.','هنوز خوانش مرتبطی نیست. تاریخچه را با هوش مصنوعی جست‌وجو کنید یا دوباره بپرسید.'],
  none:['AI 暂未发现明确关联的问题。你也可以手动关联一条记录。','AI found no clear connection. You can also link a reading yourself.','هوش مصنوعی ارتباط روشنی نیافت. می‌توانید یک خوانش را دستی مرتبط کنید.'],
  finding:['AI 正在查找相关问题…','AI is finding related questions…','هوش مصنوعی در حال یافتن پرسش‌های مرتبط است…'],
  reviewing:['AI 正在对照前后卦象与解读…','AI is comparing the readings…','هوش مصنوعی در حال مقایسه خوانش‌هاست…'],
  privacy:['查找关联会发送当前问题和最近 40 条历史问题；对照复盘会发送所选记录的卦象、解读摘录与已填写的进展。','Finding connections sends this question and up to 40 recent questions. Comparison sends selected hexagrams, reading excerpts, and recorded updates.','جست‌وجوی ارتباط، این پرسش و حداکثر ۴۰ پرسش اخیر را ارسال می‌کند. مقایسه، هگزاگرام‌ها، گزیده تفسیر و پیشرفت‌های ثبت‌شده را ارسال می‌کند.'],
  unavailable:['此预览尚未连接 AI 服务。可以查看示例、关联记录或再次占问。','AI is not connected here. You can explore examples, link readings, or ask again.','هوش مصنوعی متصل نیست. نمونه‌ها را ببینید، خوانش‌ها را مرتبط کنید یا دوباره بپرسید.'],
  failed:['AI 本次未完成，请重试。原有记录与复盘已保留。','AI could not finish. Retry; existing readings and reviews are preserved.','هوش مصنوعی کامل نکرد. دوباره تلاش کنید؛ خوانش‌ها و بازنگری‌ها حفظ شده‌اند.'],
  timeout:['AI 响应超时，请稍后重试。','AI timed out. Please retry.','پاسخ هوش مصنوعی زمان‌بر شد. دوباره تلاش کنید.'],
  quota:['AI 请求额度暂时用完，请稍后重试。','The AI request limit has been reached. Retry later.','سهمیه درخواست هوش مصنوعی تمام شده است. بعداً تلاش کنید.'],
  needMore:['至少关联两次占问后，就可以让 AI 对照分析。','Connect at least two readings for an AI comparison.','برای مقایسه حداقل دو خوانش را مرتبط کنید.'],
  summary:['这件事的整体脉络','Overall picture','تصویر کلی'],continuities:['前后延续的判断','What stayed consistent','آنچه ثابت مانده'],changes:['问题、卦象与解读的变化','Changes in questions and readings','تغییر پرسش‌ها و خوانش‌ها'],uncertainties:['分歧与仍无法判断的地方','Differences and uncertainties','تفاوت‌ها و ابهام‌ها'],nextStep:['下一阶段留意什么','What to watch next','در مرحله بعد به چه توجه کنیم'],
  stale:['有新的占问或进展，可以重新生成对照复盘。','There are new readings or updates. Generate a fresh comparison.','خوانش یا پیشرفت تازه‌ای هست. مقایسه تازه ایجاد کنید.'],
  saved:['已保存的 AI 复盘','Saved AI review','بازنگری ذخیره‌شده هوش مصنوعی'],
  archives:['以前的 AI 复盘','Previous AI reviews','بازنگری‌های پیشین هوش مصنوعی'],
  manual:['手动关联已有占问','Link an existing reading','پیوند دستی یک خوانش'],select:['选择一条历史问题','Choose a previous question','یک پرسش پیشین انتخاب کنید'],link:['关联这条记录','Link this reading','مرتبط کردن این خوانش'],
  notes:['补充现实进展与个人笔记','Add real-world updates and notes','افزودن پیشرفت واقعی و یادداشت'],
  from:['继续上次的问题','Following up on a previous question','پیگیری یک پرسش پیشین'],
  context:['这段时间发生了什么？（选填）','What has happened since then? (optional)','از آن زمان چه اتفاقی افتاده؟ (اختیاری)'],
  contextHint:['例如：收到面试邀请，想再看看下一步应如何准备。','For example: I received an interview invitation and want to consider the next step.','مثلاً: دعوت به مصاحبه دریافت کردم و می‌خواهم گام بعدی را بررسی کنم.'],
  sample:['示例复盘内容','Example review','نمونه بازنگری'],
};
export const caseCopy=(key,language='zh-CN')=>COPY[key]?.[language==='en'?1:language==='fa'?2:0]||key;
export function mountCaseReview(container,record,records,{language,endpoint,state={},onAnalyze,onReview,onFollowup,onOpen,onRemove,onLink}){
  const c=key=>caseCopy(key,language),group=relatedReadings(record,records),payload=buildCaseReviewPayload(record,records,language);
  const reviews=(record.caseReviews||[]).filter(item=>item.language===language),latest=reviews.at(-1),busy=Boolean(state.phase);
  const formatDate=value=>new Date(value).toLocaleDateString(language==='en'?'en-US':language==='fa'?'fa':'zh-CN');
  const reportHtml=review=>['summary','continuities','changes','uncertainties','nextStep'].map(key=>`<article><h4>${c(key)}</h4><p data-user-content>${text(review[key])}</p></article>`).join('');
  const grouped=new Set(group.map(item=>item.id));
  container.innerHTML=`<header class="case-heading"><span class="panel-kicker">${c('label')}</span><h2>${c('title')}</h2><p>${c('intro')}</p></header>
    <div class="case-actions"><button type="button" class="primary-button" data-case-analyze ${!endpoint||busy||records.length<2?'disabled':''}>${c('find')}</button><button type="button" class="secondary-button" data-case-followup>${c('followup')}</button></div>
    <p class="case-privacy">${c(endpoint?'privacy':'unavailable')}</p>
    <p class="case-status" role="status" aria-live="polite">${state.phase?c(state.phase):state.error?c(state.error):state.noMatches?c('none'):''}</p>
    <section class="case-timeline"><h3>${c('timeline')} · ${group.length}</h3>${group.length<2?`<p class="case-empty">${c('empty')}</p>`:''}
      ${group.map(item=>{const edge=(record.connections||[]).find(link=>link.id===item.id&&!link.removed)||(item.connections||[]).find(link=>link.id===record.id&&!link.removed);return `<article class="case-reading ${item.id===record.id?'is-current':''}"><div class="case-reading-date"><time>${text(formatDate(item.completedAt||item.createdAt))}</time>${item.id===record.id?`<span>${c('current')}</span>`:''}</div><b data-user-content>${text(item.question)}</b><p>${text(item.originalIndex+1)} → ${text(item.changedIndex+1)}</p>${edge?`<small>${c(edge.kind==='followup'?'same':edge.kind==='manual'?'manual':'aiLink')}${edge.reason?` · <span data-user-content>${text(edge.reason)}</span>`:''}</small>`:''}${item.id!==record.id?`<div><button class="text-button" type="button" data-case-open="${attr(item.id)}">${c('open')}</button><button class="text-button" type="button" data-case-remove="${attr(item.id)}">${c('remove')}</button></div>`:''}</article>`}).join('')}
    </section>
    <details class="case-manual"><summary>${c('manual')}</summary><label for="case-record-select">${c('select')}</label><select id="case-record-select"><option value="">${c('select')}</option>${records.filter(item=>!grouped.has(item.id)).map(item=>`<option value="${attr(item.id)}">${text(formatDate(item.createdAt)+' · '+item.question)}</option>`).join('')}</select><button type="button" class="secondary-button" data-case-link>${c('link')}</button></details>
    <div class="case-review-action"><button type="button" class="primary-button" data-case-review ${!endpoint||busy||group.length<2?'disabled':''}>${c('review')}</button><small>${group.length<2?c('needMore'):`${payload.readings.length} / ${group.length}`}</small></div>
    ${latest?`<section class="case-report"><div class="case-report-head"><h3>${c('saved')}</h3><time>${text(formatDate(latest.generatedAt))}</time></div>${latest.signature!==caseSignature(payload)?`<p class="case-stale">${c('stale')}</p>`:''}${reportHtml(latest)}</section>`:''}
    ${reviews.length>1?`<details class="case-archives"><summary>${c('archives')} · ${reviews.length-1}</summary>${reviews.slice(0,-1).reverse().map(review=>`<details><summary>${text(formatDate(review.generatedAt))}</summary>${reportHtml(review)}</details>`).join('')}</details>`:''}`;
  container.querySelector('[data-case-analyze]').onclick=onAnalyze;
  container.querySelector('[data-case-review]').onclick=onReview;
  container.querySelector('[data-case-followup]').onclick=onFollowup;
  container.querySelectorAll('[data-case-open]').forEach(button=>button.onclick=()=>onOpen(button.dataset.caseOpen));
  container.querySelectorAll('[data-case-remove]').forEach(button=>button.onclick=()=>onRemove(button.dataset.caseRemove));
  container.querySelector('[data-case-link]').onclick=()=>{const id=container.querySelector('select').value;if(id)onLink(id)};
}
