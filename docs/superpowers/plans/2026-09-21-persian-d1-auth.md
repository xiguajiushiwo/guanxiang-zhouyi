# Persian Interface and Cloudflare D1 Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete Persian RTL interface and optional email/password accounts backed by Cloudflare D1, while preserving every existing browser-only record and guest workflow.

**Architecture:** A separate Cloudflare account Worker owns D1 users, sessions, and readings. Cloudflare Pages Functions and the Liara Node mirror proxy `/api/account/*` same-origin requests to that Worker and preserve cookies. The frontend continues writing the existing local history immediately; signed-in users additionally synchronize records to D1 and can merge old guest records.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Cloudflare Workers/D1/Pages Functions, Node.js Web Crypto and tests, existing localStorage journal schema, Playwright browser checks.

**Spec:** `docs/superpowers/specs/2026-09-21-persian-d1-auth-design.md`

## Global Constraints

- Never remove, rename, or clear existing localStorage journal keys or valid records.
- Existing users opening the current Cloudflare origin must see the same records before and after upgrade.
- Guests remain fully usable without registration and keep records only in the current browser origin.
- Registered users can retrieve only their own D1 records through authenticated sessions.
- Passwords, session tokens, D1 bindings, and proxy secrets never enter frontend assets, Git, or logs.
- Persian uses `fa` and RTL layout; canonical classical source text is not replaced with invented translations.
- Existing Cloudflare Pages, Liara, AI Worker, mobile layout, daily hexagram behavior, and reading flow remain working.
- D1 account failures must fall back to local guest mode without deleting local records.

## File Map

- Create: `account-worker/src/index.mjs` — D1 account API, session checks, ownership checks.
- Create: `account-worker/src/crypto.mjs` — PBKDF2 password hashes and session token hashing.
- Create: `account-worker/src/validation.mjs` — email, password, reading and merge payload validation.
- Create: `account-worker/migrations/0001_accounts.sql` — D1 schema.
- Create: `account-worker/wrangler.jsonc.example` — D1 binding and origin configuration.
- Create: `account-worker/test-account-worker.mjs` — fake-D1 account API tests.
- Create: `functions/_shared/account-proxy.mjs` — same-origin account proxy with cookie preservation.
- Create: `functions/api/account/[[path]].js` — Cloudflare Pages adapter.
- Create: `test-account-proxy.mjs` — Pages proxy contract tests.
- Modify: `node-server.mjs` — Liara `/api/account/*` proxy routing.
- Modify: `test-node-server.mjs` — Liara cookie and account route tests.
- Modify: `i18n.mjs` — Persian dictionary and language registry.
- Create: `principles-fa.json` — Persian principle summaries where verified UI summaries are required.
- Modify: `hexagram-i18n.mjs` — Persian hexagram display names and summaries.
- Modify: `ai-reading.mjs` — Persian section parsing and error messages.
- Modify: `worker/src/guards.mjs` — accept `fa` payload language.
- Modify: `worker/src/index.mjs` — Persian AI prompt and Persian errors.
- Modify: `worker/test-worker.mjs` — Persian payload and prompt assertions.
- Modify: `index.html` — Persian language option, auth dialog, account status controls, and auth i18n attributes.
- Modify: `styles.css`, `landing-v2.css`, `landing-details.css` — RTL typography, mirrored controls, and auth dialog/mobile layout.
- Modify: `app.js` — language metadata, auth state, login/register flow, cloud sync, merge dialog, and Persian direction updates.
- Create: `account-sync.mjs` — origin-safe local/cloud merge and sync queue helpers.
- Create: `test-account-sync.mjs` — old-record preservation and merge tests.
- Modify: `storage.mjs` — only additive normalization support for `fa` and cloud metadata.
- Modify: `build-pages.mjs` — include `principles-fa.json` if required by the runtime loader.
- Modify: `service-worker.js` — advance cache version and include new Persian asset.
- Modify: `package.json` — account, Persian, and sync tests/scripts.
- Modify: `DEPLOYMENT.md` — D1 creation, migration, secrets, proxy configuration, and rollback.

---

### Task 1: Persian Language Foundation

**Files:**
- Modify: `i18n.mjs`, `hexagram-i18n.mjs`, `ai-reading.mjs`
- Create: `principles-fa.json`
- Modify: `index.html`, `styles.css`, `landing-v2.css`, `landing-details.css`
- Modify: `test-i18n.mjs`, `test-landing.mjs`

**Interfaces:**
- Produces: `LANGUAGES.fa === 'فارسی'`, `dictionaryForTests().fa`, and `setDocumentLanguage('fa')` metadata.
- Produces: Persian section headings `['قضاوت اصلی','وضعیت کنونی','تغییر کلیدی','روند پیش‌رو','پیشنهادهای عملی']` for AI parsing.
- Preserves: `zh-CN` and `en` dictionary key sets exactly.

- [ ] **Step 1: Add failing language parity and RTL tests**

Extend `test-i18n.mjs` to assert `fa` exists, has every key in Chinese and English dictionaries, uses `dir='rtl'` metadata, and translates the language menu label. Extend `test-ai-reading.mjs` with a complete Persian response and incomplete-response assertions.

```js
const dictionaries=dictionaryForTests();
assert.equal(LANGUAGES.fa,'فارسی');
assert.deepEqual(Object.keys(dictionaries['zh-CN']).sort(),Object.keys(dictionaries.fa).sort());
assert.equal(isCompleteAiReading(persianReading,'fa'),true);
```

- [ ] **Step 2: Run focused tests and verify the new locale is absent**

Run: `node test-i18n.mjs && node test-ai-reading.mjs`

Expected: FAIL because `fa` is not registered and Persian headings are not recognized.

- [ ] **Step 3: Add Persian dictionary, display metadata, and RTL styling**

Add `fa` translations for every existing UI key, including auth keys reserved for Task 5. Add Persian hexagram labels through the existing localization API, keep source Chinese text visibly marked as source text, and add:

```js
export const LANGUAGE_META={
  'zh-CN':{label:'中文',locale:'zh-CN',direction:'ltr'},
  en:{label:'English',locale:'en',direction:'ltr'},
  fa:{label:'فارسی',locale:'fa',direction:'rtl'}
};
```

When `fa` is active, set `document.documentElement.lang='fa'` and `dir='rtl'`. Add scoped `[dir="rtl"]` rules instead of changing existing LTR defaults; preserve the ritual's semantic bottom-to-top ordering and flip only navigation, search, and action alignment. Add `principles-fa.json` to the build list if the loader uses locale-specific source files.

- [ ] **Step 4: Run locale and browser-structure tests**

Run: `node test-i18n.mjs && node test-ai-reading.mjs && node test-landing.mjs`

Expected: all existing Chinese/English assertions and new Persian parity/RTL assertions pass.

- [ ] **Step 5: Commit the Persian foundation**

```powershell
git -c safe.directory=C:/workspace/zhouyi add i18n.mjs hexagram-i18n.mjs ai-reading.mjs principles-fa.json index.html styles.css landing-v2.css landing-details.css test-i18n.mjs test-ai-reading.mjs test-landing.mjs
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: add Persian interface foundation"
```

### Task 2: Persian AI Contract

**Files:**
- Modify: `worker/src/guards.mjs`, `worker/src/index.mjs`, `worker/test-worker.mjs`
- Modify: `storage.mjs`

**Interfaces:**
- Consumes: `language: 'fa'` from the existing AI payload.
- Produces: Persian output with exact section order and stable error codes.
- Preserves: existing Chinese and English validation and prompt contracts.

- [ ] **Step 1: Add failing Persian Worker tests**

Assert `validateReadingPayload({...validPayload(),language:'fa'}).ok`, Persian error selection, and prompt requirements: Persian output, conditional language, no medical/legal/financial certainty, exact five headings, and exactly three numbered actions.

- [ ] **Step 2: Run Worker tests and verify rejection**

Run: `node worker/test-worker.mjs`

Expected: FAIL because `fa` is currently rejected and the Worker has no Persian prompt branch.

- [ ] **Step 3: Implement Persian validation, prompt, and storage normalization**

Accept `fa` in `guards.mjs`, add Persian error translations, and add a Persian prompt branch with headings matching Task 1. Extend `normalizeAiReading` to retain `language:'fa'`; never coerce it to Chinese. Keep all source evidence rules and exact action-count rules unchanged.

- [ ] **Step 4: Run Worker and storage tests**

Run: `node worker/test-worker.mjs && node test-storage.mjs && node test-ai-reading.mjs`

Expected: all pass, including Persian validation and language-preserving AI records.

- [ ] **Step 5: Commit the Persian AI contract**

```powershell
git -c safe.directory=C:/workspace/zhouyi add worker/src/guards.mjs worker/src/index.mjs worker/test-worker.mjs storage.mjs
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: support Persian AI readings"
```

### Task 3: D1 Schema and Account Worker

**Files:**
- Create: `account-worker/migrations/0001_accounts.sql`
- Create: `account-worker/src/crypto.mjs`
- Create: `account-worker/src/validation.mjs`
- Create: `account-worker/src/index.mjs`
- Create: `account-worker/test-account-worker.mjs`
- Create: `account-worker/wrangler.jsonc.example`

**Interfaces:**
- Produces: `fetch(request, env)` Worker handler.
- Produces: `hashPassword(password, cryptoImpl?)`, `verifyPassword(password, encodedHash, cryptoImpl?)`, `hashSessionToken(token)`.
- Produces: account routes `/register`, `/login`, `/logout`, `/me`, `/readings`, `/readings/:id`, and `/readings/merge`.
- Consumes: `env.DB` D1 binding, `env.SESSION_SECRET`, `env.ALLOWED_ORIGINS`.

- [ ] **Step 1: Write fake-D1 tests before implementation**

Build a small in-memory D1 stub implementing `prepare().bind().run()`, `.first()`, and `.all()`. Test registration, duplicate email generic failure, login cookie issuance, `/me`, logout, expired session, record ownership, merge idempotence, and invalid payload rejection.

```js
const register=await call('/register','POST',{email:'reader@example.com',password:'correct horse battery'});
assert.equal(register.status,201);
assert.match(register.headers.get('set-cookie'),/__Host-guanxiang_session=/);
const own=await call('/readings','PUT',record,{cookie:register.headers.get('set-cookie')});
assert.equal(own.status,200);
const other=await call(`/readings/${record.id}`,'DELETE',{},{cookie:otherUserCookie});
assert.equal(other.status,404);
```

- [ ] **Step 2: Run the account tests and verify missing modules**

Run: `node account-worker/test-account-worker.mjs`

Expected: FAIL because the account Worker and migration do not exist.

- [ ] **Step 3: Add D1 migration and Web Crypto helpers**

Create the schema from the spec. Encode password hashes as `pbkdf2-sha256$iterations$salt$derivedKey`, use a random salt per password, and compare derived bytes without early-return timing differences. Generate opaque session tokens with `crypto.getRandomValues`, store only their SHA-256 hash, and set a finite expiration.

- [ ] **Step 4: Implement authenticated routes with ownership predicates**

Normalize emails to lowercase, require a minimum password length of 8, cap request bodies and record JSON, and use generic registration/login errors. Every reading query must include `WHERE user_id = ?`; the client-supplied record never controls `user_id`. Return `401` for missing/expired sessions, `404` for records owned by another user, and `Cache-Control: no-store` on all account responses.

- [ ] **Step 5: Run account tests and syntax checks**

Run: `node account-worker/test-account-worker.mjs && node --check account-worker/src/index.mjs && node --check account-worker/src/crypto.mjs`

Expected: all account and ownership tests pass.

- [ ] **Step 6: Commit the D1 account Worker**

```powershell
git -c safe.directory=C:/workspace/zhouyi add account-worker
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: add Cloudflare D1 account worker"
```

### Task 4: Same-Origin Pages and Liara Account Proxies

**Files:**
- Create: `functions/_shared/account-proxy.mjs`
- Create: `functions/api/account/[[path]].js`
- Create: `test-account-proxy.mjs`
- Modify: `node-server.mjs`, `test-node-server.mjs`

**Interfaces:**
- Produces: `proxyAccount({request, proxySecret, clientIp, fetchImpl?}): Promise<Response>`.
- Consumes: `ACCOUNT_WORKER_URL`, `ACCOUNT_PROXY_SECRET` environment values.
- Preserves: `Set-Cookie`, JSON body, status code, `Cache-Control`, and `Retry-After`.

- [ ] **Step 1: Write failing proxy tests**

Assert the proxy forwards browser `Origin`, visitor IP, method, body, and `x-guanxiang-account-proxy-secret`; a Worker response with `Set-Cookie` returns the same cookie to the browser. Test oversized bodies, unsupported methods, and upstream failure. Extend the Node-server test to call `/api/account/me` and inspect the cookie.

- [ ] **Step 2: Run tests and verify missing proxy**

Run: `node test-account-proxy.mjs && node test-node-server.mjs`

Expected: FAIL because the account proxy route is not implemented.

- [ ] **Step 3: Implement shared proxy and Pages adapter**

Use a separate upstream URL and secret from the AI reading proxy. Preserve all `Set-Cookie` values, including multiple cookies, and never cache account responses. The Pages catch-all adapter maps the dynamic path to the account Worker while keeping the visible page origin in the forwarded `Origin` header.

- [ ] **Step 4: Add Liara routing without changing static fallback**

In `node-server.mjs`, route paths beginning `/api/account/` to the shared proxy before static-file handling. Read `ACCOUNT_WORKER_URL` and `ACCOUNT_PROXY_SECRET` from the server options/environment. Existing `/api/reading` behavior and static file security must remain unchanged.

- [ ] **Step 5: Run proxy tests and commit**

Run: `node test-account-proxy.mjs && node test-node-server.mjs`

Expected: all proxy and existing AI server tests pass.

```powershell
git -c safe.directory=C:/workspace/zhouyi add functions/_shared/account-proxy.mjs functions/api/account/[[path]].js test-account-proxy.mjs node-server.mjs test-node-server.mjs
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: proxy D1 accounts on every public host"
```

### Task 5: Preserve Old Local Records and Add Cloud Sync Core

**Files:**
- Create: `account-sync.mjs`
- Create: `test-account-sync.mjs`
- Modify: `storage.mjs`, `app.js`

**Interfaces:**
- Produces: `loadAccountSession(fetchImpl?)`, `fetchCloudReadings(fetchImpl?)`, `mergeGuestRecords(local, cloud, upload)`, `saveCloudRecord(record, fetchImpl?)`, `deleteCloudRecord(id, fetchImpl?)`.
- Consumes: existing `normalizeHistoryRecords`, `mergeJournalRecords`, localStorage journal keys, same-origin account endpoints.
- Preserves: old record IDs, notes, tags, AI readings, timestamps, and export/import behavior.

- [ ] **Step 1: Write regression tests with pre-existing records**

Create a fixture using the exact current localStorage keys and a record from the pre-account schema. Assert loading after the new code returns the same record byte-for-byte for supported fields, malformed extra records are ignored without clearing valid records, and a simulated D1 outage leaves local data unchanged.

```js
const before=JSON.stringify(oldRecords);
const result=await mergeGuestRecords(oldRecords,cloudRecords,async()=>{throw new Error('offline')});
assert.deepEqual(result.local,oldRecords);
assert.equal(JSON.stringify(oldRecords),before);
```

- [ ] **Step 2: Run the sync tests and verify missing module**

Run: `node test-account-sync.mjs`

Expected: FAIL because the cloud sync module does not exist.

- [ ] **Step 3: Implement additive sync and explicit merge choices**

Never replace local storage during session discovery. On login, fetch cloud records and return `{local, cloud, merged}` so the UI can offer “merge local records” or “keep cloud only”. Merge through the existing timestamp/note/tag rules, upload only bounded batches, then write the server-confirmed list locally. On write failure, retain the local record and enqueue a retry marker rather than deleting or rolling back the local copy.

- [ ] **Step 4: Connect completed readings and notes to the sync queue**

After the existing local save succeeds, call `saveCloudRecord` only when authenticated. Note edits use the same upsert path. Delete actions delete locally first only after the user confirms, then attempt cloud deletion; if cloud deletion fails, show a retryable warning and keep a deletion tombstone until the next successful sync.

- [ ] **Step 5: Run sync and storage tests**

Run: `node test-account-sync.mjs && node test-storage.mjs`

Expected: pre-account records remain intact, merge is idempotent, and offline fallback passes.

- [ ] **Step 6: Commit the compatibility layer**

```powershell
git -c safe.directory=C:/workspace/zhouyi add account-sync.mjs test-account-sync.mjs storage.mjs app.js
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: preserve guest history and sync signed-in records"
```

### Task 6: Auth UI, Persian Wiring, and RTL Mobile Layout

**Files:**
- Modify: `index.html`, `app.js`, `i18n.mjs`
- Modify: `styles.css`, `landing-details.css`
- Modify: `test-landing.mjs`, create or extend `test-auth-ui.mjs`

**Interfaces:**
- Produces: auth dialog from the existing profile button; registration, login, logout, merge, and session status actions.
- Consumes: `account-sync.mjs` and `fa` dictionary keys.
- Preserves: cover entry behavior, onboarding location, history list/detail flow, and mobile navigation.

- [ ] **Step 1: Add failing UI structure tests**

Assert `authDialog`, login/register forms, email/password fields, guest status, logout control, merge choice dialog, `data-language="fa"`, and `dir` updates are present. Assert no existing cover or history IDs are removed.

- [ ] **Step 2: Run UI tests and verify missing auth markup**

Run: `node test-auth-ui.mjs && node test-landing.mjs`

Expected: FAIL because the auth dialog and Persian option are not present.

- [ ] **Step 3: Add compact auth dialog and account status**

Use the existing design system: email/password fields, one primary submit button, secondary mode switch, clear guest/local status, and a logout action. The dialog must be keyboard reachable and fit the established 390px mobile layout. Do not expose D1 or Worker URLs in UI text.

- [ ] **Step 4: Wire authentication state and merge flow**

On app boot, call `/api/account/me` in the background. Keep the app usable while it resolves. On successful login, show cloud/local counts and explicit merge choices. After merge, refresh the history list and keep the existing detail page selection if its record still exists. On logout, switch to local mode without clearing localStorage.

- [ ] **Step 5: Apply Persian direction and responsive checks**

Update `documentElement.lang/dir`, close language menus when switching, mirror only appropriate controls, and test the cover, home, divination, history list, history detail, and auth dialog at desktop and mobile widths. Ensure Persian text does not overlap the existing central hexagram or mobile cover.

- [ ] **Step 6: Run UI and browser tests, then commit**

Run: `node test-auth-ui.mjs && node test-landing.mjs && npm run test:browser`

Expected: auth controls work in both LTR and RTL, existing pages remain visually stable, and mobile screenshots have no overlap.

```powershell
git -c safe.directory=C:/workspace/zhouyi add index.html app.js i18n.mjs styles.css landing-details.css test-auth-ui.mjs test-landing.mjs
git -c safe.directory=C:/workspace/zhouyi commit -m "feat: add account controls and Persian RTL UI"
```

### Task 7: D1 Deployment, Static Build, and End-to-End Verification

**Files:**
- Modify: `build-pages.mjs`, `service-worker.js`, `package.json`, `DEPLOYMENT.md`
- Modify ignored deployment config: `account-worker/wrangler.jsonc`

**Interfaces:**
- Produces: deployed account Worker with D1 binding and migrations.
- Produces: Cloudflare Pages and Liara public origins with working account proxies.
- Preserves: existing AI Worker deployment and current public site URLs.

- [ ] **Step 1: Add build/test wiring and cache version**

Include Persian assets in `build-pages.mjs`, add account and Persian tests to `test:unit`, and increment the service-worker cache name. Run `npm run validate` before touching cloud configuration.

- [ ] **Step 2: Create D1 and apply migration**

After Cloudflare authentication, create the database and record the generated database ID in ignored `account-worker/wrangler.jsonc`. Apply the migration with Wrangler. Do not put account IDs or secrets in the example config unless they are non-sensitive placeholders.

```powershell
Push-Location account-worker
npx wrangler@latest d1 create guanxiang-accounts
npx wrangler@latest d1 migrations apply guanxiang-accounts --remote
Pop-Location
```

- [ ] **Step 3: Configure account Worker secrets and origins**

Set `SESSION_SECRET` and `ACCOUNT_PROXY_SECRET` as Wrangler secrets. Set `ACCOUNT_WORKER_URL` and `ACCOUNT_PROXY_SECRET` in Cloudflare Pages Function configuration and Liara environment configuration. Add the exact Pages and Liara origins to the account Worker's allowlist.

- [ ] **Step 4: Deploy account Worker and proxies**

Deploy the account Worker, then deploy Pages and Liara. Verify that `GET /api/account/me` returns `401` rather than a static `404`, registration sets a same-origin cookie, and logout clears it. Existing `/api/reading` must remain `200` for a valid authenticated proxy request.

- [ ] **Step 5: Run end-to-end data compatibility checks**

Use one browser context with a preloaded old local record: verify it remains visible as a guest, register, merge, refresh, and confirm it appears from a second browser context after login. Create a new record, edit a note, log out, verify local mode still shows the old local list, then log in again and verify cloud records remain. Test a second account cannot access the first account's record URL.

- [ ] **Step 6: Verify Persian desktop/mobile and Iran mirror**

Run the Persian cover, home, divination, history, auth, and logout flows at `1440x900` and `390x844` on Cloudflare. Repeat the sign-in and record retrieval smoke test on Liara. Use Globalping from Tehran for the Liara homepage and `/api/account/me`; record the measurement IDs.

- [ ] **Step 7: Commit deployment documentation and push**

```powershell
git -c safe.directory=C:/workspace/zhouyi add build-pages.mjs service-worker.js package.json DEPLOYMENT.md
git -c safe.directory=C:/workspace/zhouyi commit -m "docs: document D1 account deployment"
git -c safe.directory=C:/workspace/zhouyi push origin main
git -c safe.directory=C:/workspace/zhouyi status --short
```

Expected: all implementation commits are on `main`, no secrets are tracked, and the final working tree is clean apart from explicitly ignored local tool caches.
