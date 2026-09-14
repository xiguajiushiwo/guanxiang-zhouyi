# Landing Cover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-action brand cover that appears on every page load and reveals the existing study application when entered.

**Architecture:** Keep the cover and study application in the same document. A small `initLandingCover()` controller applies temporary accessibility isolation, owns the one-way `cover` to `entered` transition, and leaves the existing hash-based view router untouched.

**Tech Stack:** Semantic HTML, existing CSS custom properties, vanilla JavaScript, Node.js structural tests, existing local HTTP server and browser smoke checks.

**Spec:** `docs/superpowers/specs/2026-09-11-landing-cover-design.md`

## Global Constraints

- Every full page load starts on the cover; no entry state is persisted in storage, cookies, the hash, or query parameters.
- The visible cover has one action named `进入观象`.
- Existing study views, navigation, data loading, divination, annotations, and history behavior remain unchanged.
- No framework, package, font, or remote visual dependency is added.
- Keyboard focus, `inert`, `aria-hidden`, narrow screens, short screens, and `prefers-reduced-motion` must be handled.

---

### Task 1: Cover State And Semantic Entry

**Files:**
- Create: `test-landing.mjs`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `.app-shell`, `#view-home`, and the page's `DOMContentLoaded` initialization.
- Produces: `#siteCover`, `#enterSite`, `.app-shell`, and `initLandingCover(): void`.

- [ ] **Step 1: Write the failing structural test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
]);

assert.match(html, /id="siteCover"/);
assert.match(html, /id="enterSite"[^>]*>\s*进入观象/);
assert.equal((html.match(/进入观象/g) || []).length, 1);
assert.match(script, /function initLandingCover\(\)/);
assert.match(script, /removeAttribute\(['"]inert['"]\)/);
assert.match(script, /setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/);
console.log('首页封面结构校验通过。');
```

- [ ] **Step 2: Run the test and verify the initial failure**

Run: `node test-landing.mjs`

Expected: FAIL because `#siteCover` and `initLandingCover()` do not exist.

- [ ] **Step 3: Add the semantic cover markup**

Insert `#siteCover` before `.app-shell`. It contains the brand name, the quote `观乎天文，以察时变`, a six-line decorative figure marked `aria-hidden="true"`, one `<button id="enterSite">进入观象</button>`, and a `<noscript>` note. Add `tabindex="-1"` to `.main-content` so focus can move there after entry.

- [ ] **Step 4: Implement the one-way controller**

```js
function initLandingCover() {
  const cover = $('#siteCover');
  const app = $('.app-shell');
  const enter = $('#enterSite');
  if (!cover || !app || !enter) return;
  app.setAttribute('inert', '');
  app.setAttribute('aria-hidden', 'true');
  document.body.classList.add('cover-active');
  enter.addEventListener('click', () => {
    if (cover.classList.contains('is-leaving')) return;
    cover.classList.add('is-leaving');
    const finish = () => {
      cover.hidden = true;
      app.removeAttribute('inert');
      app.removeAttribute('aria-hidden');
      document.body.classList.remove('cover-active');
      $('.main-content')?.focus({ preventScroll: true });
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else cover.addEventListener('animationend', finish, { once: true });
  });
  requestAnimationFrame(() => enter.focus({ preventScroll: true }));
}
```

Call `initLandingCover()` first in the existing `DOMContentLoaded` callback. Do not call `nav()` or alter `location.hash` during entry.

- [ ] **Step 5: Add the test to validation and verify it passes**

Add `node test-landing.mjs` to the existing `validate` script, then run `node test-landing.mjs`.

Expected: `首页封面结构校验通过。`

- [ ] **Step 6: Commit the functional entry**

```bash
git add index.html app.js package.json test-landing.mjs
git commit -m "feat: add site landing entry"
```

### Task 2: Distinctive Cover Visual And Responsive QA

**Files:**
- Create: `landing.css`
- Modify: `test-landing.mjs`
- Test: `smoke-browser.mjs`

**Interfaces:**
- Consumes: `#siteCover`, `.cover-hexagram`, `.cover-line`, `.is-leaving`, `.cover-active`, and `#enterSite` from Task 1.
- Produces: a full-viewport cover at desktop and mobile widths with an animation-free reduced-motion path.

- [ ] **Step 1: Extend the failing structural test for visual contracts**

```js
const styles = await readFile(new URL('./landing.css', import.meta.url), 'utf8');
assert.match(styles, /\.site-cover\s*\{/);
assert.match(styles, /\.cover-hexagram\s*\{/);
assert.match(styles, /@media\s*\(max-width:\s*680px\)/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);
```

- [ ] **Step 2: Run the test and verify the visual-contract failure**

Run: `node test-landing.mjs`

Expected: FAIL because `.site-cover` styles do not exist.

- [ ] **Step 3: Build the cover token system and layout**

Add a scoped cover palette using `--cover-ink: #171b19`, `--cover-bronze: #566f64`, `--cover-paper: #e4e7e1`, `--cover-vermilion: #a94732`, and `--cover-stone: #777d78`. Use a stable `100svh` layout with height and width constraints, brand-first typography, a centered six-line figure, restrained structural rules, and no card containers or decorative gradients.

- [ ] **Step 4: Add deliberate entrance and exit motion**

Animate the six lines as one sequenced composition on load. On `.is-leaving`, open the lines outward and fade the cover once; ensure `animationend` fires on the cover itself. Disable all cover animation and transition durations under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Add responsive and accessibility rules**

At `680px`, keep a single centered column, cap the hexagram by both viewport dimensions, preserve a 44px minimum action height, and prevent text overflow. Add a strong `:focus-visible` state and lock document overflow only while `.cover-active` is present.

- [ ] **Step 6: Run automated validation**

Run: `npm run validate`

Expected: all data, syntax, yarrow, and landing-cover checks pass.

- [ ] **Step 7: Run browser smoke checks and visual review**

Run the existing local server, then inspect the cover at desktop `1440x900` and mobile `390x844`. Verify the cover is the first visible screen, no app content is keyboard-accessible before entry, the only action enters the existing `#home` view, refresh restores the cover, no horizontal overflow exists, and the console has no new errors.

- [ ] **Step 8: Commit the finished cover**

```bash
git add landing.css test-landing.mjs
git commit -m "style: design guanxiang landing cover"
```

