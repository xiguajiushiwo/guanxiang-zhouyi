import assert from 'node:assert/strict';
import { createServiceWorkerActivator } from './service-worker-update.mjs';

const listeners = new Map();
const container = { addEventListener(type, listener) { listeners.set(type, listener); } };
container.dispatchControllerChange = () => listeners.get('controllerchange')?.();
const worker = { messages: [], postMessage(message) { this.messages.push(message); } };
let reloads = 0;
const activate = createServiceWorkerActivator({ container, reload: () => { reloads += 1; } });
assert.equal(activate(worker), true);
assert.equal(activate(worker), false);
assert.deepEqual(worker.messages, ['SKIP_WAITING']);
container.dispatchControllerChange();
container.dispatchControllerChange();
assert.equal(reloads, 1);
console.log('Service worker update tests passed.');
