# 观象中英双语 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不翻译经典原文的前提下，为观象应用提供完整、可持久化的中文/English 界面和端到端双语解读。

**Architecture:** 新增 `i18n.mjs` 作为语言状态和词条中心，静态 HTML 使用 `data-i18n`，动态渲染统一调用 `t()`。说明型数据增加英文展示字段，经典原文保持现有 JSON 不变；本地解读和 AI Worker 通过显式 `language` 参数选择解释文本和标题协议。

**Tech Stack:** 原生 ES modules、HTML/CSS、Cloudflare Worker、Node.js 内置测试、Playwright 冒烟测试。

**Spec:** `docs/superpowers/specs/2026-09-14-bilingual-design.md`

## Global Constraints

- 经典原文（卦辞、爻辞、彖传、象传、十翼引文）始终显示中文底本。
- 支持语言仅为 `zh-CN` 和 `en`，默认 `zh-CN`，选择保存到 `localStorage`。
- 用户问题、札记、导入历史不自动翻译。
- 英文卦名保留中文识别，格式为 `English (中文)`。
- 不改变现有占筮算法、六爻顺序、古籍篇次和历史数据格式。
- 每个任务完成后运行对应测试；只提交本任务涉及文件，不覆盖工作区已有改动。

### Task 1: 语言核心模块

**Files:**
- Create: `i18n.mjs`
- Create: `test-i18n.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `LANGUAGES`, `getLanguage()`, `setLanguage(language)`, `t(key, params)`, `translateDom(root=document)` and `languageLabel(language)`.
- `t()` 缺失英文词条回退中文；`setLanguage()` 只接受 `zh-CN`/`en`，并写入 `guanxiang-language`。

- [ ] **Step 1: Write failing tests** for default language, invalid fallback, interpolation, persistence, and missing-key fallback.
- [ ] **Step 2: Run** `node test-i18n.mjs`; verify failures identify missing exports.
- [ ] **Step 3: Implement** the dictionary and DOM translation helpers with no browser-only dependency at module import time.
- [ ] **Step 4: Run** `node test-i18n.mjs`; expect PASS.
- [ ] **Step 5: Commit** `git add i18n.mjs test-i18n.mjs package.json && git commit -m "feat: add bilingual language core"`.

### Task 2: 静态页面与语言切换

**Files:**
- Modify: `index.html` (all user-facing static labels)
- Modify: `app.js` (`nav`, initialization, event binding)
- Modify: `styles.css` (language switcher sizing and responsive layout)
- Modify: `test-landing.mjs`, `test-landing-browser.mjs`

**Interfaces:**
- `app.js` imports `getLanguage`, `setLanguage`, `translateDom`, `t`.
- Adds topbar `#languageToggle` with two buttons and a `languagechange` render event.

- [ ] **Step 1: Add tests** asserting `html[lang]`, toggle labels, navigation, cover, onboarding, dialogs, placeholders and aria labels update after a language change.
- [ ] **Step 2: Run** `node test-landing.mjs`; capture baseline failures.
- [ ] **Step 3: Mark static nodes** with translation keys and replace hard-coded breadcrumb/navigation names with `t()`.
- [ ] **Step 4: Implement** language initialization before route application; rerender active view without resetting cast state.
- [ ] **Step 5: Add responsive CSS** so the switcher remains usable at 320px width and does not overlap the topbar.
- [ ] **Step 6: Run** `node test-landing.mjs` and `node test-landing-browser.mjs`; expect PASS.
- [ ] **Step 7: Commit** `git add index.html app.js styles.css test-landing.mjs test-landing-browser.mjs && git commit -m "feat: translate static interface"`.

### Task 3: 卦象、十翼与易理说明双语数据

**Files:**
- Create: `hexagram-i18n.mjs`
- Modify: `hexagram-catalog.mjs`, `principles.json`
- Modify: `app.js` (`renderHexList`, `renderHexDetail`, `renderClassics`, `renderPrinciples`, relation cards)
- Modify: `test-interpretation.mjs`, `test-landing.mjs`

**Interfaces:**
- `hexagram-i18n.mjs` exports `HEXAGRAM_EN` keyed 0-63 and `TRIGRAM_EN` keyed by Chinese trigram.
- Dynamic renderers use `displayHexagramName(index, language)` and choose `*_en` fields for explanations; original text fields remain untouched.

- [ ] **Step 1: Add tests** for Qian/Kun English labels, search by English name, English principles, and unchanged Chinese classic text.
- [ ] **Step 2: Run targeted tests** and verify failures.
- [ ] **Step 3: Add complete 64-name/trigram translation map** and English fields for all eight principles sections and concepts.
- [ ] **Step 4: Update renderers** to translate labels, counts, filters, relation descriptions and empty/loading states while rendering `.wing-original` from original fields.
- [ ] **Step 5: Run** `node test-landing.mjs && node test-interpretation.mjs`; expect PASS.
- [ ] **Step 6: Commit** `git add hexagram-i18n.mjs hexagram-catalog.mjs principles.json app.js test-landing.mjs test-interpretation.mjs && git commit -m "feat: translate hexagram and study content"`.

### Task 4: 本地解读双语

**Files:**
- Modify: `interpretation.mjs`
- Modify: `app.js` (`showResult`, reading panels and evidence)
- Modify: `test-interpretation.mjs`

**Interfaces:**
- `buildLocalInterpretation(context, { language = 'zh-CN' } = {})` returns the existing shape with localized explanatory strings.
- `classifyQuestion` accepts Chinese and English keyword sets but never changes the original question.

- [ ] **Step 1: Add tests** for English career/general questions, all six stage strings, actions/cautions, and original Chinese line evidence.
- [ ] **Step 2: Run** `node test-interpretation.mjs`; verify failures.
- [ ] **Step 3: Add parallel English `STAGES`/`LENSES` and category keywords; keep source quotations Chinese.
- [ ] **Step 4: Pass current language from `showResult` and translate section headings/source notes/status text.
- [ ] **Step 5: Run** `node test-interpretation.mjs`; expect PASS.
- [ ] **Step 6: Commit** `git add interpretation.mjs app.js test-interpretation.mjs && git commit -m "feat: localize offline interpretations"`.

### Task 5: 大衍筮法流程、历史与札记

**Files:**
- Modify: `app.js` (question validation, ritual step labels, result/history rendering)
- Modify: `index.html` (dynamic containers and labels not covered in Task 2)
- Modify: `test-yarrow.mjs`, `test-storage.mjs`, `test-landing-browser.mjs`

**Interfaces:**
- All ritual state remains language-neutral; only `setProcedure`, `setDivinationPhase`, `renderRecords`, `renderHistory` presentation calls `t()`.
- Saved cast/history records remain backward compatible and do not store translated copies of user text.

- [ ] **Step 1: Add browser/unit assertions** for complete-mode steps, quick-mode labels, reset/restore messages, empty history, import/export and note status in both languages.
- [ ] **Step 2: Implement** localized ritual operation names and counts while preserving 50/49/40/44 arithmetic and line order.
- [ ] **Step 3: Localize** result cards, reading notes, history filters, backup/import dialogs and validation errors.
- [ ] **Step 4: Verify** switching language mid-prepare and mid-ritual preserves `castState` and current route.
- [ ] **Step 5: Run** `node test-yarrow.mjs && node test-storage.mjs && node test-landing-browser.mjs`; expect PASS.
- [ ] **Step 6: Commit** `git add app.js index.html test-yarrow.mjs test-storage.mjs test-landing-browser.mjs && git commit -m "feat: localize divination and journal flow"`.

### Task 6: AI 解读语言协议

**Files:**
- Modify: `ai-reading.mjs`
- Modify: `worker/src/guards.mjs`, `worker/src/index.mjs`
- Modify: `app.js`
- Modify: `test-ai-reading.mjs`, `worker/test-worker.mjs`

**Interfaces:**
- `splitAiReadingSections(text, language = 'zh-CN')` recognizes localized headings and returns stable IDs (`summary`, `situation`, `turningPoint`, `trend`, `actions`).
- `requestAiReading({ endpoint, payload, ... })` sends `payload.language`.
- Worker `validateReadingPayload()` accepts only `language: 'zh-CN' | 'en'`; `promptFor()` selects matching system prompt/headings.

- [ ] **Step 1: Add failing tests** for Chinese/English heading parsing, invalid language payload, localized errors, and cache-key separation.
- [ ] **Step 2: Run** `node test-ai-reading.mjs && node worker/test-worker.mjs`; verify failures.
- [ ] **Step 3: Implement** stable heading maps, bilingual error messages, payload language validation and English prompt with the same five-section semantics.
- [ ] **Step 4: Update** app AI cache key to include language and pass language to local/worker payload; treat missing legacy language as `zh-CN`.
- [ ] **Step 5: Run targeted tests**; expect PASS and verify original Chinese citations stay unchanged.
- [ ] **Step 6: Commit** `git add ai-reading.mjs worker/src/guards.mjs worker/src/index.mjs app.js test-ai-reading.mjs worker/test-worker.mjs && git commit -m "feat: add bilingual AI readings"`.

### Task 7: 漏译检查、离线缓存与回归

**Files:**
- Create: `validate-i18n.mjs`
- Modify: `service-worker.js`, `package.json`
- Modify: `test-landing-browser.mjs`, `README`/`DEPLOYMENT.md` only if language setup is documented there

**Interfaces:**
- `validate-i18n.mjs` scans registered UI modules/templates and exits non-zero for unregistered user-facing strings, allowing original-data files and user-content placeholders.

- [ ] **Step 1: Add validator tests** with one intentionally unregistered fixture and one allowed original-text fixture.
- [ ] **Step 2: Implement** scanner/report with stable allowlist for `ten-wings.json`, `hexagram-texts.json`, user input interpolation and console diagnostics.
- [ ] **Step 3: Bump** service worker cache name and add `i18n.mjs`, `hexagram-i18n.mjs`, validator-independent runtime assets.
- [ ] **Step 4: Add** `test:i18n` and `validate:i18n` scripts without changing existing test order.
- [ ] **Step 5: Run** `npm run validate`, `node validate-i18n.mjs`, `npm run test:unit`, and `npm run test:browser`.
- [ ] **Step 6: Commit** `git add validate-i18n.mjs service-worker.js package.json test-landing-browser.mjs && git commit -m "test: enforce bilingual coverage and offline assets"`.

## Self-Review Checklist

- [ ] Every spec section maps to at least one task: language state (1-2), data boundary (3), local interpretation (4), AI protocol (6), page coverage (2-5), errors/compatibility (1/5/6/7), tests (all tasks).
- [ ] No task changes the original classic JSON or the yarrow algorithm.
- [ ] All later interfaces match earlier signatures and stable IDs.
- [ ] No `TBD`, `TODO`, or vague implementation-only steps remain.
