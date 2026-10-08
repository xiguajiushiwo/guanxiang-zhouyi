# Information And Support Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seven tri-lingual, responsive static information pages and make them reachable from the cover, account page, desktop sidebar, and mobile menu without adding payment, form submission, or report handling.

**Architecture:** Keep page metadata and social destinations in a pure `info-content.mjs` module, while `info.js` only binds that data and the existing i18n module to a shared static HTML shell. Each public path is backed by its own thin HTML file for direct navigation and offline caching; existing application code only receives ordinary links and no new routing state.

**Tech Stack:** Static HTML/CSS, native ES modules, existing `i18n.mjs`, Node test runner with `node:assert`, current CDP browser test harness, Cloudflare Pages static output, Service Worker Cache API.

**Spec:** `docs/superpowers/specs/2026-10-08-information-support-pages-design.md`

## Global Constraints

- Work only on `codex/liuyao-complete`; do not modify `main` and do not deploy Cloudflare automatically.
- Public pages are `/support`, `/changelog`, `/pro`, `/disclaimer`, `/privacy`, `/feedback`, and `/report`.
- Pages contain only their title, English identifier, “coming soon” state, cross-navigation, social area, return navigation, and copyright shell.
- Do not copy text, contact details, legal terms, filing numbers, subscription rights, or social accounts from `metisziwei.com`.
- GitHub must link to `https://github.com/xiguajiushiwo/guanxiang-zhouyi`; Xiaohongshu, Douyin, and X must be visibly unavailable and must not navigate.
- Feedback, report, and professional-edition pages remain static; no payment, entitlement, form submission, email, or persistence is added.
- All new UI supports `zh-CN`, `en`, and `fa`; Persian sets `dir="rtl"`.
- All information remains readable without JavaScript; JavaScript only enhances language and active-state behavior.
- Mobile acceptance widths are 320px and 390px with no horizontal overflow or overlapping text.

---

### Task 1: Define Information Metadata And Translation Contract

**Files:**
- Create: `info-content.mjs`
- Create: `test-info-pages.mjs`
- Modify: `i18n.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `INFO_PAGES`, a frozen array of `{ slug, key, path, kicker }` records.
- Produces: `INFO_SOCIALS`, a frozen array of `{ id, label, href, available }` records.
- Produces: `getInfoPage(slug)`, returning the matching page record or the support record.
- Consumes later: `info.js`, static-page tests, navigation rendering, and social rendering.

- [ ] **Step 1: Write the metadata and translation assertions**

Create `test-info-pages.mjs` with the first contract:

```js
import assert from 'node:assert/strict';
import { dictionaryForTests } from './i18n.mjs';
import { INFO_PAGES, INFO_SOCIALS, getInfoPage } from './info-content.mjs';

const expected=['support','changelog','pro','disclaimer','privacy','feedback','report'];
assert.deepEqual(INFO_PAGES.map(page=>page.slug),expected);
assert.equal(new Set(INFO_PAGES.map(page=>page.path)).size,expected.length);
assert.equal(getInfoPage('privacy').key,'privacy');
assert.equal(getInfoPage('unknown').key,'support');

const github=INFO_SOCIALS.find(item=>item.id==='github');
assert.deepEqual(github,{
  id:'github',
  label:'GitHub',
  href:'https://github.com/xiguajiushiwo/guanxiang-zhouyi',
  available:true,
});
for(const id of ['xiaohongshu','douyin','x']){
  const social=INFO_SOCIALS.find(item=>item.id===id);
  assert.equal(social.available,false);
  assert.equal(social.href,'');
}

const dictionary=dictionaryForTests();
for(const language of ['zh-CN','en','fa']){
  for(const page of INFO_PAGES){
    assert.ok(dictionary[language][`info.${page.key}.title`]);
    assert.ok(dictionary[language][`info.${page.key}.browserTitle`]);
  }
  for(const key of ['info.comingSoon','info.backHome','info.allPages','info.socials','info.unavailable','info.supportEntry','info.githubLabel']){
    assert.ok(dictionary[language][key]);
  }
}
console.log('Information page metadata and translations passed.');
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `node test-info-pages.mjs`

Expected: FAIL because `info-content.mjs` does not exist.

- [ ] **Step 3: Add the pure metadata module**

Create `info-content.mjs`:

```js
export const INFO_PAGES=Object.freeze([
  {slug:'support',key:'support',path:'./support',kicker:'SUPPORT CENTER'},
  {slug:'changelog',key:'changelog',path:'./changelog',kicker:'CHANGELOG'},
  {slug:'pro',key:'pro',path:'./pro',kicker:'PRO EDITION'},
  {slug:'disclaimer',key:'disclaimer',path:'./disclaimer',kicker:'DISCLAIMER'},
  {slug:'privacy',key:'privacy',path:'./privacy',kicker:'PRIVACY'},
  {slug:'feedback',key:'feedback',path:'./feedback',kicker:'FEEDBACK'},
  {slug:'report',key:'report',path:'./report',kicker:'REPORT'},
]);

export const INFO_SOCIALS=Object.freeze([
  {id:'xiaohongshu',label:'小红书',href:'',available:false},
  {id:'douyin',label:'抖音',href:'',available:false},
  {id:'x',label:'X',href:'',available:false},
  {id:'github',label:'GitHub',href:'https://github.com/xiguajiushiwo/guanxiang-zhouyi',available:true},
]);

export function getInfoPage(slug){
  return INFO_PAGES.find(page=>page.slug===slug)||INFO_PAGES[0];
}
```

- [ ] **Step 4: Add the exact i18n keys**

Add these key families to all three `DICTIONARY` languages in `i18n.mjs`:

```js
'info.support.title': '支持中心',
'info.changelog.title': '更新日志',
'info.pro.title': '专业版',
'info.disclaimer.title': '免责声明',
'info.privacy.title': '隐私',
'info.feedback.title': '反馈留言',
'info.report.title': '举报',
'info.comingSoon': '页面正在准备中',
'info.backHome': '返回首页',
'info.allPages': '信息与支持',
'info.socials': '关注观象',
'info.unavailable': '即将开放',
'info.supportEntry': '支持与关于',
'info.githubLabel': '在 GitHub 查看观象项目',
```

Use these exact title and common-value translations:

| Key | English | Persian |
| --- | --- | --- |
| `info.support.title` | Support Center | مرکز پشتیبانی |
| `info.changelog.title` | Changelog | گزارش تغییرات |
| `info.pro.title` | Pro Edition | نسخه حرفه‌ای |
| `info.disclaimer.title` | Disclaimer | سلب مسئولیت |
| `info.privacy.title` | Privacy | حریم خصوصی |
| `info.feedback.title` | Feedback | بازخورد |
| `info.report.title` | Report | گزارش |
| `info.comingSoon` | This page is being prepared | این صفحه در حال آماده‌سازی است |
| `info.backHome` | Back to home | بازگشت به صفحه اصلی |
| `info.allPages` | Information & Support | اطلاعات و پشتیبانی |
| `info.socials` | Follow Guanxiang | گوانشیانگ را دنبال کنید |
| `info.unavailable` | Coming soon | به‌زودی |
| `info.supportEntry` | Support & About | پشتیبانی و درباره |
| `info.githubLabel` | View Guanxiang on GitHub | مشاهده پروژه گوانشیانگ در GitHub |

Use these exact browser-title patterns with the translated titles from the table: Chinese title followed by ` · 观象`, English title followed by ` · Guanxiang`, and Persian title followed by ` · گوانشیانگ`. For example, the support values are `支持中心 · 观象`, `Support Center · Guanxiang`, and `مرکز پشتیبانی · گوانشیانگ`; apply the same fixed suffix to the other six listed titles.

- [ ] **Step 5: Register the test and run it**

Insert `node test-info-pages.mjs` after `node test-i18n.mjs` in `test:unit` inside `package.json`.

Run: `node test-info-pages.mjs && node test-i18n.mjs`

Expected: both tests PASS and the dictionary has all keys in all three languages.

- [ ] **Step 6: Commit the metadata contract**

```bash
git add info-content.mjs i18n.mjs test-info-pages.mjs package.json
git commit -m "feat: define information page metadata"
```

---

### Task 2: Build The Shared Information Page Shell

**Files:**
- Create: `info.css`
- Create: `info.js`
- Create: `support.html`
- Create: `changelog.html`
- Create: `pro.html`
- Create: `disclaimer.html`
- Create: `privacy.html`
- Create: `feedback.html`
- Create: `report.html`
- Modify: `test-info-pages.mjs`

**Interfaces:**
- Consumes: `INFO_PAGES`, `INFO_SOCIALS`, and `getInfoPage()` from `info-content.mjs`.
- Consumes: `getLanguage()`, `setLanguage()`, `t()`, and `translateDom()` from `i18n.mjs`.
- Produces: seven directly readable static documents with `body[data-info-page]`.
- Produces: `renderInfoPage()` in `info.js`, which localizes the shell, marks the active page, and renders social availability.

- [ ] **Step 1: Extend the static test with shell requirements**

Append to `test-info-pages.mjs`:

```js
import { readFile } from 'node:fs/promises';

for(const slug of expected){
  const html=await readFile(new URL(`./${slug}.html`,import.meta.url),'utf8');
  assert.match(html,new RegExp(`<body[^>]*data-info-page="${slug}"`));
  assert.match(html,/href="\.\/info\.css/);
  assert.match(html,/src="\.\/info\.js/);
  assert.match(html,/data-info-title/);
  assert.match(html,/data-info-nav/);
  assert.match(html,/data-info-socials/);
  assert.equal((html.match(/class="info-nav-link"/g)||[]).length,7);
  assert.match(html,/href="https:\/\/github\.com\/xiguajiushiwo\/guanxiang-zhouyi"/);
  assert.equal((html.match(/data-social-unavailable/g)||[]).length,3);
  assert.match(html,/页面正在准备中/);
  assert.match(html,/href="\.\/"/);
}

const infoScript=await readFile(new URL('./info.js',import.meta.url),'utf8');
assert.match(infoScript,/INFO_PAGES/);
assert.match(infoScript,/INFO_SOCIALS/);
assert.match(infoScript,/aria-current/);
assert.match(infoScript,/document\.documentElement\.dir/);
```

- [ ] **Step 2: Run the shell test and verify it fails**

Run: `node test-info-pages.mjs`

Expected: FAIL opening `support.html`.

- [ ] **Step 3: Create the seven HTML shells**

Use this complete structure for every page, changing only the fallback `<title>`, `data-info-page`, fallback `<h1>`, and kicker according to the table in Task 1:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f4f0e6" />
    <link rel="icon" href="./app-icon.svg" />
    <link rel="stylesheet" href="./info.css?v=20261008-info1" />
    <title>支持中心 · 观象</title>
  </head>
  <body data-info-page="support">
    <div class="info-page">
      <header class="info-header">
        <a class="info-brand" href="./" aria-label="返回观象首页"><span aria-hidden="true">觀</span><b>观象</b></a>
        <div class="info-language" data-info-language>
          <button type="button" aria-haspopup="menu" aria-expanded="false" data-info-language-trigger>Language</button>
          <div class="info-language-options" role="menu" hidden>
            <button type="button" role="menuitemradio" data-language="zh-CN">中文</button>
            <button type="button" role="menuitemradio" data-language="en">English</button>
            <button type="button" role="menuitemradio" data-language="fa">فارسی</button>
          </div>
        </div>
      </header>
      <main class="info-main">
        <section class="info-intro">
          <p class="info-kicker" data-info-kicker>SUPPORT CENTER</p>
          <h1 data-info-title>支持中心</h1>
          <p class="info-status" data-i18n="info.comingSoon">页面正在准备中</p>
        </section>
        <nav class="info-nav" aria-label="信息与支持" data-info-nav>
          <a class="info-nav-link" href="./support" aria-current="page"><span>01</span><b>支持中心</b><i aria-hidden="true">↗</i></a>
          <a class="info-nav-link" href="./changelog"><span>02</span><b>更新日志</b><i aria-hidden="true">↗</i></a>
          <a class="info-nav-link" href="./pro"><span>03</span><b>专业版</b><i aria-hidden="true">↗</i></a>
          <a class="info-nav-link" href="./disclaimer"><span>04</span><b>免责声明</b><i aria-hidden="true">↗</i></a>
          <a class="info-nav-link" href="./privacy"><span>05</span><b>隐私</b><i aria-hidden="true">↗</i></a>
          <a class="info-nav-link" href="./feedback"><span>06</span><b>反馈留言</b><i aria-hidden="true">↗</i></a>
          <a class="info-nav-link" href="./report"><span>07</span><b>举报</b><i aria-hidden="true">↗</i></a>
        </nav>
      </main>
      <footer class="info-footer">
        <section>
          <h2 data-i18n="info.socials">关注观象</h2>
          <div class="info-socials" data-info-socials>
            <span data-social-unavailable="xiaohongshu"><b>小红书</b><small>即将开放</small></span>
            <span data-social-unavailable="douyin"><b>抖音</b><small>即将开放</small></span>
            <span data-social-unavailable="x"><b>X</b><small>即将开放</small></span>
            <a data-social="github" href="https://github.com/xiguajiushiwo/guanxiang-zhouyi" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </section>
        <a href="./" data-i18n="info.backHome">返回首页</a>
        <small>© 2026 观象</small>
      </footer>
    </div>
    <script type="module" src="./info.js?v=20261008-info1"></script>
  </body>
</html>
```

The seven fallback Chinese titles are exactly: `支持中心`, `更新日志`, `专业版`, `免责声明`, `隐私`, `反馈留言`, and `举报`. Each file contains the complete seven-link navigation and four social rows shown above; move `aria-current="page"` to that file's own link. This fallback content must remain visible when scripts are disabled.

- [ ] **Step 4: Implement `info.js` without business actions**

Implement a DOM-only controller with these behaviors:

```js
import { INFO_PAGES, INFO_SOCIALS, getInfoPage } from './info-content.mjs';
import { getLanguage, setLanguage, t, translateDom } from './i18n.mjs';

const page=getInfoPage(document.body.dataset.infoPage);
const $=selector=>document.querySelector(selector);

function renderInfoPage(){
  const language=getLanguage();
  document.documentElement.lang=language;
  document.documentElement.dir=language==='fa'?'rtl':'ltr';
  document.title=t(`info.${page.key}.browserTitle`);
  $('[data-info-title]').textContent=t(`info.${page.key}.title`);
  $('[data-info-kicker]').textContent=page.kicker;
  translateDom(document);
  const nav=$('[data-info-nav]');
  nav.replaceChildren(...INFO_PAGES.map((item,index)=>{
    const link=document.createElement('a');
    link.href=item.path;
    link.className='info-nav-link';
    link.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span><b>${t(`info.${item.key}.title`)}</b><i aria-hidden="true">↗</i>`;
    if(item.slug===page.slug)link.setAttribute('aria-current','page');
    return link;
  }));
  const socials=$('[data-info-socials]');
  socials.replaceChildren(...INFO_SOCIALS.map(item=>{
    if(item.available){
      const link=document.createElement('a');
      link.dataset.social=item.id;
      link.href=item.href;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent=item.label;
      link.setAttribute('aria-label',t('info.githubLabel'));
      return link;
    }
    const row=document.createElement('span');
    row.dataset.socialUnavailable=item.id;
    row.innerHTML=`<b>${item.label}</b><small>${t('info.unavailable')}</small>`;
    return row;
  }));
  document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.language===language)));
}

function toggleLanguageMenu(force){
  const options=$('.info-language-options'),trigger=$('[data-info-language-trigger]');
  const open=force??options.hidden;
  options.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));
}

$('[data-info-language-trigger]').addEventListener('click',event=>{event.stopPropagation();toggleLanguageMenu()});
document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',event=>{
  event.stopPropagation();
  setLanguage(button.dataset.language);
  renderInfoPage();
  toggleLanguageMenu(false);
}));
document.addEventListener('click',event=>{if(!event.target.closest('[data-info-language]'))toggleLanguageMenu(false)});
document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleLanguageMenu(false)});
renderInfoPage();
```

Do not add handlers for professional edition, feedback, report, or unavailable social items.

- [ ] **Step 5: Implement the responsive visual system**

Create `info.css` with these concrete layout rules:

- `body` uses the existing paper/ink/accent palette and has no gradient.
- `.info-page` is a three-row min-height `100svh` grid with a restrained inset manuscript border.
- `.info-main` uses two columns above 760px: title/status on the left and the seven-link navigation on the right.
- The right navigation uses stable rows with a page number, label, and arrow; active row uses ink background and paper text.
- The left background contains one subtle CSS circle and six horizontal hexagram lines; it must not overlap text.
- At `max-width:760px`, switch to one column, reduce the circle, and keep all controls at least 44px tall.
- At `max-width:390px`, allow titles to wrap and ensure `width:100%`, `min-width:0`, and `overflow-wrap:anywhere` where needed.
- `[dir=rtl]` mirrors text alignment and navigation arrows without reversing brand names.
- `@media(prefers-reduced-motion:reduce)` removes all transitions and decorative animation.

- [ ] **Step 6: Run page and syntax tests**

Run: `node test-info-pages.mjs && node --check info.js && node --check info-content.mjs`

Expected: all commands PASS.

- [ ] **Step 7: Commit the shared pages**

```bash
git add info.css info.js info-content.mjs support.html changelog.html pro.html disclaimer.html privacy.html feedback.html report.html test-info-pages.mjs
git commit -m "feat: add information and support pages"
```

---

### Task 3: Add Entry Points To Existing User Flows

**Files:**
- Modify: `index.html`
- Modify: `auth.html`
- Modify: `landing-v2.css`
- Modify: `styles.css`
- Modify: `auth.css`
- Modify: `i18n.mjs`
- Modify: `test-landing.mjs`
- Modify: `test-auth-page.mjs`

**Interfaces:**
- Consumes: public `./support` path from Task 2.
- Produces: ordinary anchor navigation from cover, auth footer, desktop sidebar, and mobile More menu.
- Does not modify: `app.js` routing or authentication flow.

- [ ] **Step 1: Add failing entry-point assertions**

In `test-landing.mjs`, assert these distinct markers:

```js
assert.match(html,/class="cover-support-link"[^>]*href="\.\/support"/);
assert.match(html,/class="sidebar-support-link"[^>]*href="\.\/support"/);
assert.match(html,/class="nav-item muted-link mobile-support-link"[^>]*href="\.\/support"/);
assert.equal((html.match(/href="\.\/support"/g)||[]).length,3);
```

In `test-auth-page.mjs`, add:

```js
assert.match(html,/class="auth-support-link"[^>]*href="\.\/support"/);
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `node test-landing.mjs && node test-auth-page.mjs`

Expected: FAIL because the support links are absent.

- [ ] **Step 3: Add the cover and application links**

Modify `index.html`:

- Add `<a class="cover-support-link" href="./support" data-i18n="info.supportEntry">支持与关于</a>` inside `.cover-footer` without changing `#enterSite`.
- Add `<a class="sidebar-support-link" href="./support" data-i18n="info.support.title">支持中心</a>` inside `.sidebar-bottom` after `.quiet-card`.
- Add `<a class="nav-item muted-link mobile-support-link" href="./support"><span class="nav-icon" aria-hidden="true">?</span><span data-i18n="info.support.title">支持中心</span></a>` inside `#mobileMoreMenu`.

Anchors must not have `data-view`, so the existing SPA navigation handler does not intercept them.

- [ ] **Step 4: Add the account-page link**

Inside `.auth-footer`, add:

```html
<a class="auth-support-link" href="./support" data-i18n="info.support.title">支持中心</a>
```

Keep the existing footer text and ensure the link is visible at mobile widths where the secondary footer sentence is hidden.

- [ ] **Step 5: Style entries without changing the primary hierarchy**

- `landing-v2.css`: place `.cover-support-link` beside the quiet right-side caption on desktop and below the primary CTA on mobile; use small underlined text and never match `.cover-enter` size or color weight.
- `styles.css`: show `.sidebar-support-link` in `.sidebar-bottom` on desktop and hide `.mobile-support-link`; at `max-width:680px`, hide `.sidebar-support-link` with its parent and show `.mobile-support-link` in the More panel.
- `auth.css`: give `.auth-support-link` a 44px touch target on mobile while retaining the subdued footer treatment.

- [ ] **Step 6: Run targeted tests and browser cover regression**

Run: `node test-landing.mjs && node test-auth-page.mjs && node run-browser-test.mjs test-landing-browser.mjs`

Expected: static tests PASS; desktop and 390px cover remain within the viewport, the Enter button remains primary, and mobile has no horizontal overflow.

- [ ] **Step 7: Commit the entry points**

```bash
git add index.html auth.html landing-v2.css styles.css auth.css i18n.mjs test-landing.mjs test-auth-page.mjs
git commit -m "feat: link support pages from product flows"
```

---

### Task 4: Integrate Pages With Build, Clean Routes, And Offline Cache

**Files:**
- Modify: `build-pages.mjs`
- Modify: `service-worker.js`
- Modify: `test-service-worker-cache.mjs`
- Modify: `test-node-server.mjs`
- Modify: `test-info-pages.mjs`
- Modify: `test-landing.mjs`

**Interfaces:**
- Consumes: seven HTML files plus `info.css`, `info.js`, and `info-content.mjs`.
- Produces: the seven `dist/*.html` information documents and offline fallback from each clean route to its matching cached HTML.
- Produces: Service Worker cache `guanxiang-shell-v53`.

- [ ] **Step 1: Add failing build and cache assertions**

In `test-info-pages.mjs`, read `build-pages.mjs` and `service-worker.js` and assert every source file is listed:

```js
for(const file of [...expected.map(slug=>`${slug}.html`),'info.css','info.js','info-content.mjs']){
  assert.ok(buildSource.includes(`'${file}'`),`build is missing ${file}`);
  assert.ok(workerSource.includes(`'./${file}'`),`service worker is missing ${file}`);
}
```

Change `test-landing.mjs` and `test-auth-page.mjs` to expect `guanxiang-shell-v53`.

- [ ] **Step 2: Add route-specific offline tests**

Refactor the fake cache in `test-service-worker-cache.mjs` to record the value passed to `caches.match()`. After a network failure, send a navigation request for `https://example.com/privacy` and assert the final cache lookup is `./privacy.html`; repeat `/support` → `./support.html`, `/auth` → `./auth.html`, and `/unknown` → `./index.html`.

In `test-node-server.mjs`, create `support.html` in the temporary root, request `${origin}/support`, and assert the response body is the support document rather than `INDEX`.

- [ ] **Step 3: Run route tests and verify they fail**

Run: `node test-info-pages.mjs && node test-service-worker-cache.mjs && node test-node-server.mjs`

Expected: FAIL because build/cache registration and route-specific fallback are absent.

- [ ] **Step 4: Register build artifacts**

Add these files to `build-pages.mjs`:

```js
'support.html','changelog.html','pro.html','disclaimer.html','privacy.html','feedback.html','report.html',
'info.css','info.js','info-content.mjs',
```

Keep them in the same static copy pipeline; do not introduce a template engine or runtime server dependency.

- [ ] **Step 5: Implement deterministic offline navigation fallback**

Update the worker to `guanxiang-shell-v53`, add all ten files to `SHELL`, and define exact clean-path mapping:

```js
const STATIC_PAGE_FALLBACKS=new Map([
  ['/support','./support.html'],
  ['/changelog','./changelog.html'],
  ['/pro','./pro.html'],
  ['/disclaimer','./disclaimer.html'],
  ['/privacy','./privacy.html'],
  ['/feedback','./feedback.html'],
  ['/report','./report.html'],
]);

function navigationFallback(pathname){
  const normalized=pathname.length>1?pathname.replace(/\/$/,''):pathname;
  if(STATIC_PAGE_FALLBACKS.has(normalized))return STATIC_PAGE_FALLBACKS.get(normalized);
  if(normalized==='/auth'||normalized==='/auth.html')return './auth.html';
  return './index.html';
}
```

Use `navigationFallback(new URL(request.url).pathname)` only after both network and exact request cache lookup fail.

- [ ] **Step 6: Run route, cache, and build tests**

Run:

```bash
node test-info-pages.mjs
node test-service-worker-cache.mjs
node test-node-server.mjs
npm run build:pages
```

Expected: tests PASS and `dist` reports 45 production files (35 existing plus 10 new files).

- [ ] **Step 7: Commit build and offline support**

```bash
git add build-pages.mjs service-worker.js test-service-worker-cache.mjs test-node-server.mjs test-info-pages.mjs test-landing.mjs test-auth-page.mjs
git commit -m "feat: cache and build information pages"
```

---

### Task 5: Add Responsive Browser Coverage

**Files:**
- Create: `test-info-browser.mjs`
- Modify: `run-browser-test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: local `http://127.0.0.1:4175/support` and the shared CDP test helpers already used by `test-landing-browser.mjs`.
- Produces: automated desktop, 390px, 320px, English, Persian RTL, disabled-social, and GitHub-link acceptance checks.

- [ ] **Step 1: Permit and register the browser test**

Add `test-info-browser.mjs` to the allowlist in `run-browser-test.mjs`. Change `test:browser` in `package.json` to run both suites:

```json
"test:browser": "node run-browser-test.mjs && node run-browser-test.mjs test-info-browser.mjs"
```

- [ ] **Step 2: Write the browser acceptance test**

Create `test-info-browser.mjs` using the same CDP connection, `evaluate`, `waitFor`, and viewport helpers as `test-landing-browser.mjs`. It must perform these exact checks:

```js
await setViewport(1440,900,false);
await navigate('/support');
assert.equal(await evaluate(`document.body.dataset.infoPage`),'support');
assert.equal(await evaluate(`document.querySelectorAll('[data-info-nav] a').length`),7);
assert.equal(await evaluate(`document.querySelector('[aria-current="page"]')?.getAttribute('href')`),'./support');
assert.equal(await evaluate(`document.querySelector('[data-social="github"]')?.href`),'https://github.com/xiguajiushiwo/guanxiang-zhouyi');
assert.equal(await evaluate(`document.querySelectorAll('[data-social-unavailable]').length`),3);

await setViewport(390,844,true);
await navigate('/privacy');
assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);

await setViewport(320,700,true);
await navigate('/feedback');
assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);

await evaluate(`document.querySelector('[data-info-language-trigger]').click();document.querySelector('[data-language="fa"]').click();true`);
await waitFor(`document.documentElement.lang==='fa'&&document.documentElement.dir==='rtl'`);
assert.equal(await evaluate(`document.querySelector('[data-info-title]').textContent.length>0`),true);

await evaluate(`document.querySelector('[data-info-language-trigger]').click();document.querySelector('[data-language="en"]').click();true`);
await waitFor(`document.documentElement.lang==='en'&&document.documentElement.dir==='ltr'`);
assert.equal(await evaluate(`document.title.includes('Feedback')`),true);
```

Also capture `output/playwright/info-desktop.png` and `output/playwright/info-mobile.png` for visual review. Verify each visible navigation row and language control has a bounding height of at least 44px at 390px.

- [ ] **Step 3: Run the browser test and fix only acceptance failures**

Run: `node run-browser-test.mjs test-info-browser.mjs`

Expected: PASS with no overflow, correct RTL/LTR state, one live GitHub link, and three unavailable social rows.

- [ ] **Step 4: Visually inspect both screenshots**

Open `output/playwright/info-desktop.png` and `output/playwright/info-mobile.png`. Confirm the circle and hexagram decoration do not cover titles, the active navigation row is obvious, page titles wrap naturally at 320px, and the composition does not read as an empty card floating in space. If any issue is present, adjust only `info.css` and rerun Step 3.

- [ ] **Step 5: Commit browser coverage**

```bash
git add test-info-browser.mjs run-browser-test.mjs package.json info.css
git commit -m "test: cover information pages in browser"
```

---

### Task 6: Full Regression, Production Build, And Branch Handoff

**Files:**
- Verify: all files modified in Tasks 1–5
- Generated only: `dist/`

**Interfaces:**
- Produces: a tested branch commit suitable for user review.
- Does not produce: a Cloudflare deployment.

- [ ] **Step 1: Run full validation**

Run: `npm run validate`

Expected: content validation, i18n validation, syntax checks, and all unit tests PASS. Existing i18n warnings may remain only if they were already present before this feature; no new information-page warning is allowed.

- [ ] **Step 2: Run all browser tests**

Run: `npm run test:browser`

Expected: existing divination/browser flow and new information-page suite both PASS.

- [ ] **Step 3: Build and inspect production output**

Run: `npm run build:pages`

Verify all of these exist:

```text
dist/support.html
dist/changelog.html
dist/pro.html
dist/disclaimer.html
dist/privacy.html
dist/feedback.html
dist/report.html
dist/info.css
dist/info.js
dist/info-content.mjs
```

- [ ] **Step 4: Run production clean-route smoke checks**

Start the production server on an unused local port and request `/support`, `/privacy`, and `/report`. Each response must have `Content-Type: text/html`, contain its own `data-info-page` value, and must not contain `id="siteCover"`.

- [ ] **Step 5: Check the final diff**

Run:

```bash
git diff --check
git status --short --branch
git diff --stat origin/codex/liuyao-complete...HEAD
```

Expected: no whitespace errors, no unexpected generated files staged, and only the information-page implementation and tests differ.

- [ ] **Step 6: Commit any final test-only correction**

If Step 1–5 required a correction, commit only that correction:

```bash
git add info-content.mjs info.js info.css support.html changelog.html pro.html disclaimer.html privacy.html feedback.html report.html index.html auth.html landing-v2.css styles.css auth.css i18n.mjs build-pages.mjs service-worker.js package.json run-browser-test.mjs test-info-pages.mjs test-info-browser.mjs test-service-worker-cache.mjs test-node-server.mjs test-landing.mjs test-auth-page.mjs
git commit -m "fix: complete information page integration"
```

If no correction was required, do not create an empty commit.

- [ ] **Step 7: Push the feature branch**

Run: `git push origin codex/liuyao-complete`

Expected: the remote branch advances to the local HEAD. Report the local preview URL and explicitly state that Cloudflare was not deployed.
