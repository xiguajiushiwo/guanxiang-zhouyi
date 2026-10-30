import assert from 'node:assert/strict';
const targets=await (await fetch(`http://127.0.0.1:${process.argv[2]}/json/list`)).json();
const socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);const task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result)});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
async function waitFor(expression){const end=Date.now()+15000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,50))}throw new Error(`Timed out: ${expression}`)}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)}
const line={value:7,changes:[{before:49,left:24,right:25,rightAfter:24,leftR:4,rightR:4,removed:9,remaining:40},{before:40,left:20,right:20,rightAfter:19,leftR:4,rightR:3,removed:8,remaining:32},{before:32,left:16,right:16,rightAfter:15,leftR:4,rightR:3,removed:8,remaining:24}]};
const record=(id,question)=>({id,question,lines:Array(6).fill(line),originalIndex:0,changedIndex:0,moving:[],createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-01T00:00:00.000Z',completedAt:'2026-10-01T00:00:00.000Z'});
const records=[record('nav-a','面对下一次面试，我应该怎样准备？'),record('nav-b','面试之后，我该如何跟进这次机会？')];
try{
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('Network.setBypassServiceWorker',{bypass:true});
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await command('Emulation.setCPUThrottlingRate',{rate:4});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('guanxiang-onboarding-v1','dismissed');localStorage.setItem('guanxiang-account-mode-v1','guest');
    if(!localStorage.getItem('guanxiang-history-guest-v1'))localStorage.setItem('guanxiang-history-guest-v1',${JSON.stringify(JSON.stringify(records))});
    window.GUANXIANG_AI_ENDPOINT='/api/reading';const originalFetch=window.fetch.bind(window);
    window.fetch=async(url,options={})=>{const path=new URL(String(url),location.href).pathname;
      if(path==='/api/reading'){await new Promise(resolve=>window.resolveCase=resolve);return new Response(JSON.stringify({related:[{id:'nav-b',reason:'同一次面试的后续问题'}]}))}
      return originalFetch(url,options);
    };
  `});
  await command('Page.navigate',{url:'http://127.0.0.1:4175/#divination/prepare'});
  await waitFor(`document.querySelector('#view-divination.active')`);
  assert.equal(await evaluate(`document.querySelector('#siteCover').hidden`),true,'direct app routes must not return to the cover');
  await command('Page.reload');await waitFor(`document.querySelector('#view-divination.active')`);
  assert.equal(await evaluate(`document.querySelector('#siteCover').hidden`),true,'refresh preserves the active app page');
  assert.equal(await evaluate(`document.querySelectorAll('#classicsGrid .classic-reading').length`),0,'unopened classics should not build hundreds of hidden readings');
  await click('.primary-nav [data-view="hexagrams"]');
  assert.equal(await evaluate('location.hash'),'#hexagrams','catalog entry must use its list route');
  await click('.hex-row[data-index="4"]');
  assert.equal(await evaluate('location.hash'),'#hexagrams/5');
  await evaluate('history.back()');await waitFor(`location.hash==='#hexagrams'&&!document.querySelector('#view-hexagrams').classList.contains('mobile-detail-open')`);
  await evaluate('history.forward()');await waitFor(`location.hash==='#hexagrams/5'&&document.querySelector('#view-hexagrams').classList.contains('mobile-detail-open')`);
  await click('.primary-nav [data-view="history"]');await click('[data-history-id="nav-a"] .history-item-open');
  await click('[data-case-analyze]');await waitFor('Boolean(window.resolveCase)');
  await click('[data-history-back]');await click('[data-history-id="nav-b"] .history-item-open');
  await evaluate('window.resolveCase()');
  await waitFor(`JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')).find(item=>item.id==='nav-a').connections.length===1`);
  assert.equal(await evaluate(`document.querySelector('#historyDetail').dataset.recordId`),'nav-b','a slow AI response must not replace the new record');
  assert.equal(await evaluate('location.hash'),'#history/nav-b');
  await click('.primary-nav [data-view="divination"]');await click('.primary-nav [data-view="home"]');
  await click('.primary-nav [data-view="history"]');await click('.primary-nav [data-view="hexagrams"]');
  await new Promise(resolve=>setTimeout(resolve,500));
  assert.equal(await evaluate('location.hash'),'#hexagrams');
  assert.equal(await evaluate(`document.querySelector('.view.active').id`),'view-hexagrams');
  assert.equal(await evaluate('scrollY'),0,'tab changes must not leave a pending smooth scroll');
  for(const width of [320,390,1366]){await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<680});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)}
  await click('#profileButton');await waitFor(`location.pathname==='/auth'&&document.querySelector('#authForm')`);
  await evaluate('history.back()');await waitFor(`location.pathname==='/'&&document.querySelector('#view-hexagrams.active')`);
  await click('#profileButton');await waitFor(`location.pathname==='/auth'&&document.querySelector('#authForm')`);
  assert.deepEqual(errors,[]);
  console.log('Navigation passed: direct routes, reload, list/detail back-forward, slow AI completion, rapid tabs, lazy classics, responsive widths and reentering login after browser Back (4x CPU slowdown).');
}finally{socket.close()}
