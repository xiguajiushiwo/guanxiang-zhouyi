export const MOTION_TIMINGS = Object.freeze({
  peerOut: 180,
  peerIn: 280,
  detail: 280,
  crossExit: 180,
  crossEnter: 220,
});

const TRANSITION_CLASSES = [
  'page-is-leaving',
  'page-is-entering',
  'transition-fallback',
  'transition-fallback-out',
  'transition-fallback-in',
];

let transitionPending = false;
const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export function prefersReducedMotion(matchMediaFn = globalThis.matchMedia) {
  return Boolean(matchMediaFn?.('(prefers-reduced-motion: reduce)')?.matches);
}

export function supportsCrossDocumentTransitions(windowRef = globalThis) {
  return typeof windowRef?.CSSViewTransitionRule === 'function';
}

export function shouldInterceptLink(event, anchor, currentUrl = globalThis.location?.href) {
  if (
    !anchor
    || event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) return false;

  if ((anchor.target && anchor.target !== '_self') || anchor.download) return false;

  const current = new URL(currentUrl);
  const target = new URL(anchor.href, current);
  if (!['http:', 'https:'].includes(target.protocol) || target.origin !== current.origin) return false;

  return !(target.pathname === current.pathname && target.search === current.search && target.hash);
}

function clearTransitionState(root) {
  if (!root) return;
  root.classList?.remove(...TRANSITION_CLASSES);
  if (root.dataset) delete root.dataset.transition;
}

export async function runViewTransition(update, {
  kind = 'peer',
  root = globalThis.document?.documentElement,
  documentRef = globalThis.document,
  matchMediaFn = globalThis.matchMedia,
  waitFn = wait,
} = {}) {
  if (transitionPending || prefersReducedMotion(matchMediaFn) || !root) {
    await update();
    return;
  }

  transitionPending = true;
  root.dataset.transition = kind;

  try {
    if (typeof documentRef?.startViewTransition === 'function') {
      const transition = documentRef.startViewTransition(update);
      await transition.finished;
      return;
    }

    root.classList.add('transition-fallback', 'transition-fallback-out');
    await waitFn(MOTION_TIMINGS.peerOut);
    await update();
    root.classList.remove('transition-fallback-out');
    root.classList.add('transition-fallback-in');
    await waitFn(kind === 'peer' ? MOTION_TIMINGS.peerIn : MOTION_TIMINGS.detail);
  } finally {
    clearTransitionState(root);
    transitionPending = false;
  }
}

export async function navigateWithTransition(url, {
  skipExit = false,
  documentRef = globalThis.document,
  locationRef = globalThis.location,
  matchMediaFn = globalThis.matchMedia,
  waitFn = wait,
  windowRef = globalThis,
} = {}) {
  if (!locationRef?.assign) return false;

  if (
    skipExit
    || prefersReducedMotion(matchMediaFn)
    || supportsCrossDocumentTransitions(windowRef)
    || !documentRef?.documentElement
  ) {
    locationRef.assign(url);
    return true;
  }

  if (transitionPending) return false;
  transitionPending = true;
  const root = documentRef.documentElement;
  root.dataset.transition = 'page';
  root.classList.add('page-is-leaving');

  try {
    await waitFn(MOTION_TIMINGS.crossExit);
    locationRef.assign(url);
    return true;
  } catch (error) {
    clearTransitionState(root);
    transitionPending = false;
    throw error;
  }
}

export function installPageTransitions({
  documentRef = globalThis.document,
  windowRef = globalThis,
  locationRef = globalThis.location,
  matchMediaFn = globalThis.matchMedia,
  waitFn = wait,
} = {}) {
  const root = documentRef?.documentElement;
  if (!root || !documentRef?.addEventListener || !windowRef?.addEventListener) return () => {};

  const reset = () => {
    clearTransitionState(root);
    transitionPending = false;
  };

  const handleClick = (event) => {
    const anchor = event.target?.closest?.('a[href]');
    if (!shouldInterceptLink(event, anchor, locationRef.href)) return;
    event.preventDefault();
    void navigateWithTransition(anchor.href, {
      documentRef,
      locationRef,
      matchMediaFn,
      waitFn,
      windowRef,
    }).catch(() => locationRef.assign(anchor.href));
  };

  documentRef.addEventListener('click', handleClick, true);
  windowRef.addEventListener('pageshow', reset);

  if (!prefersReducedMotion(matchMediaFn) && !supportsCrossDocumentTransitions(windowRef)) {
    root.classList.add('page-is-entering');
    void waitFn(MOTION_TIMINGS.crossEnter).then(() => root.classList.remove('page-is-entering'));
  }

  return () => {
    documentRef.removeEventListener('click', handleClick, true);
    windowRef.removeEventListener('pageshow', reset);
    reset();
  };
}
