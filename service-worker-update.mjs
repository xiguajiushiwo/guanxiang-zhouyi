export function createServiceWorkerActivator({ container, reload = () => globalThis.location?.reload() } = {}) {
  let activating = false;
  let reloaded = false;
  return worker => {
    if (!worker || activating) return false;
    activating = true;
    container?.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      reload();
    }, { once: true });
    worker.postMessage('SKIP_WAITING');
    return true;
  };
}
