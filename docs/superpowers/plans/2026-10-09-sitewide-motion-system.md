# Sitewide Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fast, direction-aware transitions across Guanxiang's cover, account flow, application views, detail views, dialogs, menus, and information pages without changing routes or business behavior.

**Architecture:** A focused `page-transition.mjs` module owns capability detection, motion preference, duplicate-transition locking, same-document View Transition wrapping, and cross-document navigation. A shared `page-transition.css` defines native and fallback motion; existing application modules only identify a transition as `peer`, `forward`, `back`, or `page` and keep all business rendering in their current functions.

**Tech Stack:** Browser View Transition API, CSS animations/transforms, ES modules, Node.js assertion tests, existing CDP browser harness.

**Spec:** `docs/superpowers/specs/2026-10-09-sitewide-motion-system-design.md`

## Global Constraints

- Ordinary page transitions must finish within `240–320ms`; menus and dialogs within `160–220ms`.
- Preserve the existing `1100ms` cover-to-auth ritual animation.
- Animate only `opacity` and `transform`; do not animate layout dimensions, margins, positions, or large shadows.
- `prefers-reduced-motion: reduce` must remove animation and artificial navigation delay.
- Search, typing, casting steps, data loading, account requests, URLs, storage, D1 APIs, and divination algorithms must retain current behavior.
- Same-origin navigation must still work as plain links when JavaScript or View Transition support is absent.
- External links, modified clicks, downloads, `_blank` links, and same-page anchors must keep browser-default behavior.
- Do not deploy Cloudflare as part of this plan.

---

### Task 1: Shared Transition Controller

**Files:**
- Create: `page-transition.mjs`
- Create: `test-page-transition.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `MOTION_TIMINGS` with `peerOut`, `peerIn`, `detail`, `crossExit`, and `crossEnter` millisecond values.
- Produces: `prefersReducedMotion(matchMediaFn?) -> boolean`.
- Produces: `supportsCrossDocumentTransitions(windowRef?) -> boolean` based on `CSSViewTransitionRule`.
- Produces: `shouldInterceptLink(event, anchor, currentUrl?) -> boolean`.
- Produces: `runViewTransition(update, { kind, root, documentRef, matchMediaFn, waitFn }) -> Promise<void>`.
- Produces: `navigateWithTransition(url, { skipExit, documentRef, locationRef, matchMediaFn, waitFn, windowRef }) -> Promise<void>`.
- Produces: `installPageTransitions({ documentRef, windowRef, locationRef, matchMediaFn, waitFn }) -> () => void` cleanup function.
- Consumes: no project business state.

- [ ] **Step 1: Write failing unit tests for link filtering and reduced motion**

Create `test-page-transition.mjs` with explicit fake anchors/events and assertions:

```js
import assert from 'node:assert/strict';
import {
  MOTION_TIMINGS,
  prefersReducedMotion,
  shouldInterceptLink,
  runViewTransition,
  navigateWithTransition,
  supportsCrossDocumentTransitions,
} from './page-transition.mjs';

const anchor=(href,extra={})=>({
  href,
  target:'',
  download:'',
  origin:'http://127.0.0.1:4175',
  pathname:new URL(href,'http://127.0.0.1:4175').pathname,
  search:new URL(href,'http://127.0.0.1:4175').search,
  hash:new URL(href,'http://127.0.0.1:4175').hash,
  ...extra,
});
const click={button:0,defaultPrevented:false,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false};

assert.equal(MOTION_TIMINGS.peerIn,280);
assert.equal(prefersReducedMotion(()=>({matches:true})),true);
assert.equal(supportsCrossDocumentTransitions({CSSViewTransitionRule:class {}}),true);
assert.equal(supportsCrossDocumentTransitions({}),false);
assert.equal(shouldInterceptLink(click,anchor('/support'),'http://127.0.0.1:4175/'),true);
assert.equal(shouldInterceptLink({...click,ctrlKey:true},anchor('/support'),'http://127.0.0.1:4175/'),false);
assert.equal(shouldInterceptLink(click,anchor('https://github.com/xiguajiushiwo/guanxiang-zhouyi'),'http://127.0.0.1:4175/'),false);
assert.equal(shouldInterceptLink(click,anchor('/support',{target:'_blank'}),'http://127.0.0.1:4175/'),false);
assert.equal(shouldInterceptLink(click,anchor('/manual.pdf',{download:'manual.pdf'}),'http://127.0.0.1:4175/'),false);
assert.equal(shouldInterceptLink(click,anchor('/#home'),'http://127.0.0.1:4175/#history'),false);
```

- [ ] **Step 2: Run the unit test and verify the missing module failure**

Run: `node test-page-transition.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `page-transition.mjs`.

- [ ] **Step 3: Implement constants, link filtering, and capability helpers**

Create `page-transition.mjs` with these public values and filtering rules:

```js
export const MOTION_TIMINGS=Object.freeze({
  peerOut:180,
  peerIn:280,
  detail:280,
  crossExit:180,
  crossEnter:220,
});

export function prefersReducedMotion(matchMediaFn=globalThis.matchMedia){
  return Boolean(matchMediaFn?.('(prefers-reduced-motion: reduce)').matches);
}

export function supportsCrossDocumentTransitions(windowRef=globalThis){
  return typeof windowRef?.CSSViewTransitionRule==='function';
}

export function shouldInterceptLink(event,anchor,currentUrl=globalThis.location?.href){
  if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return false;
  if(anchor.target&&anchor.target!=='_self'||anchor.download)return false;
  const current=new URL(currentUrl),target=new URL(anchor.href,current);
  if(!['http:','https:'].includes(target.protocol)||target.origin!==current.origin)return false;
  return !(target.pathname===current.pathname&&target.search===current.search&&target.hash);
}
```

- [ ] **Step 4: Add failing tests for native, fallback, reduced, and navigation paths**

Append tests that use a fake root with `classList` and `dataset`:

```js
function fakeRoot(){
  const values=new Set();
  return {
    dataset:{},
    classList:{add:(...items)=>items.forEach(item=>values.add(item)),remove:(...items)=>items.forEach(item=>values.delete(item)),contains:item=>values.has(item)},
  };
}

{
  const root=fakeRoot();let updated=0,nativeCalls=0;
  const documentRef={startViewTransition(update){nativeCalls+=1;update();return {finished:Promise.resolve()}}};
  await runViewTransition(()=>{updated+=1},{kind:'peer',root,documentRef,matchMediaFn:()=>({matches:false})});
  assert.equal(nativeCalls,1);assert.equal(updated,1);assert.equal(root.dataset.transition,undefined);
}
{
  const root=fakeRoot();let updated=0;
  await runViewTransition(()=>{updated+=1},{kind:'forward',root,documentRef:{},matchMediaFn:()=>({matches:false}),waitFn:()=>Promise.resolve()});
  assert.equal(updated,1);assert.equal(root.classList.contains('transition-fallback'),false);
}
{
  let assigned='',waited=0;
  await navigateWithTransition('/auth',{documentRef:{documentElement:fakeRoot()},locationRef:{assign:value=>{assigned=value}},windowRef:{},matchMediaFn:()=>({matches:true}),waitFn:async()=>{waited+=1}});
  assert.equal(assigned,'/auth');assert.equal(waited,0);
}
```

- [ ] **Step 5: Implement same-document transitions and cross-document navigation**

Use `try/finally` to guarantee cleanup. Native same-document transitions wrap `update`; CSS fallback applies an out class, waits `peerOut`, runs `update`, swaps to an in class, waits `peerIn`, then removes all state. `navigateWithTransition` assigns immediately when reduced motion, `skipExit`, or `supportsCrossDocumentTransitions(windowRef)` is true; the declarative `@view-transition` rule then handles native cross-document animation. Otherwise it adds `.page-is-leaving`, waits `crossExit`, and assigns the URL. Use a module-level boolean lock and clear it on errors/pageshow.

Core shape:

```js
let transitionPending=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function runViewTransition(update,{kind='peer',root=globalThis.document?.documentElement,documentRef=globalThis.document,matchMediaFn=globalThis.matchMedia,waitFn=wait}={}){
  if(transitionPending||prefersReducedMotion(matchMediaFn)){update();return}
  transitionPending=true;root.dataset.transition=kind;
  try{
    if(typeof documentRef?.startViewTransition==='function'){
      await documentRef.startViewTransition(update).finished;
    }else{
      root.classList.add('transition-fallback','transition-fallback-out');
      await waitFn(MOTION_TIMINGS.peerOut);update();
      root.classList.remove('transition-fallback-out');root.classList.add('transition-fallback-in');
      await waitFn(MOTION_TIMINGS.peerIn);
    }
  }finally{
    root.classList.remove('transition-fallback','transition-fallback-out','transition-fallback-in');
    delete root.dataset.transition;transitionPending=false;
  }
}
```

`installPageTransitions` must register one capturing `click` listener, call `preventDefault()` only for accepted links, and call `navigateWithTransition(anchor.href)`. Add `.page-is-entering` on initial load only when native cross-document transition support is absent, remove it after `crossEnter`, and reset all classes on `pageshow`. Return a cleanup function removing both listeners.

- [ ] **Step 6: Run the focused tests**

Run: `node test-page-transition.mjs`

Expected: PASS and print `Page transition controller tests passed.`

- [ ] **Step 7: Add the test to the unit suite and commit**

Modify `package.json` so `test:unit` runs `node test-page-transition.mjs` immediately after `test-service-worker-cache.mjs`.

Run: `npm run test:unit`

Expected: all unit tests pass.

Commit:

```bash
git add page-transition.mjs test-page-transition.mjs package.json
git commit -m "feat: add shared page transition controller"
```

### Task 2: Shared Motion CSS and Static Delivery

**Files:**
- Create: `page-transition.css`
- Modify: `index.html`
- Modify: `auth.html`
- Modify: `support.html`
- Modify: `changelog.html`
- Modify: `pro.html`
- Modify: `disclaimer.html`
- Modify: `privacy.html`
- Modify: `feedback.html`
- Modify: `report.html`
- Modify: `build-pages.mjs`
- Modify: `service-worker.js`
- Modify: `test-service-worker-cache.mjs`
- Modify: `test-landing.mjs`
- Modify: `test-auth-page.mjs`
- Modify: `test-info-pages.mjs`

**Interfaces:**
- Consumes: transition state classes and `data-transition` from Task 1.
- Produces: shared native/fallback animations for root and `[data-transition-scope]`.

- [ ] **Step 1: Extend static tests before adding assets**

Add assertions to the existing three page tests and cache test:

```js
assert.match(html,/href="\.\/page-transition\.css/);
assert.ok(buildSource.includes("'page-transition.css'"));
assert.ok(buildSource.includes("'page-transition.mjs'"));
assert.ok(workerSource.includes("'./page-transition.css'"));
assert.ok(workerSource.includes("'./page-transition.mjs'"));
```

Update expected cache name from `guanxiang-shell-v56` to `guanxiang-shell-v57` in all tests that pin it.

- [ ] **Step 2: Run static tests and verify failure**

Run: `node test-landing.mjs && node test-auth-page.mjs && node test-info-pages.mjs && node test-service-worker-cache.mjs`

Expected: FAIL because the shared CSS/module are absent from pages, build, and cache.

- [ ] **Step 3: Create the shared stylesheet**

Create `page-transition.css` with native cross-document opt-in, named scope animations, and CSS fallback:

```css
@view-transition{navigation:auto}
::view-transition-old(root){animation:gx-page-out 180ms ease both}
::view-transition-new(root){animation:gx-page-in 220ms cubic-bezier(.22,.75,.25,1) both}
[data-transition-scope]{view-transition-name:gx-content}
::view-transition-old(gx-content),::view-transition-new(gx-content){mix-blend-mode:normal}
[data-transition=peer]::view-transition-old(gx-content){animation:gx-peer-out 180ms ease both}
[data-transition=peer]::view-transition-new(gx-content){animation:gx-peer-in 280ms cubic-bezier(.22,.75,.25,1) both}
[data-transition=forward]::view-transition-old(gx-content){animation:gx-forward-out 260ms ease both}
[data-transition=forward]::view-transition-new(gx-content){animation:gx-forward-in 280ms cubic-bezier(.22,.75,.25,1) both}
[data-transition=back]::view-transition-old(gx-content){animation:gx-back-out 260ms ease both}
[data-transition=back]::view-transition-new(gx-content){animation:gx-back-in 280ms cubic-bezier(.22,.75,.25,1) both}
.page-is-leaving body{animation:gx-page-out 180ms ease both;pointer-events:none}
.page-is-entering body{animation:gx-page-in 220ms cubic-bezier(.22,.75,.25,1) both}
.transition-fallback-out [data-transition-scope]{animation:gx-peer-out 180ms ease both}
.transition-fallback-in [data-transition-scope]{animation:gx-peer-in 280ms cubic-bezier(.22,.75,.25,1) both}
[data-transition=forward].transition-fallback-out [data-transition-scope]{animation-name:gx-forward-out}
[data-transition=forward].transition-fallback-in [data-transition-scope]{animation-name:gx-forward-in}
[data-transition=back].transition-fallback-out [data-transition-scope]{animation-name:gx-back-out}
[data-transition=back].transition-fallback-in [data-transition-scope]{animation-name:gx-back-in}
@keyframes gx-page-out{to{opacity:0;transform:scale(.995)}}
@keyframes gx-page-in{from{opacity:0;transform:translateY(6px)}}
@keyframes gx-peer-out{to{opacity:0;transform:scale(.992)}}
@keyframes gx-peer-in{from{opacity:0;transform:translateY(8px)}}
@keyframes gx-forward-out{to{opacity:0;transform:translateX(-12px)}}
@keyframes gx-forward-in{from{opacity:0;transform:translateX(16px)}}
@keyframes gx-back-out{to{opacity:0;transform:translateX(12px)}}
@keyframes gx-back-in{from{opacity:0;transform:translateX(-16px)}}
@media(prefers-reduced-motion:reduce){
  ::view-transition-old(root),::view-transition-new(root),::view-transition-old(gx-content),::view-transition-new(gx-content),.page-is-leaving body,.page-is-entering body,.transition-fallback-out [data-transition-scope],.transition-fallback-in [data-transition-scope]{animation-duration:.001ms!important;animation-delay:0ms!important}
}
```

- [ ] **Step 4: Load and ship the shared assets**

Add `<link rel="stylesheet" href="./page-transition.css?v=20261009-motion1" />` after each page's primary stylesheet. Add `data-transition-scope` to `.main-content` in `index.html`, `.auth-main` in `auth.html`, and `.info-main` in all seven information pages.

Add `'page-transition.css'` and `'page-transition.mjs'` to `build-pages.mjs`. Add both to `SHELL` and bump `CACHE_NAME` to `guanxiang-shell-v57` in `service-worker.js`.

- [ ] **Step 5: Verify focused static delivery**

Run:

```bash
node test-landing.mjs
node test-auth-page.mjs
node test-info-pages.mjs
node test-service-worker-cache.mjs
npm run build:pages
```

Expected: all checks pass and `dist/page-transition.css` plus `dist/page-transition.mjs` exist.

- [ ] **Step 6: Commit**

```bash
git add page-transition.css index.html auth.html support.html changelog.html pro.html disclaimer.html privacy.html feedback.html report.html build-pages.mjs service-worker.js test-service-worker-cache.mjs test-landing.mjs test-auth-page.mjs test-info-pages.mjs
git commit -m "feat: add shared page transition styles"
```

### Task 3: Cross-Document Page Integration

**Files:**
- Modify: `app.js`
- Modify: `auth.js`
- Modify: `info.js`
- Modify: `test-landing.mjs`
- Modify: `test-auth-page.mjs`
- Modify: `test-info-pages.mjs`
- Modify: `test-landing-browser.mjs`
- Modify: `test-info-browser.mjs`

**Interfaces:**
- Consumes: `installPageTransitions()` and `navigateWithTransition()` from Task 1.
- Produces: animated same-origin navigation across cover, auth, app entry, and information pages.

- [ ] **Step 1: Add failing integration assertions**

Require imports and initialization in existing static tests:

```js
assert.match(script,/import \{[^}]*installPageTransitions[^}]*\} from '\.\/page-transition\.mjs'/);
assert.match(script,/installPageTransitions\(\)/);
```

For `app.js`, also require the completed cover animation to call `navigateWithTransition(href,{skipExit:true})` instead of `location.assign(href)`. For `auth.js`, require `enterApp()` to call `navigateWithTransition(APP_ENTRY)`.

- [ ] **Step 2: Run integration tests and verify failure**

Run: `node test-landing.mjs && node test-auth-page.mjs && node test-info-pages.mjs`

Expected: FAIL because no application module imports the transition controller.

- [ ] **Step 3: Integrate the cover and main app**

At the top of `app.js`, import the shared functions. Call `installPageTransitions()` once during existing initialization. Keep the current `1100ms` cover exit exactly as implemented, then replace direct assignment:

```js
await navigateWithTransition(href,{skipExit:true});
```

This prevents a second `180ms` fade after the ritual animation.

- [ ] **Step 4: Integrate authentication navigation only after success**

In `auth.js`, import and initialize the module. Change:

```js
function enterApp(){
  setAccountMode('account');
  return navigateWithTransition(APP_ENTRY);
}
```

Keep `submit()` calling `enterApp()` only after successful login/registration. For the guest link, keep `setAccountMode('guest')`; the installed link interceptor handles its existing `href` navigation. Do not start a transition while the network request is pending or after an error.

- [ ] **Step 5: Integrate information pages**

In `info.js`, import `installPageTransitions` and call it before binding language controls. GitHub remains `_blank` and therefore bypasses interception; the seven same-origin footer links use the shared transition.

- [ ] **Step 6: Extend browser checks for cross-page state cleanup**

In `test-landing-browser.mjs`, after auth loads assert that neither `.page-is-leaving` nor `.page-is-entering` remains after `350ms`. Preserve the existing assertion that `.app-shell` never flashes on auth.

In `test-info-browser.mjs`, click the privacy footer link from support, wait for `/privacy`, then assert:

```js
const transitionState=await evaluate(`({
  path:location.pathname,
  leaving:document.documentElement.classList.contains('page-is-leaving'),
  overflow:document.documentElement.scrollWidth>innerWidth
})`);
assert.deepEqual(transitionState,{path:'/privacy',leaving:false,overflow:false});
```

- [ ] **Step 7: Run cross-document browser tests**

Run:

```bash
node run-browser-test.mjs test-landing-browser.mjs
node run-browser-test.mjs test-info-browser.mjs
```

Expected: cover, auth, guest entry, information navigation, mobile layout, and three languages pass.

- [ ] **Step 8: Commit**

```bash
git add app.js auth.js info.js test-landing.mjs test-auth-page.mjs test-info-pages.mjs test-landing-browser.mjs test-info-browser.mjs
git commit -m "feat: animate cross-page navigation"
```

### Task 4: Main Application Peer Transitions

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `test-landing.mjs`
- Modify: `smoke-browser.mjs`

**Interfaces:**
- Consumes: `runViewTransition(update,{kind:'peer',root,documentRef})` from Task 1.
- Produces: `updateViewState(view, updateRoute)`, a synchronous function containing the current `nav()` DOM and history mutations.
- Produces: `nav(view, updateRoute=true, motionKind='peer')`, which wraps only genuine view changes.

- [ ] **Step 1: Add failing structural tests for the route wrapper**

In `test-landing.mjs` assert:

```js
assert.match(script,/function updateViewState\(view,updateRoute=true\)/);
assert.match(script,/function nav\(view,updateRoute=true,motionKind='peer'\)/);
assert.match(script,/runViewTransition\(\(\)=>updateViewState\(view,updateRoute\)/);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node test-landing.mjs`

Expected: FAIL because `nav()` still performs direct class toggles.

- [ ] **Step 3: Separate synchronous view rendering from transition orchestration**

Refactor the current body of `nav()` into `updateViewState()` without changing selectors, route values, breadcrumb copy, or scroll behavior. Implement `nav()` so repeated selection of the active view updates synchronously, while a genuine peer change uses the shared controller:

```js
function nav(view,updateRoute=true,motionKind='peer'){
  if(view===currentView){updateViewState(view,updateRoute);return}
  currentView=view;
  void runViewTransition(()=>updateViewState(view,updateRoute),{
    kind:motionKind,
    root:document.documentElement,
  });
}
```

Set `currentView` inside `nav()` before `updateViewState`, and remove its assignment from `updateViewState`. Ensure initial `applyRoute()` bypasses motion with a module-level `routeInitialized` flag so first paint is immediate.

- [ ] **Step 4: Keep fixed navigation out of the content snapshot**

Ensure only `.main-content` carries `data-transition-scope`; do not name `.sidebar`, `.topbar`, or mobile bottom navigation. Add containment that does not change layout:

```css
.main-content[data-transition-scope]{view-transition-name:gx-content}
```

- [ ] **Step 5: Add browser assertions for peer transitions**

In `smoke-browser.mjs`, trigger the hexagrams nav item and observe `document.documentElement.dataset.transition` immediately. Assert it equals `peer`, then wait until it is removed and assert `#view-hexagrams.active` plus no horizontal overflow at desktop and `320px`.

- [ ] **Step 6: Run focused and full app browser tests**

Run:

```bash
node test-landing.mjs
node run-browser-test.mjs
```

Expected: peer state appears during navigation, clears after completion, and all existing casting/history assertions pass.

- [ ] **Step 7: Commit**

```bash
git add app.js styles.css test-landing.mjs smoke-browser.mjs
git commit -m "feat: animate application view changes"
```

### Task 5: Directional Detail Views and Micro-Interactions

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `auth.css`
- Modify: `info.css`
- Modify: `auth.js`
- Modify: `smoke-browser.mjs`
- Modify: `test-auth-page.mjs`
- Modify: `test-info-pages.mjs`

**Interfaces:**
- Consumes: `runViewTransition()` from Task 1.
- Produces: forward/back motion for history and mobile hexagram master-detail changes.
- Produces: CSS-only dialog/menu motion with no route or state changes.

- [ ] **Step 1: Add failing static assertions for directional handlers and micro-motion**

Assert `app.js` contains `transitionHistory('forward'`, `transitionHistory('back'`, `transitionHexDetail('forward'`, and `transitionHexDetail('back'`. Assert styles include `transition-behavior:allow-discrete`, `@starting-style`, `.auth-language-options:not([hidden])`, and `.info-language-options:not([hidden])`. Assert `auth.js` wraps login/register mode rendering in `runViewTransition`.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node test-landing.mjs && node test-auth-page.mjs && node test-info-pages.mjs`

Expected: FAIL on missing directional helpers and keyframes.

- [ ] **Step 3: Wrap history list/detail rendering with direction**

Add:

```js
function transitionHistory(kind,update){
  return runViewTransition(update,{kind,root:document.documentElement});
}
```

For a history item click, set the ID, update the hash, and call `renderHistory()` inside `transitionHistory('forward',...)`. For `[data-history-back]`, clear the ID, replace the hash, render, and scroll inside `transitionHistory('back',...)`. Save the opening item ID before forward navigation and restore focus to `[data-history-id="..."] .history-item-open` after the back transition finishes.

- [ ] **Step 4: Wrap mobile hexagram master/detail rendering with direction**

Add `transitionHexDetail(kind,update)` with the same controller. On `.hex-row` click at `innerWidth<=680`, perform `setMobileDetail`, list selection, and detail rendering inside a `forward` transition. On `[data-mobile-back="hexagrams"]`, close the detail and replace the hash inside a `back` transition, then restore focus to the selected `.hex-row`. Desktop row selection continues to update in place without directional motion.

- [ ] **Step 5: Preserve direction during browser history navigation**

Track the previous parsed route shape (`history index`, `history detail`, `hex list`, `hex detail`, or peer view). In `applyRoute()`, choose `back` when a detail value disappears and `forward` when it appears. Other hash changes remain `peer`. Initial route rendering remains immediate.

- [ ] **Step 6: Add auth mode, dialog, and menu motion**

Import `runViewTransition` in `auth.js`. Replace the auth-mode click callback with:

```js
document.querySelectorAll('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.authMode===mode)return;
  void runViewTransition(()=>{
    mode=button.dataset.authMode;
    render();
  },{kind:'peer',root:document.documentElement});
  $('#authForm').elements.email.focus();
}));
```

Add to the relevant stylesheets. The discrete `display`/`overlay` transitions provide a closing animation in supporting browsers; older browsers close immediately without breaking behavior:

```css
@keyframes menu-enter{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
.confirm-dialog,.onboarding-dialog{opacity:0;transform:translate(-50%,-48%) scale(.98);transition:opacity 200ms ease,transform 210ms cubic-bezier(.22,.75,.25,1),overlay 210ms allow-discrete,display 210ms allow-discrete;transition-behavior:allow-discrete}
.confirm-dialog[open],.onboarding-dialog[open]{opacity:1;transform:translate(-50%,-50%) scale(1)}
.confirm-dialog::backdrop,.onboarding-dialog::backdrop{opacity:0;transition:opacity 180ms ease,overlay 210ms allow-discrete,display 210ms allow-discrete;transition-behavior:allow-discrete}
.confirm-dialog[open]::backdrop,.onboarding-dialog[open]::backdrop{opacity:1}
@starting-style{
  .confirm-dialog[open],.onboarding-dialog[open]{opacity:0;transform:translate(-50%,-48%) scale(.98)}
  .confirm-dialog[open]::backdrop,.onboarding-dialog[open]::backdrop{opacity:0}
}
.auth-language-options:not([hidden]),.info-language-options:not([hidden]){animation:menu-enter 180ms cubic-bezier(.22,.75,.25,1) both}
```

The existing application dialogs are centered with `translate(-50%,-50%)`; preserve that positioning in both states. Extend the existing reduced-motion blocks so these transitions and menu animations become `.001ms`.

- [ ] **Step 7: Extend browser tests for direction and focus**

In `smoke-browser.mjs`:

- open a history record and assert transition state `forward`;
- use the detail back button and assert transition state `back`;
- after completion assert focus is on the original history item;
- at `320px`, open a hexagram detail and assert `forward`, return and assert `back` plus focus on the selected row;
- assert no transition classes or `data-transition` remain after each completion.

- [ ] **Step 8: Run focused browser regression**

Run: `node run-browser-test.mjs`

Expected: history, hexagram mobile detail, casting result, note saving, imports/exports, and responsive checks pass.

- [ ] **Step 9: Commit**

```bash
git add app.js auth.js styles.css auth.css info.css smoke-browser.mjs test-auth-page.mjs test-info-pages.mjs
git commit -m "feat: add directional detail transitions"
```

### Task 6: Fallback, Reduced Motion, and Final Validation

**Files:**
- Modify: `test-page-transition.mjs`
- Modify: `test-landing-browser.mjs`
- Modify: `test-info-browser.mjs`
- Modify: `run-browser-test.mjs` only if a new explicit browser test filename is added

**Interfaces:**
- Consumes: all transition behavior from Tasks 1–5.
- Produces: final evidence that native, fallback, reduced-motion, desktop, mobile, RTL, and business workflows remain correct.

- [ ] **Step 1: Complete controller edge-case tests**

Add explicit assertions that:

- a rejected native `finished` promise still removes `data-transition` and unlocks the controller;
- two immediate calls execute one animated transition without losing the second update (the second update runs synchronously);
- `pageshow` removes `page-is-leaving`, `page-is-entering`, and fallback classes;
- the cleanup returned by `installPageTransitions()` removes click and pageshow listeners;
- `skipExit:true` performs one immediate assignment without calling `waitFn`.

- [ ] **Step 2: Add browser fallback coverage**

Before page scripts load, shadow `Document.prototype.startViewTransition` as `undefined` in one browser pass. Click between application views and information pages; assert `.transition-fallback-out` or `.page-is-leaving` becomes visible, navigation completes, and all classes clear.

- [ ] **Step 3: Add reduced-motion timing coverage**

Use `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`. Measure peer view and information-page navigation. Assert there is no artificial `180ms` wait and no persistent animation class; preserve the existing immediate cover-to-auth reduced-motion assertion.

- [ ] **Step 4: Run full validation**

Run:

```bash
npm run validate
npm run test:browser
npm run build:pages
git -c safe.directory=C:/workspace/zhouyi diff --check
```

Expected: every command exits `0`; build reports all production assets; no whitespace errors.

- [ ] **Step 5: Visually inspect four screenshots**

Capture and inspect:

- desktop peer transition at `1440x900`;
- history forward transition at `1440x900`;
- mobile hex detail transition at `390x844`;
- Persian information-page transition at `320x700`.

Reject the build if text overlaps, a fixed navigation element moves with the content, the page flashes white, or any screenshot has horizontal overflow.

- [ ] **Step 6: Commit final test adjustments**

```bash
git add test-page-transition.mjs test-landing-browser.mjs test-info-browser.mjs run-browser-test.mjs
git commit -m "test: cover sitewide page transitions"
```

- [ ] **Step 7: Start local preview and report repository state**

Run `node serve.mjs` on port `4175` if it is not already listening. Open:

```text
http://127.0.0.1:4175/?v=20261009-motion1
```

Report the final commit IDs and whether `git status --short --branch` is synchronized with `origin/codex/liuyao-complete`. If GitHub is unreachable, keep the local commits and state clearly that push is pending. Do not deploy Cloudflare.
