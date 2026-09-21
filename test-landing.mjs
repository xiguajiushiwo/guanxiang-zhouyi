import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, styles, richStyles, detailsStyles, worker, appStyles] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./landing-v2.css', import.meta.url), 'utf8'),
  readFile(new URL('./landing-rich.css', import.meta.url), 'utf8'),
  readFile(new URL('./landing-details.css', import.meta.url), 'utf8'),
  readFile(new URL('./service-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('./styles.css', import.meta.url), 'utf8'),
]);

assert.match(html, /id="siteCover"/);
assert.match(html, /id="dailyCoverHexagram"/);
assert.match(html, /id="coverLanguageToggle"/);
assert.match(html, /id="languageToggle"/);
assert.match(html, /id="mobileMoreToggle"/);
assert.match(html, /id="mobileMoreMenu"/);
assert.match(html, /<section class="[^"]*home-overview[^"]*" id="view-home">/);
assert.match(html, /class="primary-button home-primary-action"[^>]*data-view="divination"/);
assert.match(html, /class="home-path"[^>]*data-view="principles"/);
assert.doesNotMatch(html, /class="quick-grid"/);
assert.equal((html.match(/data-language-menu>/g) || []).length, 2);
assert.equal((html.match(/data-language="fa"/g) || []).length, 2);
assert.match(html, /id="enterSite"[^>]*>\s*进入观象\s*<\/button>/);
assert.equal((html.match(/进入观象/g) || []).length, 1);
assert.match(html, /landing-v2\.css/);
assert.match(script, /function initLandingCover\(\)/);
assert.match(script, /function updateDailyCoverHexagram\(/);
assert.match(script, /function initDailyCoverHexagram\(/);
assert.match(script, /removeAttribute\(['"]inert['"]\)/);
assert.match(script, /setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/);
assert.match(styles, /\.site-cover\s*\{/);
assert.match(styles, /\.cover-hexagram\s*\{/);
assert.match(detailsStyles, /\.cover-frame::before\s*\{/);
assert.match(detailsStyles, /\.cover-title-wrap::before\s*\{/);
assert.match(detailsStyles, /\.cover-orbit\s*\{[^}]*display:\s*block/s);
assert.doesNotMatch(detailsStyles, /gradient\(/);
assert.match(detailsStyles, /\.cover-enter\s*\{[^}]*box-shadow/s);
assert.match(detailsStyles, /\.cover-disc::before\s*\{[^}]*top:\s*-45px/s);
assert.match(detailsStyles, /\.cover-disc::after\s*\{[^}]*bottom:\s*-45px/s);
assert.match(detailsStyles, /\.site-cover::before,[\s\S]*\.site-cover::after,[\s\S]*\.cover-orbit\s*\{\s*transform:\s*translateY\(-50%\)/);
assert.match(detailsStyles, /clamp\(0px, calc\(\.75vw - 10\.8px\), 8px\)/);
assert.match(detailsStyles, /@media\s*\(min-width:\s*1361px\)/);
assert.match(richStyles, /\.cover-frame::before\s*\{/);
assert.match(richStyles, /\.cover-title-wrap::before\s*\{/);
assert.match(richStyles, /\.cover-orbit\s*\{[^}]*display:\s*block/s);
assert.doesNotMatch(richStyles, /gradient\(/);
assert.match(script, /requestAnimationFrame\(\(\)=>document\.dispatchEvent\(new Event\('guanxiang:entered'\)\)\)/);
assert.ok(script.indexOf("$('.main-content')?.focus") < script.indexOf("requestAnimationFrame(()=>document.dispatchEvent(new Event('guanxiang:entered')))"));
assert.match(styles, /@media\s*\(max-width:\s*680px\)/);
assert.match(appStyles, /\.sidebar>\.primary-nav\{position:fixed/);
assert.match(appStyles, /#view-hexagrams\.mobile-detail-open/);
assert.match(appStyles, /#view-home \.home-symbol-quote\{display:grid/);
assert.doesNotMatch(appStyles, /#view-home \.home-symbol-quote\{display:none\}/);
assert.match(html, /id="historyIndexPage"/);
assert.match(html, /id="historyRecordPage"[^>]*hidden/);
assert.match(html, /id="divinationConfirmDialog"/);
assert.match(html, /id="confirmDivination"[^>]*>我已静心，确认开始<\/button>/);
assert.match(html, /结果仅供参考/);
assert.match(appStyles, /\.history-record-page\[hidden\]/);
assert.match(script, /function requestDivinationConfirmation\(\)/);
assert.match(script, /\$\('#confirmQuestion'\)\.addEventListener\('click',requestDivinationConfirmation\)/);
assert.match(script, /\$\('#confirmDivination'\)\.addEventListener\('click'/);
assert.match(script, /function toggleMobileMore\(\)/);
assert.match(script, /setMobileDetail\('hexagrams',true\)/);
assert.match(script, /function renderHistoryDetail\(record\)/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);
assert.doesNotMatch(styles, /gradient\(/);
assert.match(worker, /['"]\.\/landing-v2\.css['"]/);
assert.match(worker, /CACHE_NAME='guanxiang-shell-v38'/);

const endpointScript=html.match(/<script>window\.GUANXIANG_AI_ENDPOINT=.*?<\/script>/s)?.[0].replace(/^<script>|<\/script>$/g,'');
assert.ok(endpointScript);
const endpointFor=hostname=>{
  const window={GUANXIANG_AI_ENDPOINT:''};
  Function('window','location',endpointScript)(window,{hostname});
  return window.GUANXIANG_AI_ENDPOINT;
};
assert.equal(endpointFor('guanxiang-zhouyi-evf.pages.dev'),'/api/reading');
assert.equal(endpointFor('guanxiang-zhouyi-global.netlify.app'),'/api/reading');
assert.equal(endpointFor('guanxiang-zhouyi.liara.run'),'/api/reading');
assert.equal(endpointFor('127.0.0.1'),'');

console.log('首页封面结构校验通过。');
