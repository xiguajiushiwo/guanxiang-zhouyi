# Dual Interpretation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate rule-based local readings and optional Cloudflare Workers AI readings that stream into the existing divination result and persist only after successful completion.

**Architecture:** Keep the GitHub Pages application static. Add two browser-safe ES modules: one pure local interpretation engine and one streaming HTTP client; let `app.js` render them and persist completed AI readings. Add a separately deployable Cloudflare Worker that validates requests, applies hashed-IP and global KV limits, builds the fixed prompt, calls Workers AI, and normalizes provider SSE into a plain UTF-8 text stream.

**Tech Stack:** Browser ES modules, Node.js built-in test runner primitives (`node:assert/strict`), existing CDP browser smoke test, Cloudflare Workers AI, Cloudflare KV, Wrangler configuration.

**Spec:** `docs/superpowers/specs/2026-09-11-dual-interpretation-design.md`

## Global Constraints

- The static site must still work without the Worker endpoint or network access.
- Local interpretation appears immediately after casting and before the existing source layers.
- AI generation starts only after an explicit user click and displays the real response stream without a progress bar, percentage, ETA, spinner, or simulated typing.
- Only a fully completed AI response is cached; interrupted output remains visible for that session but is not persisted.
- All interpretation copy uses conditional language and does not claim certain prediction or professional medical, legal, or financial advice.
- The Worker stores only expiring anonymous counters; it does not log or persist the question, hexagram data, original IP, or generated text.
- Default limits are 5 requests per hashed IP per hour, 50 requests globally per UTC day, and about 900 output tokens per request.
- Existing uncommitted workspace changes belong to the user and must not be reverted or swept into feature commits.

---

## File Structure

- Create `interpretation.mjs`: question classification, line-stage meanings, and deterministic local reading generation.
- Create `test-interpretation.mjs`: local engine branch, wording, and adversarial-input tests.
- Create `ai-reading.mjs`: endpoint request, UTF-8 stream consumption, error normalization, and section parsing.
- Create `test-ai-reading.mjs`: split-chunk, error, abort, and completion tests with mocked `Response` objects.
- Modify `storage.mjs`: validate and normalize the optional completed `aiReading` history field.
- Modify `test-storage.mjs`: migration, truncation, merge, and invalid-cache tests.
- Modify `index.html`: add local and AI reading containers before the existing source layers.
- Modify `app.js`: create reading context, render local interpretation, stream AI output, and show cached readings in results/history.
- Modify `styles.css`: style interpretation bands, streaming sections, errors, retry controls, dark mode, and responsive states.
- Modify `smoke-browser.mjs`: verify local output, real incremental stream rendering, successful cache, interrupted non-cache, and mobile layout.
- Create `worker/src/guards.mjs`: origin, payload, counter-key, and limit helpers.
- Create `worker/src/index.mjs`: Worker request handler, prompt builder, Workers AI invocation, and provider-stream normalization.
- Create `worker/test-worker.mjs`: Worker validation, limits, privacy, and stream tests with in-memory bindings.
- Create `worker/wrangler.jsonc.example`: deployable binding and variable template without secrets.
- Create `worker/README.md`: Worker creation, KV, secret, deployment, and endpoint verification.
- Create `DEPLOYMENT.md`: GitHub Pages plus Worker wiring and production verification.
- Modify `package.json`: add deterministic commands for all unit tests and the browser smoke test.

### Task 1: Deterministic Local Interpretation Engine

**Files:**
- Create: `interpretation.mjs`
- Create: `test-interpretation.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `{ question, original, changed, moving, rule, originalLines, changedLines }`, where each hexagram is the existing catalog tuple and each line is `{ label, text }`.
- Produces: `classifyQuestion(question): 'career'|'relationship'|'study'|'finance'|'health'|'general'`.
- Produces: `buildLocalInterpretation(context): { category, summary, situation, turningPoint, trend, actions: string[], cautions: string[], evidence: { primaryLabels: string[], originalName: string, changedName: string } }`.

- [ ] **Step 1: Write classification and shape tests**

Create fixtures from the existing tuple shape and assert stable categories and a complete result:

```js
import assert from 'node:assert/strict';
import { buildLocalInterpretation, classifyQuestion } from './interpretation.mjs';

assert.equal(classifyQuestion('未来三个月我该如何推进职业选择？'), 'career');
assert.equal(classifyQuestion('面对目前的合作关系，我应如何沟通？'), 'relationship');
assert.equal(classifyQuestion('这件事下一步最应注意什么？'), 'general');

const reading = buildLocalInterpretation({
  question: '未来三个月我该如何推进职业选择？',
  original: ['屯', '䷂', '水雷屯', '云雷屯，君子以经纶', '元亨利贞，勿用有攸往', '初生艰难，守正待时', '水', '雷'],
  changed: ['需', '䷄', '水天需', '云上于天，需', '有孚，光亨', '守正以待，蓄势而进', '水', '天'],
  moving: [0],
  rule: { text: '一爻变：以本卦第一爻爻辞为主。', primary: [0] },
  originalLines: [{ label: '初九', text: '磐桓；利居贞，利建侯。' }],
  changedLines: []
});
assert.equal(reading.category, 'career');
assert.equal(reading.evidence.originalName, '水雷屯');
assert.deepEqual(reading.evidence.primaryLabels, ['初九']);
assert.equal(reading.actions.length, 3);
assert.ok(['提示', '倾向', '可考虑', '需要留意'].some(word => JSON.stringify(reading).includes(word)));
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `node test-interpretation.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `interpretation.mjs`.

- [ ] **Step 3: Implement the smallest complete local engine**

Implement ordered keyword groups, six stage descriptions, question lenses, and conditional composition. The module must never insert HTML and must select primary lines from `rule.fromChanged ? changedLines : originalLines`:

```js
const STAGES = [
  '事情尚在起点，宜先辨明条件再行动',
  '事情进入内部协作阶段，可观察支持是否真实',
  '事情来到内外转换的门槛，需要留意用力过度',
  '事情开始进入外部环境，宜试探并及时校正',
  '事情处在承担与统合的位置，应兼顾原则和影响',
  '事情接近阶段上限，需要留意盛极而转'
];

export function classifyQuestion(question) {
  const text = String(question || '').trim();
  return CATEGORY_RULES.find(([, words]) => words.some(word => text.includes(word)))?.[0] || 'general';
}
export function buildLocalInterpretation(context) {
  const category = classifyQuestion(context.question);
  const sourceLines = context.rule.fromChanged ? context.changedLines : context.originalLines;
  const primaryLines = context.rule.primary.map(index => sourceLines[index]).filter(Boolean);
  return composeReading(context, category, primaryLines, STAGES);
}
```

For zero moving lines, `turningPoint` must explicitly say the current structure is relatively stable. For three moving lines, it must direct attention to both judgments. For four or five moving lines, it must cite the unchanged lines selected from the changed hexagram. For six moving lines, it must preserve the special Qian/Kun rule supplied by `readingRule`.

- [ ] **Step 4: Add all moving-line and hostile-input cases**

Loop over moving counts 0 through 6 and assert every result is complete, bounded, and contains no raw markup transformation:

```js
for (let count = 0; count <= 6; count += 1) {
  const result = buildLocalInterpretation(makeContext(count));
  assert.ok(result.summary.length > 10);
  assert.ok(result.actions.length >= 2 && result.actions.length <= 3);
  assert.ok(result.evidence.primaryLabels.every(Boolean));
}
assert.equal(classifyQuestion('<img src=x onerror=alert(1)>'), 'general');
```

- [ ] **Step 5: Run the local interpretation tests**

Run: `node test-interpretation.mjs`

Expected: PASS and print `Local interpretation tests passed.`

- [ ] **Step 6: Add the test command and commit**

Update `package.json` so `test:unit` includes the existing tests plus `node test-interpretation.mjs`, then run `npm run test:unit`.

Expected: every unit script exits 0.

```bash
git add interpretation.mjs test-interpretation.mjs package.json
git commit -m "feat: add local hexagram interpretation engine"
```

### Task 2: Completed AI Reading Storage

**Files:**
- Modify: `storage.mjs`
- Modify: `test-storage.mjs`

**Interfaces:**
- Consumes: optional history property `aiReading`.
- Produces: normalized `aiReading: { text: string, generatedAt: string, modelLabel: string, version: 1 }` or no property when invalid.
- Produces: `normalizeAiReading(value, now): object|null` for direct unit testing.

- [ ] **Step 1: Write failing storage tests**

Add a complete cached reading and assert it survives migration and merge, while an incomplete or oversized value is rejected/truncated:

```js
const aiReading = {
  text: '【核心判断】\n宜先辨明条件。',
  generatedAt: '2026-09-11T08:00:00.000Z',
  modelLabel: 'Workers AI',
  version: 1
};
const withAi = {...record('ai', '2026-09-11T08:00:00.000Z'), aiReading};
assert.equal(migrateJournalPayload([withAi]).records[0].aiReading.text, aiReading.text);
assert.equal(normalizeAiReading({text:'', generatedAt:'bad', modelLabel:'x', version:1}), null);
assert.equal(normalizeAiReading({...aiReading, text:'甲'.repeat(13000)}).text.length, 12000);
```

- [ ] **Step 2: Run the storage test and verify failure**

Run: `node test-storage.mjs`

Expected: FAIL because `normalizeAiReading` is not exported.

- [ ] **Step 3: Implement validation and normalization**

Add `normalizeAiReading`, accept only non-empty text, normalize the date, cap text at 12,000 characters and label at 80 characters, and force `version: 1`. In `normalizeJournalRecord`, include `aiReading` only when normalization succeeds.

```js
const aiReading = normalizeAiReading(record.aiReading, now);
const {aiReading: discardedAiReading, ...base} = record;
return {...base,note:typeof record.note==='string'?record.note.slice(0,2000):'',tags:Array.isArray(record.tags)?record.tags.filter(tag=>typeof tag==='string').slice(0,12):[],reviewState:['未开始','研读中','已复习'].includes(record.reviewState)?record.reviewState:'未开始',createdAt:isoOrFallback(record.createdAt||record.completedAt,fallback),updatedAt:isoOrFallback(record.updatedAt||record.completedAt||record.createdAt,fallback),...(aiReading?{aiReading}:{})};
```

When two records have equal `updatedAt`, `mergeJournalRecords` must keep a valid AI reading from either side in addition to its current note/tag merge behavior.

- [ ] **Step 4: Run storage and all unit tests**

Run: `node test-storage.mjs`

Expected: PASS with the existing storage message.

Run: `npm run test:unit`

Expected: all unit tests exit 0.

- [ ] **Step 5: Commit**

```bash
git add storage.mjs test-storage.mjs
git commit -m "feat: persist completed AI readings"
```

### Task 3: Browser Streaming Client

**Files:**
- Create: `ai-reading.mjs`
- Create: `test-ai-reading.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `requestAiReading({ endpoint, payload, onChunk, fetchImpl, signal })`.
- Produces: a promise resolving to the complete text only after a clean stream close.
- Produces: `AiReadingError` with stable `code`, user-facing `message`, and `partialText`.
- Produces: `splitAiReadingSections(text): Array<{ id, title, text }>` for completed or partial text.

- [ ] **Step 1: Write failing split-stream tests**

Build a `ReadableStream` whose byte boundaries split both a Chinese UTF-8 character and a section title. Assert that chunks reach `onChunk` immediately and the returned string is exact:

```js
const encoder = new TextEncoder();
const bytes = encoder.encode('【核心判断】\n宜先观察。\n【行动建议】\n先核实条件。');
const response = new Response(new ReadableStream({
  start(controller) {
    controller.enqueue(bytes.slice(0, 5));
    controller.enqueue(bytes.slice(5, 17));
    controller.enqueue(bytes.slice(17));
    controller.close();
  }
}), {status: 200, headers: {'content-type':'text/plain; charset=utf-8'}});
const seen = [];
const text = await requestAiReading({endpoint:'/reading',payload:{},onChunk:chunk=>seen.push(chunk),fetchImpl:async()=>response});
assert.equal(text, new TextDecoder().decode(bytes));
assert.ok(seen.length >= 2);
assert.equal(splitAiReadingSections(text).at(-1).id, 'actions');
```

Add JSON error tests for `RATE_LIMITED`, `DAILY_LIMIT_REACHED`, and `MODEL_UNAVAILABLE`, plus a stream error whose reader throws after one valid chunk. Assert `partialText` is retained.

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `node test-ai-reading.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `ai-reading.mjs`.

- [ ] **Step 3: Implement request and stream consumption**

Use `fetchImpl` with `POST`, `content-type: application/json`, and the supplied abort signal. On non-2xx responses, parse `{ error: { code, message } }`. On success, read with a streaming decoder so partial multibyte characters are not corrupted:

```js
const decoder = new TextDecoder();
while (true) {
  const {value, done} = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, {stream:true});
  complete += chunk;
  onChunk(chunk, complete);
}
complete += decoder.decode();
return complete;
```

Map server codes to concise Chinese messages in one exported constant. Treat an empty clean response as `MODEL_UNAVAILABLE`.

- [ ] **Step 4: Implement section parsing without HTML parsing**

Recognize only the five exact bracketed headings. Text before the first recognized heading belongs to `summary`; unknown headings remain text. Return plain strings and leave DOM creation to `app.js`.

- [ ] **Step 5: Run tests and commit**

Add `node test-ai-reading.mjs` to `test:unit` and run `npm run test:unit`.

Expected: all unit tests exit 0 and the new test prints `AI reading stream tests passed.`

```bash
git add ai-reading.mjs test-ai-reading.mjs package.json
git commit -m "feat: add AI reading stream client"
```

### Task 4: Worker Guards and Anonymous Limits

**Files:**
- Create: `worker/src/guards.mjs`
- Create: `worker/test-worker.mjs`

**Interfaces:**
- Produces: `parseAllowedOrigins(value): Set<string>`.
- Produces: `validateReadingPayload(value): { ok: true, value: ReadingPayload } | { ok: false, error: WorkerError }`.
- Produces: `hashedIpKey(ip, salt, bucket): Promise<string>`.
- Produces: `consumeLimits({ kv, ip, salt, now, perIpLimit, dailyLimit }): Promise<{ ok: true }|{ ok:false, code:string }>`.

`ReadingPayload` contains only version `1`, the question, original and changed indexes, the two hexagram name/trigram/theme/judgment records, moving indexes, the selected reading rule and primary lines, and the completed local reading fields. The validator copies these allowed fields into a new object before prompt construction.

- [ ] **Step 1: Write failing guard tests with an in-memory KV**

Define a KV fake exposing `get(key)` and `put(key, value, options)`. Test exact-origin parsing, the 100-character question cap, integer hexagram indexes from 0 to 63, unique moving indexes from 0 to 5, allowed line fields, and a maximum serialized request size of 12 KiB.

```js
assert.equal(validateReadingPayload(validPayload()).ok, true);
assert.equal(validateReadingPayload({...validPayload(), question:'问'.repeat(101)}).ok, false);
assert.equal(validateReadingPayload({...validPayload(), originalIndex:64}).ok, false);
assert.equal(validateReadingPayload({...validPayload(), moving:[0,0]}).ok, false);
```

Call `hashedIpKey` twice with the same inputs and assert equality, then assert the raw IP is absent from the result. Consume five per-IP requests successfully and assert the sixth returns `RATE_LIMITED`. Use distinct IPs to reach 50 global requests and assert the next returns `DAILY_LIMIT_REACHED`.

- [ ] **Step 2: Run the worker test and verify failure**

Run: `node worker/test-worker.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `worker/src/guards.mjs`.

- [ ] **Step 3: Implement payload validation**

Accept only the fields required by the spec and copy them into a new object. Do not forward arbitrary request properties to the prompt. Enforce the 12 KiB serialized limit before detailed validation.

- [ ] **Step 4: Implement hashed counters**

Use SHA-256 over `salt + ':' + bucket + ':' + ip`; store `ip:<hour>:<digest>` for 3,900 seconds and `global:<day>` for 90,000 seconds. Parse absent/invalid KV values as zero and increment before invoking the model.

Document in the function comment that KV increments are a best-effort cost guard rather than an atomic billing ledger.

- [ ] **Step 5: Run guard tests and commit**

Run: `node worker/test-worker.mjs`

Expected: PASS for guard tests and print `Worker guard tests passed.`

```bash
git add worker/src/guards.mjs worker/test-worker.mjs
git commit -m "feat: add worker request guards and limits"
```

### Task 5: Workers AI Handler and Plain-Text Stream

**Files:**
- Create: `worker/src/index.mjs`
- Modify: `worker/test-worker.mjs`
- Create: `worker/wrangler.jsonc.example`

**Interfaces:**
- Consumes environment bindings `AI`, `RATE_LIMITS`, `ALLOWED_ORIGINS`, `AI_MODEL`, `RATE_LIMIT_SALT`, `PER_IP_HOURLY_LIMIT`, `DAILY_LIMIT`, and `MAX_TOKENS`.
- Produces default Worker export `{ fetch(request, env): Promise<Response> }`.
- Produces a successful `text/plain; charset=utf-8` chunked response or `{ error: { code, message } }` JSON.

- [ ] **Step 1: Add failing handler tests**

Import the default handler and cover `OPTIONS`, rejected methods, missing/forged origins, malformed JSON, invalid payload, limit errors, AI binding failure, and a valid stream. The AI fake must return provider SSE split across arbitrary byte chunks:

```js
const ai = { run: async () => new Response([
  'data: {"response":"【核心判断】\\n"}\n\n',
  'data: {"response":"宜先观察。"}\n\n',
  'data: [DONE]\n\n'
].join(''), {headers:{'content-type':'text/event-stream'}}) };
```

Read the successful response incrementally and assert its final text is `【核心判断】\n宜先观察。` with no `data:` framing.

- [ ] **Step 2: Run the worker test and verify failure**

Run: `node worker/test-worker.mjs`

Expected: FAIL because `worker/src/index.mjs` does not exist.

- [ ] **Step 3: Implement CORS, error responses, and prompt construction**

Create CORS headers only for an exact allowed origin. Handle `OPTIONS` without consuming limits. Build a fixed Chinese system message and a data-only user message from the validated copy. Include the five exact output headings and the instruction not to emit HTML or invent citations.

- [ ] **Step 4: Invoke Workers AI with server-controlled settings**

Call:

```js
await env.AI.run(env.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
  messages,
  stream: true,
  max_tokens: boundedInteger(env.MAX_TOKENS, 900, 300, 1200)
});
```

Never accept model name, system prompt, token limit, or account identifiers from the request.

- [ ] **Step 5: Normalize provider SSE to plain text**

Use a `TransformStream` that buffers incomplete SSE lines, parses only `data:` records, ignores `[DONE]`, extracts string `response` fields, and enqueues encoded response text. If the provider returns a non-2xx response before streaming, return `MODEL_UNAVAILABLE` JSON without exposing its response body.

- [ ] **Step 6: Add Wrangler configuration example**

Use bindings named exactly as specified above, set compatibility date `2026-09-11`, set default limits `5`, `50`, and `900`, and use recognizable replacement values for the production origin and KV namespace ID. Do not include `RATE_LIMIT_SALT`; deployment sets it with `wrangler secret put RATE_LIMIT_SALT`.

- [ ] **Step 7: Run tests and commit**

Run: `node worker/test-worker.mjs`

Expected: PASS and print `Worker guard and streaming handler tests passed.`

```bash
git add worker/src/index.mjs worker/src/guards.mjs worker/test-worker.mjs worker/wrangler.jsonc.example
git commit -m "feat: add Cloudflare AI reading worker"
```

### Task 6: Result Page and History Integration

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `smoke-browser.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildLocalInterpretation`, `requestAiReading`, and `splitAiReadingSections` from Tasks 1 and 3.
- Consumes: `window.GUANXIANG_AI_ENDPOINT`, defaulting to an empty string when deployment has not configured the Worker URL.
- Produces: local result containers `#localReading` and AI containers `#aiReading`, `#generateAiReading`, `#aiReadingContent`, and `#aiReadingError`.
- Produces: `updateHistoryAiReading(id, aiReading)` inside `app.js`.

- [ ] **Step 1: Extend the browser smoke test before changing UI**

Use CDP request interception or an in-page `fetch` stub before clicking the AI button. The stub must return two delayed stream chunks so the test can assert content appears before the stream closes. Add checks for:

```js
{
  localVisible: Boolean(document.querySelector('#localReading')?.textContent.trim()),
  noProgress: !document.querySelector('#aiReading progress, #aiReading [role="progressbar"], #aiReading .spinner'),
  aiButton: Boolean(document.querySelector('#generateAiReading'))
}
```

After clean completion, assert `records[0].aiReading.text` exists. Repeat with a reader error after one chunk and assert visible partial text exists while `aiReading` is absent from the new history record.

- [ ] **Step 2: Run smoke test and verify missing UI failure**

Start the existing server and browser debugging processes using the repository's documented commands, then run `node smoke-browser.mjs`.

Expected: FAIL because `#localReading` and `#generateAiReading` do not exist.

- [ ] **Step 3: Add semantic result containers**

Place the local and AI sections after `.reading-focus` and before `#readingColumns`. The AI section contains a heading, privacy note, button, output region with `aria-live="polite"`, and an initially hidden error/retry row. Do not add a progress element, spinner, elapsed timer, or percentage label.

- [ ] **Step 4: Render the local interpretation in `showResult`**

Create one context builder so current results and history records use identical data. Render text through element `textContent` or the existing `textHtml` helper. The main summary, situation, turning point, trend, action list, caution, and evidence labels must all be present.

Keep the existing source layers unchanged after the new interpretation sections.

- [ ] **Step 5: Stream AI output into stable section containers**

On each `onChunk`, append to an in-memory string, call `splitAiReadingSections`, and update only the corresponding section nodes via `textContent`. Disable the generate button while the request is open and re-enable it on close/error. The button text may change to `正在解读` but there must be no progress indicator.

On success, call:

```js
updateHistoryAiReading(castState.sessionId, {
  text,
  generatedAt: new Date().toISOString(),
  modelLabel: 'Workers AI',
  version: 1
});
```

On failure, keep `error.partialText` rendered, show the mapped error and a retry button, and do not update history.

- [ ] **Step 6: Render cached readings in current results and history**

When `showResult` finds a valid cached reading, render it immediately and change the command to `重新生成`. In `renderHistoryDetail`, rebuild and show the deterministic local reading plus the cached AI reading when present. Do not automatically call the Worker from history.

- [ ] **Step 7: Add responsive and dark-mode styles**

Use unframed result bands rather than nested cards. Fix action and output dimensions sufficiently that button label changes do not shift nearby content. Ensure long Chinese/Latin strings wrap, streamed content grows downward, and the 390px and 1280px smoke viewports have no horizontal overflow.

- [ ] **Step 8: Configure the endpoint without storing secrets**

Read `window.GUANXIANG_AI_ENDPOINT` at call time. When empty, keep the local reading visible and disable the AI button with the text `AI 服务尚未配置`. Add a short inline bootstrap before `app.js`:

```html
<script>window.GUANXIANG_AI_ENDPOINT='';</script>
```

Deployment replaces only this public Worker URL; no secret belongs in `index.html`.

- [ ] **Step 9: Run unit and browser tests**

Run: `npm run test:unit`

Expected: all unit tests exit 0.

Run: `npm run test:browser`

Expected: JSON output reports local reading, incremental AI output, successful cache, interrupted non-cache, and responsive widths.

- [ ] **Step 10: Commit**

```bash
git add index.html app.js styles.css smoke-browser.mjs package.json
git commit -m "feat: add local and streaming AI reading UI"
```

### Task 7: Deployment Guide and End-to-End Verification

**Files:**
- Create: `worker/README.md`
- Create: `DEPLOYMENT.md`
- Modify: `package.json`

**Interfaces:**
- Documents the exact relationship among the GitHub Pages origin, public Worker URL, Workers AI binding, KV namespace, and private rate-limit salt.
- Produces top-level `npm run validate` covering syntax, content generation, every unit test, and browser smoke instructions without deploying external resources.

- [ ] **Step 1: Write Worker deployment instructions**

Document these exact operations with their purpose:

```bash
cd worker
npx wrangler@latest kv namespace create RATE_LIMITS
copy wrangler.jsonc.example wrangler.jsonc
npx wrangler@latest secret put RATE_LIMIT_SALT
npx wrangler@latest deploy
```

Explain where to insert the returned KV ID, the exact production GitHub Pages origin, and the chosen Worker URL. State that the configured origin is a browser control, not authentication, and that platform-side usage limits remain the final cost boundary.

- [ ] **Step 2: Write GitHub Pages wiring instructions**

In `DEPLOYMENT.md`, cover branch deployment, custom-domain origin changes, setting `window.GUANXIANG_AI_ENDPOINT`, HTTPS, a `curl` preflight check, a valid browser request, a limit error, and confirming local interpretation still works with the Worker URL removed.

- [ ] **Step 3: Update scripts and run the full local validation**

Set scripts so the project has:

```json
{
  "test:unit": "node test-yarrow.mjs && node test-derived-hexagrams.mjs && node test-storage.mjs && node test-interpretation.mjs && node test-ai-reading.mjs && node worker/test-worker.mjs",
  "test:browser": "node smoke-browser.mjs",
  "validate": "node build-relations.mjs && node validate-content.mjs && node --check app.js && npm run test:unit"
}
```

Run: `npm run validate`

Expected: relation/content validation, syntax checks, and every unit test exit 0.

Run: `npm run test:browser`

Expected: the final JSON report contains only passing state and no viewport overflow.

- [ ] **Step 4: Inspect the final diff for secrets and scope**

Run:

```bash
git diff --check
git diff --name-only
rg -n "RATE_LIMIT_SALT|api[_-]?key|secret" . -g '!docs/superpowers/**' -g '!worker/README.md' -g '!DEPLOYMENT.md'
```

Expected: no whitespace errors; only planned files appear; matches contain configuration names but no credential values.

- [ ] **Step 5: Commit documentation and final script wiring**

```bash
git add worker/README.md DEPLOYMENT.md package.json
git commit -m "docs: add dual interpretation deployment guide"
```

## Deferred Content Roadmap

The approved third approach remains explicitly deferred: build an independently versioned, sourced, and human-reviewed library for all 64 hexagrams and 384 line texts, with per-entry themes, situations, risks, actions, and citations. It must receive its own content specification and acceptance process before replacing the generic local stage templates.
