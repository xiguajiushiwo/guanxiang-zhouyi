# 周易阶段一实现计划

> **For agentic workers:** This plan is for inline execution in the current session. Implement task-by-task, run the listed checks after each task, and keep the full十八变 flow as the default.

**Goal:** Add onboarding, transparent yarrow accounting, layered result reading, and explicit edition metadata without changing the existing complete ritual semantics.

**Architecture:** Keep static classics in JSON, extend the existing runtime state with an onboarding flag and result-layer metadata, and render each new section through small DOM helpers. Reuse the existing drawYarrowChange, ritual ledger, relation index, and local journal instead of creating parallel domain logic.

**Tech Stack:** Vanilla ES modules, localStorage, existing Node HTTP server, Node test scripts, isolated Edge CDP smoke test.

**Spec:** docs/superpowers/specs/2026-09-11-zhouyi-expansion-design.md

## Global Constraints

- 完整十八变保留为默认模式；快速演蓍只是节奏较快的替代入口。
- 所有预测性表述必须标为研读与自省用途，不把后人规则伪装成《周易》原文。
- 经典文本使用本地 JSON，不要求运行时访问远程站点。
- 320px 宽度无页面级横向溢出。
- prefers-reduced-motion 下所有非必要动画关闭。
- 关键按钮和段落链接可键盘操作。

---

### Task 1: Onboarding And Edition Metadata

**Files:** index.html, app.js, styles.css, smoke-browser.mjs

**Interfaces:** Consumes existing tenWings edition/source/retrievedAt. Produces localStorage key guanxiang-onboarding-v1, first-visit dialog, and visible edition-status block.

- [ ] Add a failing browser assertion for onboarding dialog, dismissal, and edition metadata.
- [ ] Run node smoke-browser.mjs 9228 and verify it fails because the new elements do not exist.
- [ ] Add a modal with four concise panels: how to ask, what eighteen changes means, complete versus quick mode, and interpretation boundary. Include 开始阅读 and 以后再看 actions.
- [ ] Implement showOnboardingIfNeeded, dismissOnboarding, and renderEditionStatus. Persist only a boolean dismissal flag; edition metadata always comes from ten-wings.json.
- [ ] Add Escape handling, focus the first action, and keep the 320px layout free of horizontal overflow.
- [ ] Run node smoke-browser.mjs 9228 and npm run validate. Expected: PASS.

### Task 2: Transparent Yarrow Accounting

**Files:** index.html, app.js, styles.css, smoke-browser.mjs

**Interfaces:** Consumes castState.ritual.history, drawYarrowChange, and renderChangeLedger. Produces expandable methodAudit with one row per completed change and exact formulas.

- [ ] Add a failing assertion after one quick line: methodAudit has three rows with before, removed, and remaining.
- [ ] Implement renderMethodAudit(line) from recorded change objects; never recalculate from display text.
- [ ] Show 分二、挂一、揲四、归奇, left/right remainders, and final remaining divided by four.
- [ ] Verify keyboard opening and reduced-motion readability at 320px.

### Task 3: Layered Result Reading

**Files:** index.html, app.js, styles.css, smoke-browser.mjs

**Interfaces:** Consumes showResult output, readingRule, relationsLibrary, and hexagramTexts. Produces labeled sections: 原文, 传统取法, 卦象结构, 易理提示, 我的札记.

- [ ] Add failing assertions for all five section identifiers and moving-line positions.
- [ ] Split current reading markup into named render helpers while keeping source text escaped.
- [ ] Label source text as 经文原文, generated method text as 通行变爻规则, and generated guidance as 研读提示.
- [ ] Reuse saveCurrentReadingNote and keep the note under 我的札记 only.

### Task 4: Verification And Handoff

**Files:** smoke-browser.mjs, package.json

- [ ] Run npm run validate.
- [ ] Run the isolated Edge CDP smoke test.
- [ ] Verify all HTML, JS, MJS, and JSON resources return HTTP 200.
- [ ] Record that first-stage edition status is metadata only; manual variant comparison remains a later-stage feature.
