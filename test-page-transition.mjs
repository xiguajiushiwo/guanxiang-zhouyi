import assert from 'node:assert/strict';
import {
  MOTION_TIMINGS,
  installPageTransitions,
  navigateWithTransition,
  prefersReducedMotion,
  runViewTransition,
  shouldInterceptLink,
  supportsCrossDocumentTransitions,
} from './page-transition.mjs';

const BASE_URL = 'http://127.0.0.1:4175/';
const click = {
  button: 0,
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

function anchor(href, extra = {}) {
  const url = new URL(href, BASE_URL);
  return {
    href: url.href,
    target: '',
    download: '',
    ...extra,
  };
}

function fakeRoot() {
  const values = new Set();
  return {
    dataset: {},
    classList: {
      add: (...items) => items.forEach((item) => values.add(item)),
      remove: (...items) => items.forEach((item) => values.delete(item)),
      contains: (item) => values.has(item),
    },
  };
}

assert.equal(MOTION_TIMINGS.peerIn, 280);
assert.equal(prefersReducedMotion(() => ({ matches: true })), true);
assert.equal(prefersReducedMotion(() => ({ matches: false })), false);
assert.equal(supportsCrossDocumentTransitions({ CSSViewTransitionRule: class {} }), true);
assert.equal(supportsCrossDocumentTransitions({}), false);

assert.equal(shouldInterceptLink(click, anchor('/support'), BASE_URL), true);
assert.equal(shouldInterceptLink({ ...click, ctrlKey: true }, anchor('/support'), BASE_URL), false);
assert.equal(
  shouldInterceptLink(click, anchor('https://github.com/xiguajiushiwo/guanxiang-zhouyi'), BASE_URL),
  false,
);
assert.equal(shouldInterceptLink(click, anchor('/support', { target: '_blank' }), BASE_URL), false);
assert.equal(shouldInterceptLink(click, anchor('/manual.pdf', { download: 'manual.pdf' }), BASE_URL), false);
assert.equal(shouldInterceptLink(click, anchor('/auth', { hasAttribute: (name) => name === 'data-transition-manual' }), BASE_URL), false);
assert.equal(shouldInterceptLink(click, anchor('/#home'), `${BASE_URL}#history`), false);

{
  const root = fakeRoot();
  let updated = 0;
  let nativeCalls = 0;
  const documentRef = {
    startViewTransition(update) {
      nativeCalls += 1;
      update();
      return { finished: Promise.resolve() };
    },
  };
  await runViewTransition(() => { updated += 1; }, {
    kind: 'peer',
    root,
    documentRef,
    matchMediaFn: () => ({ matches: false }),
  });
  assert.equal(nativeCalls, 1);
  assert.equal(updated, 1);
  assert.equal(root.dataset.transition, undefined);
}

{
  const root = fakeRoot();
  let updated = 0;
  const waits = [];
  await runViewTransition(() => { updated += 1; }, {
    kind: 'forward',
    root,
    documentRef: {},
    matchMediaFn: () => ({ matches: false }),
    waitFn: async (duration) => { waits.push(duration); },
  });
  assert.equal(updated, 1);
  assert.deepEqual(waits, [MOTION_TIMINGS.peerOut, MOTION_TIMINGS.peerIn]);
  assert.equal(root.classList.contains('transition-fallback'), false);
}

{
  const root = fakeRoot();
  let updated = 0;
  let waited = 0;
  await runViewTransition(() => { updated += 1; }, {
    root,
    documentRef: {},
    matchMediaFn: () => ({ matches: true }),
    waitFn: async () => { waited += 1; },
  });
  assert.equal(updated, 1);
  assert.equal(waited, 0);
}

{
  const root = fakeRoot();
  let release;
  const finished = new Promise((resolve) => { release = resolve; });
  const documentRef = {
    startViewTransition(update) {
      update();
      return { finished };
    },
  };
  let updated = 0;
  const first = runViewTransition(() => { updated += 1; }, {
    root,
    documentRef,
    matchMediaFn: () => ({ matches: false }),
  });
  await runViewTransition(() => { updated += 1; }, {
    root,
    documentRef,
    matchMediaFn: () => ({ matches: false }),
  });
  assert.equal(updated, 2);
  release();
  await first;
}

{
  const root = fakeRoot();
  const documentRef = {
    startViewTransition(update) {
      update();
      return { finished: Promise.reject(new Error('cancelled')) };
    },
  };
  await assert.rejects(
    runViewTransition(() => {}, {
      root,
      documentRef,
      matchMediaFn: () => ({ matches: false }),
    }),
    /cancelled/,
  );
  assert.equal(root.dataset.transition, undefined);
  await runViewTransition(() => {}, {
    root,
    documentRef: {},
    matchMediaFn: () => ({ matches: true }),
  });
}

{
  const root = fakeRoot();
  let assigned = '';
  let waited = 0;
  await navigateWithTransition('/auth', {
    documentRef: { documentElement: root },
    locationRef: { assign: (value) => { assigned = value; } },
    windowRef: {},
    matchMediaFn: () => ({ matches: true }),
    waitFn: async () => { waited += 1; },
  });
  assert.equal(assigned, '/auth');
  assert.equal(waited, 0);
}

{
  const root = fakeRoot();
  let assigned = '';
  let waited = 0;
  await navigateWithTransition('/auth', {
    skipExit: true,
    documentRef: { documentElement: root },
    locationRef: { assign: (value) => { assigned = value; } },
    windowRef: {},
    matchMediaFn: () => ({ matches: false }),
    waitFn: async () => { waited += 1; },
  });
  assert.equal(assigned, '/auth');
  assert.equal(waited, 0);
}

{
  const root = fakeRoot();
  const listeners = new Map();
  const documentRef = {
    documentElement: root,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const windowListeners = new Map();
  const windowRef = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (windowListeners.get(type) === listener) windowListeners.delete(type);
    },
  };
  const cleanup = installPageTransitions({
    documentRef,
    windowRef,
    locationRef: { href: BASE_URL, assign() {} },
    matchMediaFn: () => ({ matches: true }),
  });
  root.classList.add('page-is-leaving', 'page-is-entering', 'transition-fallback');
  root.dataset.transition = 'peer';
  windowListeners.get('pageshow')();
  assert.equal(root.classList.contains('page-is-leaving'), false);
  assert.equal(root.classList.contains('page-is-entering'), false);
  assert.equal(root.classList.contains('transition-fallback'), false);
  assert.equal(root.dataset.transition, undefined);
  cleanup();
  assert.equal(listeners.has('click'), false);
  assert.equal(windowListeners.has('pageshow'), false);
}

console.log('Page transition controller tests passed.');
