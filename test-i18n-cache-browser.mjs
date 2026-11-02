import assert from 'node:assert/strict';
import {BRAND_COPY} from './brand-content.mjs';

const targets=await (await fetch(`http://127.0.0.1:${process.argv[2]}/json/list`)).json();
const socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map();
socket.addEventListener('message',event=>{const message=JSON.parse(event.data),task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result)});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value}
async function waitFor(expression){const end=Date.now()+15000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,50))}throw new Error(`Timed out: ${expression}`)}
const staleCopy={...BRAND_COPY};delete staleCopy.enterDirect;
try{
  await command('Page.enable');await command('Runtime.enable');
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('guanxiang-language','zh-CN');localStorage.setItem('guanxiang-account-mode-v1','guest');localStorage.setItem('guanxiang-onboarding-v1','dismissed')`});
  await command('Page.navigate',{url:'http://127.0.0.1:4175/#welcome'});
  await waitFor(`navigator.serviceWorker.controller&&document.body.classList.contains('intro-active')`);
  const cacheName=await evaluate(`(async()=>{const names=await caches.keys();return names.find(name=>name.startsWith('guanxiang-shell-'))})()`);
  assert.ok(cacheName);
  await evaluate(`(async()=>{const cache=await caches.open(${JSON.stringify(cacheName)});await cache.put(new URL('brand-content.mjs',location.href),new Response(${JSON.stringify('export const BRAND_COPY = '+JSON.stringify(staleCopy)+';')},{headers:{'content-type':'text/javascript'}}))})()`);
  assert.equal(await evaluate(`fetch('brand-content.mjs').then(r=>r.text()).then(text=>text.includes('enterDirect'))`),false,'the browser must actually receive the old cached dictionary');
  await command('Page.reload');
  await waitFor(`document.body.classList.contains('intro-active')&&document.querySelector('.brand-hero [data-enter-direct]')`);
  for(const [index,language] of ['zh-CN','en','fa','zh-CN'].entries()){
    if(index){await evaluate(`document.querySelector('#introLanguageToggle [data-language-menu-trigger]').click();document.querySelector('#introLanguageToggle [data-language="${language}"]').click()`)}
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const labels=await evaluate(`[...document.querySelectorAll('[data-i18n="brand.enterDirect"]')].map(el=>el.textContent)`);
    const expected=BRAND_COPY.enterDirect[language==='fa'?2:language==='en'?1:0];
    assert.deepEqual(labels,[expected,expected],`stale cached dictionary must not break ${language} labels`);
  }
  await evaluate(`document.querySelector('.brand-hero [data-enter-direct]').click()`);
  await waitFor(`location.hash==='#home'&&document.querySelector('#view-home.active')`);
  console.log('Cached language upgrade passed: stale dictionary, Chinese/English/Persian labels and direct entry with a real service worker.');
}finally{socket.close()}
