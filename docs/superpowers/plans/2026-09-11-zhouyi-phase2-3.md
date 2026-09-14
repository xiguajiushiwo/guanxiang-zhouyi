# 周易阶段二与阶段三实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comparative hexagram study, a guided learning path, local annotations, offline/PWA support, backup reminders, conflict-aware imports, and legacy record migration.

**Architecture:** Keep canonical classics and derived hexagram relationships in local JSON/modules. Add a small study-state layer for comparison, learning progress, and annotations; extend the existing journal storage with versioned envelopes, deterministic conflict resolution, and migration. Register a service worker for app-shell caching without making remote network access a runtime dependency.

**Tech Stack:** Vanilla ES modules, localStorage, Cache API/service worker, existing Node HTTP server, Node validation scripts, and the existing browser smoke harness.

**Spec:** `docs/superpowers/specs/2026-09-11-zhouyi-expansion-design.md`

## Global Constraints

- 完整十八变保留为默认模式；快速演蓍只是节奏较快的替代入口。
- 所有预测性表述必须标为研读与自省用途，不把后人规则伪装成《周易》原文。
- 经典文本使用本地 JSON，不要求运行时访问远程站点。
- 320px 宽度无页面级横向溢出。
- prefers-reduced-motion 下所有非必要动画关闭。
- 所有导入数据必须经过严格校验，错误数据不得进入本地记录。
- 用户记录默认只保存在浏览器本地，导出由用户主动触发。

---

### Task 1: Derived Hexagram Study Data

**Files:**
- Create: `derived-hexagrams.mjs`
- Test: `test-derived-hexagrams.mjs`

**Interfaces:**
- Consumes: `hexagram-catalog.mjs`
- Produces: `hexagramRelations(lines)` returning `{ mutual, opposite, inverse }`, each a catalog index or `-1`.

- [ ] Write tests for all-eight trigram extraction, a known six-line example, and invalid line input.
- [ ] Implement pure bit transformations using bottom-to-top line order: mutual uses lines 2-4 and 3-5, opposite flips every line, inverse reverses line order.
- [ ] Resolve transformed trigrams against the existing catalog and return stable indexes.
- [ ] Run `node test-derived-hexagrams.mjs`.

### Task 2: Comparison Panel And Learning Path

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `smoke-browser.mjs`

**Interfaces:**
- Consumes: `hexagramRelations`, selected catalog item, `principles.json`.
- Produces: comparison buttons for 本卦/互卦/错卦/综卦, a learning-path panel with local progress, and keyboard-accessible navigation.

- [ ] Add a `hexagram-compare` section to the hexagram detail view and a `study-path` section to the principles view.
- [ ] Render derived hexagrams as buttons that update `selectedHex` and preserve the current route.
- [ ] Store learning progress in `guanxiang-study-v1` with `{ completed: string[], current: number }`; provide one toggle action per principle topic.
- [ ] Add mobile styles for stacked comparison cards and no horizontal overflow.
- [ ] Add smoke assertions for all four relation labels, route changes, and persisted learning progress.

### Task 3: Annotation And Review State

**Files:**
- Create: `study-storage.mjs`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `smoke-browser.mjs`

**Interfaces:**
- Consumes: source type/id and local study storage.
- Produces: `loadAnnotations()`, `saveAnnotation(annotation)`, `deleteAnnotation(id)`, and a reusable annotation editor for hexagram/classic sections.

- [ ] Validate annotation fields (`sourceType`, `sourceId`, `note` length <= 2000, tags <= 12) before writing.
- [ ] Add an annotation editor and list to hexagram detail and classics sections, using one local storage key.
- [ ] Add review-state controls (`未开始`, `研读中`, `已复习`) for principles and annotations.
- [ ] Add smoke assertions for save, reload, and delete behavior.

### Task 4: Versioned Storage And Migration

**Files:**
- Modify: `storage.mjs`
- Create: `test-storage.mjs`
- Modify: `app.js`

**Interfaces:**
- Consumes: legacy arrays and current journal records.
- Produces: `STORAGE_VERSION`, `migrateJournalPayload(payload)`, `mergeJournalRecords(local, incoming)`, and `backupStatus()`.

- [ ] Add a versioned envelope `{ version, records, exportedAt }` while accepting legacy arrays.
- [ ] Migrate missing `tags`, `reviewState`, `createdAt`, and `updatedAt` deterministically.
- [ ] Merge by record id, keeping the record with the newest `updatedAt`; preserve local notes when timestamps tie and contents differ.
- [ ] Reject malformed records before persistence and expose a backup-due status after 14 days or 20 completed records.
- [ ] Run `node test-storage.mjs` and existing `npm run validate`.

### Task 5: Conflict-Aware Import And Backup Reminder

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `smoke-browser.mjs`

**Interfaces:**
- Consumes: `mergeJournalRecords`, `backupStatus`.
- Produces: import preview showing added/updated/conflict counts, explicit confirm/cancel actions, and a backup reminder in the history view.

- [ ] Replace immediate import with a preview dialog; do not write until confirm.
- [ ] Show counts and preserve the existing export action.
- [ ] Add a dismissible reminder whose dismissal is stored separately from journal records.
- [ ] Add smoke assertions that cancel leaves storage unchanged and confirm merges records.

### Task 6: PWA Offline Shell And Recovery

**Files:**
- Create: `manifest.webmanifest`
- Create: `service-worker.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `smoke-browser.mjs`

**Interfaces:**
- Consumes: local app-shell files.
- Produces: installable manifest, cache-first shell, update notification, and storage recovery test hooks.

- [ ] Register the service worker only when supported and display an update notice when a new worker is waiting.
- [ ] Cache index, CSS, JS modules, and JSON data; use network fallback only for unknown requests.
- [ ] Add manifest metadata and a simple SVG/data icon that does not affect content accuracy.
- [ ] Add browser checks for manifest link, registration attempt, and offline reload of the app shell.
- [ ] Run all Node tests, HTTP resource checks, and the browser smoke flow; document any CDP environment limitation.

### Task 7: Final Documentation And Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-09-11-zhouyi-phase2-3.md`
- Modify: `README.md` if present, otherwise `docs/superpowers/specs/2026-09-11-zhouyi-expansion-design.md`

- [ ] Mark completed tasks and record storage keys, migration behavior, and offline limitations.
- [ ] Verify all HTML, JS, MJS, JSON, manifest, and service-worker resources return HTTP 200.
- [ ] Run `npm run validate`, `node --check app.js`, `node --check service-worker.js`, and every focused test.
