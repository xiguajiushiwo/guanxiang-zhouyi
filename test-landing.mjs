import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, worker] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./service-worker.js', import.meta.url), 'utf8'),
]);

assert.match(html, /id="siteCover"/);
assert.match(html, /id="dailyCoverHexagram"/);
assert.match(html, /id="coverLanguageToggle"/);
assert.match(html, /id="languageToggle"/);
assert.match(html, /id="mobileMoreToggle"/);
assert.match(html, /id="mobileMoreMenu"/);
assert.match(html, /<section class="[^"]*study-overview[^"]*" id="view-home">/);
assert.match(html, /class="study-entry"[^>]*data-view="principles"/);
assert.doesNotMatch(html, /class="quick-grid"/);
assert.equal((html.match(/data-language-menu>/g) || []).length, 2);
assert.equal((html.match(/data-language="fa"/g) || []).length, 2);
assert.match(script, /function initLandingCover\(\)/);
assert.match(script, /const AUTH_ENTRY='\.\/auth\?v=20260922-auth7'/);
assert.doesNotMatch(script, /clearLegacyAuthNavigationState/);
assert.match(script, /function updateDailyCoverHexagram\(/);
assert.match(script, /function initDailyCoverHexagram\(/);
assert.match(script, /setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/);
assert.doesNotMatch(script, /classList\.add\(['"]is-leaving['"]\)/);
assert.match(html, /id="historyIndexPage"/);
assert.match(html, /id="historyRecordPage"[^>]*hidden/);
assert.match(html, /id="divinationConfirmDialog"/);
assert.match(html, /id="confirmDivination"[^>]*>准备好了，开始起卦<\/button>/);
assert.match(html, /结果仅供参考/);
assert.match(script, /function requestDivinationConfirmation\(\)/);
assert.match(script, /\$\('#confirmQuestion'\)\.addEventListener\('click',requestDivinationConfirmation\)/);
assert.match(script, /\$\('#confirmDivination'\)\.addEventListener\('click'/);
assert.match(script, /function toggleMobileMore\(\)/);
assert.match(script, /setMobileDetail\('hexagrams',true\)/);
assert.match(script, /function renderHistoryDetail\(record\)/);
assert.match(worker, /CACHE_NAME='guanxiang-shell-v54'/);

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
