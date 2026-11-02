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
  const state=await evaluate(`({url:location.href,ready:document.readyState,cover:document.querySelector('#siteCover')?.hidden,intro:document.querySelector('#productIntro')?.hidden,body:document.body.className,lines:[...document.querySelectorAll('#dailyCoverHexagram .cover-line b')].map(line=>({opacity:getComputedStyle(line).opacity,animations:line.getAnimations().map(a=>a.playState)}))})`);
  throw new Error(`Timed out: ${expression}\n${JSON.stringify(state)}`);
}

async function setViewport(width, height, mobile) {
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}

async function navigate() {
  await command('Page.navigate', { url: 'http://127.0.0.1:4175/' });
  await waitFor(`document.querySelector('#siteCover') && document.querySelector('#enterSite')`);
  await waitFor(`document.readyState==='complete'&&[...document.querySelectorAll('#dailyCoverHexagram .cover-line b')].every(line=>getComputedStyle(line).opacity==='1')`);
}

async function enterIntro() {
  const result=await evaluate(`(()=>{const link=document.querySelector('#enterSite');link.click();link.click();return {leaving:document.querySelector('#siteCover').classList.contains('is-leaving'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}})()`);
  assert.equal(result.leaving,!result.reduced,'normal motion animates, reduced motion enters immediately');
  await waitFor(`location.hash==='#welcome'&&document.querySelector('#siteCover').hidden&&!document.querySelector('#productIntro').hidden`);
  assert.equal(await evaluate(`document.querySelector('.app-shell').inert&&!document.querySelector('#onboardingDialog').open`),true);
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
      contentWidth:document.documentElement.clientWidth,
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
await command('Network.enable');
await command('Network.setBypassServiceWorker', { bypass: true });
await command('Page.addScriptToEvaluateOnNewDocument', { source: `
  try{localStorage.removeItem('guanxiang-onboarding-v1')}catch{}
  const originalFetch=window.fetch.bind(window);
  window.fetch=(url,options)=>{
    const path=new URL(String(url),location.href).pathname;
    if(path==='/api/account/me')return Promise.resolve(Response.json({error:'Unauthorized'},{status:401}));
    if(path==='/api/account/logout')return Promise.resolve(Response.json({ok:true}));
    return originalFetch(url,options);
  };
` });
await mkdir('output/playwright', { recursive: true });

await setViewport(1440, 900, false);
await navigate();
const desktop = await evaluate(coverMetricsExpression());
assert.equal(desktop.coverVisible, true);
assert.equal(desktop.coverWidth, desktop.contentWidth);
assert.ok(desktop.coverHeight >= desktop.viewportHeight);
assert.ok(desktop.documentWidth <= desktop.viewportWidth);
assert.equal(desktop.buttonInside, true);
assert.ok(desktop.buttonHeight >= 44);
assert.equal(desktop.appInert && desktop.appHidden, true);
assert.equal(desktop.onboardingOpen, false);
assert.equal(desktop.activeId, 'enterSite');
await capture('output/playwright/landing-desktop.png');
assert.equal(await evaluate(`document.querySelector('.cover-title-wrap h1').textContent`),'观象');
assert.equal(await evaluate(`getComputedStyle(document.querySelector('#dailyCoverHexagram .cover-line b')).animationName`),'cover-line-arrive');
// The two layouts must show the same hexagram from top line to bottom line.
assert.equal(await evaluate(`(()=>{const bits=selector=>[...document.querySelectorAll(selector+' .cover-line')].sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top).map(line=>line.children.length===1?1:0).join('');return bits('#dailyCoverHexagram')===[...document.querySelectorAll('#introDailyHexagram .cover-line')].map(line=>line.children.length===1?1:0).join('')})()`),true);
await enterIntro();
await evaluate('history.back()');await waitFor(`!document.querySelector('#siteCover').hidden&&document.querySelector('#productIntro').hidden`);
await evaluate('history.forward()');await waitFor(`document.querySelector('#siteCover').hidden&&!document.querySelector('#productIntro').hidden`);
await command('Page.reload');await waitFor(`document.readyState==='complete'&&!document.querySelector('#productIntro').hidden`);

await evaluate(`document.querySelector('#coverLogin').click(); true`);
await waitFor(`location.pathname.endsWith('/auth')||location.pathname.endsWith('/auth.html')`);
await waitFor(`document.readyState==='complete'&&document.querySelector('#authForm')`);
const authDesktop = await evaluate(`({form:Boolean(document.querySelector('#authForm')),guest:Boolean(document.querySelector('[data-guest]')),appVisible:Boolean(document.querySelector('.app-shell'))})`);
assert.equal(authDesktop.form && authDesktop.guest, true);
assert.equal(authDesktop.appVisible, false, 'inner application must not flash before authentication');
await evaluate(`document.querySelector('[data-guest]').click();true`);
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
for(const [width,height] of [[320,568],[844,390]]){
  await setViewport(width,height,true);
  const compact=await evaluate(coverMetricsExpression());
  assert.equal(compact.buttonInside,true,`entry must remain visible at ${width}×${height}`);
  assert.equal(compact.documentWidth<=compact.viewportWidth,true);
}
await setViewport(390,844,true);
await enterIntro();
await evaluate(`document.querySelector('#coverLogin').click();true`);
await waitFor(`document.querySelector('[data-guest]') && (location.pathname.endsWith('/auth')||location.pathname.endsWith('/auth.html'))`);
await waitFor(`document.readyState==='complete'`);
await evaluate(`document.querySelector('[data-guest]').click();true`);
await waitFor(`document.querySelector('#siteCover')?.hidden && document.querySelector('#profileButton')`);
const mobileAccount = await evaluate(`(()=>{const button=document.querySelector('#profileButton'),rect=button.getBoundingClientRect();return {visible:getComputedStyle(button).display!=='none'&&rect.width>0&&rect.height>0,inside:rect.left>=0&&rect.right<=innerWidth,accessible:Boolean(button.getAttribute('aria-label'))}})()`);
assert.equal(mobileAccount.visible && mobileAccount.inside && mobileAccount.accessible, true);

await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await navigate();
await enterIntro();
await evaluate(`document.querySelector('#coverLogin').click(); true`);
await waitFor(`location.pathname.endsWith('/auth')||location.pathname.endsWith('/auth.html')`);
const reduced = await evaluate(`({authVisible:Boolean(document.querySelector('#authForm')),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})`);
assert.equal(reduced.authVisible && reduced.reduced, true);

// A late animation callback must never pull users away from a newer route.
await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await navigate();
await evaluate(`document.querySelector('#enterSite').click();location.hash='#hexagrams/53'`);
await waitFor(`document.querySelector('#view-hexagrams.active')`);await sleep(1000);
assert.equal(await evaluate('location.hash'),'#hexagrams/53');
assert.equal(await evaluate(`document.querySelector('#siteCover').hidden&&document.querySelector('#productIntro').hidden`),true);
// If CSS animation completion is unavailable, the entry still has a bounded fallback.
await navigate();
await evaluate(`document.querySelector('#siteCover').style.animation='none';document.querySelector('#enterSite').click()`);
await waitFor(`location.hash==='#welcome'&&!document.querySelector('#productIntro').hidden`);
socket.close();
console.log(JSON.stringify({ desktop, authDesktop, entered, mobile, mobileAccount }, null, 2));
