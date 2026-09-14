import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const port = process.argv[2] || '9224';
const host = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let targets;

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    targets = await (await fetch(`${host}/json/list`)).json();
    if (targets.length) break;
  } catch {}
  await sleep(200);
}

assert.ok(targets?.length, 'browser debugging target unavailable');
const target = targets.find(item => item.type === 'page') || targets[0];
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function setViewport(width, height, mobile) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}

async function navigate() {
  await command('Page.navigate', { url: 'http://127.0.0.1:4175/' });
  await waitFor(`document.querySelector('#siteCover') && document.querySelector('#enterSite')`);
  await sleep(900);
}

async function capture(filename) {
  const result = await command('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(filename, Buffer.from(result.data, 'base64'));
}

function coverMetricsExpression() {
  return `(() => {
    const cover=document.querySelector('#siteCover');
    const button=document.querySelector('#enterSite');
    const app=document.querySelector('.app-shell');
    const coverRect=cover.getBoundingClientRect();
    const buttonRect=button.getBoundingClientRect();
    return {
      coverVisible:!cover.hidden&&getComputedStyle(cover).display!=='none',
      coverWidth:Math.round(coverRect.width),
      coverHeight:Math.round(coverRect.height),
      viewportWidth:innerWidth,
      viewportHeight:innerHeight,
      documentWidth:document.documentElement.scrollWidth,
      buttonInside:buttonRect.left>=0&&buttonRect.right<=innerWidth&&buttonRect.top>=0&&buttonRect.bottom<=innerHeight,
      buttonHeight:Math.round(buttonRect.height),
      appInert:app.hasAttribute('inert'),
      appHidden:app.getAttribute('aria-hidden')==='true',
      activeId:document.activeElement?.id||'',
      onboardingOpen:Boolean(document.querySelector('#onboardingDialog')?.open)
    };
  })()`;
}

await command('Page.enable');
await command('Runtime.enable');
await command('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.removeItem('guanxiang-onboarding-v1')}catch{}" });
await mkdir('output/playwright', { recursive: true });

await setViewport(1440, 900, false);
await navigate();
const desktop = await evaluate(coverMetricsExpression());
assert.equal(desktop.coverVisible, true);
assert.equal(desktop.coverWidth, desktop.viewportWidth);
assert.ok(desktop.coverHeight >= desktop.viewportHeight);
assert.ok(desktop.documentWidth <= desktop.viewportWidth);
assert.equal(desktop.buttonInside, true);
assert.ok(desktop.buttonHeight >= 44);
assert.equal(desktop.appInert && desktop.appHidden, true);
assert.equal(desktop.onboardingOpen, false);
assert.equal(desktop.activeId, 'enterSite');
await capture('output/playwright/landing-desktop.png');

await evaluate(`document.querySelector('#enterSite').click(); true`);
await waitFor(`document.querySelector('#onboardingDialog')?.open`);
await waitFor(`document.querySelector('#siteCover').hidden`);
const entered = await evaluate(`({
  coverHidden:document.querySelector('#siteCover').hidden,
  appInert:document.querySelector('.app-shell').hasAttribute('inert'),
  appHidden:document.querySelector('.app-shell').hasAttribute('aria-hidden'),
  activeClass:document.querySelector('#view-home').classList.contains('active'),
  activeElement:document.activeElement?.id||document.activeElement?.className||'',
  onboardingOpen:Boolean(document.querySelector('#onboardingDialog')?.open)
})`);
assert.equal(entered.coverHidden, true);
assert.equal(entered.appInert || entered.appHidden, false);
assert.equal(entered.activeClass, true);
assert.equal(entered.onboardingOpen, true);
assert.equal(entered.activeElement, 'onboardingStart');

await setViewport(390, 844, true);
await navigate();
const mobile = await evaluate(coverMetricsExpression());
assert.equal(mobile.coverVisible, true);
assert.ok(mobile.documentWidth <= mobile.viewportWidth);
assert.equal(mobile.buttonInside, true);
assert.ok(mobile.buttonHeight >= 44);
assert.equal(mobile.appInert && mobile.appHidden, true);
assert.equal(mobile.onboardingOpen, false);
await capture('output/playwright/landing-mobile.png');

await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await navigate();
const reducedStarted = Date.now();
await evaluate(`document.querySelector('#enterSite').click(); true`);
await waitFor(`document.querySelector('#siteCover').hidden`);
const reduced = await evaluate(`({hidden:document.querySelector('#siteCover').hidden,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})`);
reduced.elapsed = Date.now() - reducedStarted;
assert.equal(reduced.hidden && reduced.reduced, true);
assert.ok(reduced.elapsed < 400);
socket.close();
console.log(JSON.stringify({ desktop, entered, mobile }, null, 2));
