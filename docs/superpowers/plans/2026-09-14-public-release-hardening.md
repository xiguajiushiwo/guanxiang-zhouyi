# Public Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public Zhouyi application resistant to stored HTML injection, cache only structurally complete AI readings, enforce Cloudflare request limits atomically, and activate offline updates through an explicit user action.

**Architecture:** Browser rendering receives a focused escaping module and validates AI completion before persistence. The Cloudflare Worker delegates both counters to one SQLite-backed Durable Object whose single stored state is updated transactionally. Service Worker activation is isolated in a small testable helper while the existing application notice provides the user-controlled action.

**Tech Stack:** Browser ES modules, Node.js built-in test assertions, Cloudflare Workers AI, Cloudflare SQLite Durable Objects, Service Worker API.

**Spec:** `docs/superpowers/specs/2026-09-14-public-release-hardening-design.md`

## Global Constraints

- Preserve the existing divination flow, local interpretation wording, and streamed rendering behavior.
- Do not generate placeholder content for the future manually curated 64-hexagram and 384-line library.
- Treat existing modifications to `index.html`, `service-worker.js`, `test-landing.mjs`, and landing assets as user-owned; merge with them and never overwrite or stage unrelated hunks.
- Keep Cloudflare credentials and `RATE_LIMIT_SALT` out of tracked files.
- Incomplete AI output stays visible but is not written to history.
- Missing or failed rate-limit infrastructure must fail closed before the Workers AI call.

---

### Task 1: Make User-Controlled HTML Inert

**Files:**
- Create: `html-safety.mjs`
- Create: `test-html-safety.mjs`
- Modify: `app.js:5-61,132-144`
- Modify: `storage.mjs:19-24`
- Modify: `study-storage.mjs:5-20`
- Modify: `test-storage.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `escapeHtml(value): string`, `textHtml(value): string`, and `attributeHtml(value): string` from `html-safety.mjs`.
- Consumes: annotation and history records from existing browser storage modules.

- [ ] **Step 1: Write failing escaping and validation tests**

Create `test-html-safety.mjs` with assertions equivalent to:

```js
import assert from 'node:assert/strict';
import { attributeHtml, escapeHtml, textHtml } from './html-safety.mjs';

assert.equal(escapeHtml(`<svg onload="x">'&`), '&lt;svg onload=&quot;x&quot;&gt;&#39;&amp;');
assert.equal(textHtml('甲\n乙'), '甲<br>乙');
assert.equal(attributeHtml('" onfocus="x\n'), '&quot; onfocus=&quot;x&#10;');
console.log('HTML safety tests passed.');
```

Extend `test-storage.mjs` to assert that history IDs longer than 120 characters are rejected, annotation IDs longer than 120 characters are rejected, and unsupported `reviewState` values normalize to `未开始`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node test-html-safety.mjs` and `node test-storage.mjs`

Expected: the new module is missing and the new validation assertions fail before implementation.

- [ ] **Step 3: Implement centralized escaping**

Create `html-safety.mjs` with a single character map:

```js
const ENTITIES = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ENTITIES[char]);
export const textHtml = value => escapeHtml(value).replace(/\r?\n/g, '<br>');
export const attributeHtml = value => escapeHtml(value).replace(/\r?\n/g, '&#10;');
```

Import `textHtml` and `attributeHtml` in `app.js` and remove the local partial escaping function. In annotation HTML, escape tags and review-state text with `textHtml`; escape `sourceType`, `sourceId`, annotation IDs, and history IDs with `attributeHtml`. Keep fixed application-owned strings unchanged.

Update `validHistoryRecord` so `record.id` must be non-empty and at most 120 characters. Update annotation validation so an optional ID must meet the same bound and `reviewState`, when present, must be one of `未开始`, `研读中`, or `已复习`. Normalize absent review state to `未开始`.

- [ ] **Step 4: Run focused and application unit tests**

Run: `node test-html-safety.mjs`, `node test-storage.mjs`, and `node --check app.js`

Expected: all commands exit zero.

- [ ] **Step 5: Commit only owned safety changes**

```powershell
git add html-safety.mjs test-html-safety.mjs app.js storage.mjs study-storage.mjs test-storage.mjs package.json
git commit -m "fix: make stored reading content inert"
```

Do not stage any pre-existing landing-page files.

---

### Task 2: Reject Incomplete AI Readings Before Caching

**Files:**
- Modify: `ai-reading.mjs`
- Modify: `test-ai-reading.mjs`
- Modify: `app.js:252-260`
- Modify: `smoke-browser.mjs`

**Interfaces:**
- Produces: `isCompleteAiReading(text): boolean` and error code `INCOMPLETE_RESPONSE`.
- Consumes: the existing plain-text stream returned by the Worker.

- [ ] **Step 1: Write failing completion tests**

Replace the short success fixture with a complete five-section reading:

```js
const complete = `【核心判断】
宜先观察。
【当前处境】
条件仍在形成。
【关键变化】
先核实转折条件。
【后续趋势】
后续倾向逐步展开。
【行动建议】
1. 核实事实
2. 小步验证
3. 按期复盘`;
```

Add assertions that reordered headings, an empty section, a missing section, duplicate headings, and fewer than three action lines all return false. Add a stream test proving a cleanly closed partial response rejects with `INCOMPLETE_RESPONSE` and preserves `partialText`.

- [ ] **Step 2: Run the AI test and verify failure**

Run: `node test-ai-reading.mjs`

Expected: `isCompleteAiReading` is missing or the incomplete stream resolves instead of rejecting.

- [ ] **Step 3: Implement structural completion validation**

Add `INCOMPLETE_RESPONSE: 'AI 解读未完整生成，已保留收到的内容，请重新尝试。'` to `AI_ERROR_MESSAGES`. Export `isCompleteAiReading(text)` and implement it by scanning exact heading lines, requiring the five names once in the specified order, requiring non-empty text in every section, and requiring three non-empty action lines after stripping `-`, `*`, `•`, or numeric list markers.

After the stream finishes and the decoder tail is appended, keep the existing empty response check, then throw:

```js
if (!isCompleteAiReading(complete)) {
  throw new AiReadingError('INCOMPLETE_RESPONSE', '', complete);
}
```

The existing `generateAiReading` catch path already displays `partialText` and skips `updateHistoryAiReading`; retain that behavior.

- [ ] **Step 4: Update the browser stream fixture**

Change the successful mock response in `smoke-browser.mjs` to stream all five sections and three actions across at least two delayed chunks. Keep the existing assertion that the first chunk appears before completion. Add a clean-close incomplete fixture and assert that it shows the new message and leaves `aiReading` absent from local history.

- [ ] **Step 5: Run focused tests**

Run: `node test-ai-reading.mjs` and `node --check app.js`

Expected: both commands exit zero.

- [ ] **Step 6: Commit the AI completeness change**

```powershell
git add ai-reading.mjs test-ai-reading.mjs app.js smoke-browser.mjs
git commit -m "fix: cache only complete AI readings"
```

---

### Task 3: Replace KV Limits With an Atomic Durable Object

**Files:**
- Create: `worker/src/rate-limiter.mjs`
- Modify: `worker/src/guards.mjs`
- Modify: `worker/src/index.mjs`
- Modify: `worker/test-worker.mjs`
- Modify: `worker/wrangler.jsonc.example`
- Modify: `worker/README.md`
- Modify: `DEPLOYMENT.md`

**Interfaces:**
- Produces: exported Durable Object class `ReadingRateLimiter` and `consumeLimits({ namespace, ip, salt, now, perIpLimit, dailyLimit }): Promise<{ok:boolean, code?:string}>`.
- Consumes: Cloudflare Durable Object namespace binding `RATE_LIMITER` and secret `RATE_LIMIT_SALT`.

- [ ] **Step 1: Write failing Durable Object tests**

Replace `MemoryKv` tests with a fake Durable Object storage whose `transaction(callback)` serializes callbacks. Instantiate `ReadingRateLimiter` over that storage and assert:

```js
const attempts = await Promise.all(Array.from({length: 12}, () => limiter.fetch(limitRequest)));
const bodies = await Promise.all(attempts.map(response => response.json()));
assert.equal(bodies.filter(body => body.ok).length, 5);
assert.equal(bodies.filter(body => body.code === 'RATE_LIMITED').length, 7);
```

Add a global limit test across distinct IP hashes, an hour/day rollover test, and a test proving rejected calls leave both stored counts unchanged. Update Worker integration environments to provide a fake `RATE_LIMITER` namespace and assert a missing namespace returns `SERVICE_ERROR` without invoking `AI.run`.

- [ ] **Step 2: Run Worker tests and verify failure**

Run: `node worker/test-worker.mjs`

Expected: the Durable Object class or namespace-based `consumeLimits` interface is missing.

- [ ] **Step 3: Implement the transactional limiter**

Create `worker/src/rate-limiter.mjs` exporting `ReadingRateLimiter`. Its `fetch` method accepts an internal JSON payload containing `hour`, `day`, `ipHash`, `perIpLimit`, and `dailyLimit`. Inside `state.storage.transaction`, load one `limit-state` record shaped as:

```js
{
  hour: '2026091408',
  perIp: { '<hourly hash>': 1 },
  day: '20260914',
  daily: 1
}
```

Reset `perIp` when `hour` changes and reset `daily` when `day` changes. Check both limits before incrementing. Write the record once only for accepted requests. Return JSON containing `{ok:true}` or `{ok:false,code:'RATE_LIMITED'|'DAILY_LIMIT_REACHED'}`.

Change `consumeLimits` in `guards.mjs` to hash the IP, resolve `namespace.idFromName('global')`, and call the stub with the bounded internal payload. Reject malformed limiter responses as service failures. In `index.mjs`, require `env.RATE_LIMITER`, export `ReadingRateLimiter`, and call Workers AI only after an accepted result.

- [ ] **Step 4: Update Wrangler configuration**

Remove `kv_namespaces` and add:

```jsonc
"durable_objects": {
  "bindings": [
    { "name": "RATE_LIMITER", "class_name": "ReadingRateLimiter" }
  ]
},
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["ReadingRateLimiter"] }
]
```

Keep `RATE_LIMIT_SALT` as a Wrangler secret. Keep the existing limits and model variables.

- [ ] **Step 5: Update deployment documentation**

Remove KV creation and namespace-ID instructions from `worker/README.md` and `DEPLOYMENT.md`. Document that the first deployment creates the SQLite Durable Object class through the migration and that subsequent migration tags must never be rewritten. Retain provider-side usage alerts as a separate cost boundary.

- [ ] **Step 6: Run Worker tests**

Run: `node worker/test-worker.mjs`

Expected: concurrency, rollover, missing binding, CORS, payload validation, and both Workers AI stream return forms pass.

- [ ] **Step 7: Commit the limiter migration**

```powershell
git add worker/src/rate-limiter.mjs worker/src/guards.mjs worker/src/index.mjs worker/test-worker.mjs worker/wrangler.jsonc.example worker/README.md DEPLOYMENT.md
git commit -m "fix: enforce AI limits atomically"
```

---

### Task 4: Complete the Service Worker Update Flow

**Files:**
- Create: `service-worker-update.mjs`
- Create: `test-service-worker-update.mjs`
- Modify: `app.js:92-98`
- Modify: `service-worker.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `createServiceWorkerActivator({container, reload}): (worker) => boolean`.
- Consumes: the current registration's `waiting` worker and the existing `SKIP_WAITING` message handler.

- [ ] **Step 1: Write the failing activation test**

Create a fake container that captures a one-shot `controllerchange` callback and a fake waiting worker that records messages. Assert that two activation calls send one `SKIP_WAITING` message and that invoking `controllerchange` twice calls `reload` once.

```js
const activate = createServiceWorkerActivator({container, reload: () => reloads += 1});
assert.equal(activate(worker), true);
assert.equal(activate(worker), false);
assert.deepEqual(worker.messages, ['SKIP_WAITING']);
container.dispatchControllerChange();
container.dispatchControllerChange();
assert.equal(reloads, 1);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node test-service-worker-update.mjs`

Expected: the update helper module is missing.

- [ ] **Step 3: Implement the activator and notice action**

Implement the helper as a closure with `activating` and `reloaded` flags. Register `controllerchange` before sending `SKIP_WAITING`.

Extend `showNotice(message, action)` using DOM APIs: set the message through `textContent`, append a `button.text-button` only when `action` is supplied, disable it after click, and invoke `action.onClick`. Do not interpolate the message or label into HTML.

Update `registerServiceWorker` so a waiting worker displays `观象已有更新，可立即启用。` with `立即更新`. Clicking activates exactly that worker. Do not auto-activate.

- [ ] **Step 4: Merge the new module into the existing offline shell**

Add `./html-safety.mjs` and `./service-worker-update.mjs` to the current `SHELL` list and advance the existing cache version by one. Preserve every user-owned landing asset already present in `service-worker.js`; do not replace the file from the committed baseline.

- [ ] **Step 5: Run update and syntax tests**

Run: `node test-service-worker-update.mjs`, `node --check app.js`, and `node --check service-worker.js`

Expected: all commands exit zero.

- [ ] **Step 6: Stage only owned update hunks**

Stage `service-worker-update.mjs`, `test-service-worker-update.mjs`, `app.js`, and `package.json`. Because `service-worker.js` already contains user-owned changes, leave it unstaged unless its unrelated diff can be excluded exactly. Do not commit the user's landing assets.

---

### Task 5: End-to-End Regression And Delivery

**Files:**
- Modify: `package.json`
- Modify: `smoke-browser.mjs`
- Verify: all files changed by Tasks 1-4

**Interfaces:**
- Consumes: all safety, AI, limiter, and update interfaces created above.
- Produces: a validated release candidate and updated test command coverage.

- [ ] **Step 1: Add new unit tests to the standard suite**

Ensure `test:unit` runs `test-html-safety.mjs` and `test-service-worker-update.mjs` in addition to the existing tests. Do not remove or reorder user-owned landing tests unnecessarily.

- [ ] **Step 2: Extend browser injection coverage**

In the existing smoke flow, submit `<svg/onload=__x=1>` as a tag, render the annotation panel, and assert there is no SVG element, no `[onload]` attribute, `globalThis.__x` is unset, and the literal tag text is visible. This fixture remains within the existing 30-character per-tag limit.

Seed a valid history record whose ID contains quotes, render history, and assert the corresponding button has the exact ID in `dataset.historyId` with no injected event attributes. Delete or select the record to prove escaped attribute values remain functional.

- [ ] **Step 3: Run the complete unit and content gate**

Run: `npm run validate`

Expected: content validation and every unit test pass.

- [ ] **Step 4: Run the real-browser gate**

Start the existing local server only if port 4175 is not already healthy, launch a temporary Edge debugging profile, and run `npm run test:browser`. Verify desktop and 320px behavior, early stream rendering, incomplete-response non-persistence, inert stored content, and full divination flow.

Expected: browser smoke command exits zero with no horizontal overflow.

- [ ] **Step 5: Perform release hygiene checks**

Run:

```powershell
git -c safe.directory=C:/workspace/zhouyi diff --check
git -c safe.directory=C:/workspace/zhouyi status --short
rg -n -S "RATE_LIMITS|kv namespace create|REPLACE_WITH_KV_NAMESPACE_ID" worker DEPLOYMENT.md
```

Expected: no whitespace errors, no stale required-KV deployment instructions, no credentials, and user-owned landing changes remain present and uncommitted unless the user committed them independently.

- [ ] **Step 6: Report deployment migration requirements**

State that the code is locally complete but Cloudflare deployment still requires account login, the `RATE_LIMIT_SALT` secret, actual allowed origins, and the public Worker URL. Call out that an already deployed KV-based Worker must deploy the new Durable Object migration before the static frontend endpoint is considered production-ready.
