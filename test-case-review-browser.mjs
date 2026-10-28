import assert from 'node:assert/strict';
const targets=await (await fetch(`http://127.0.0.1:${process.argv[2]}/json/list`)).json();
const socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(!pending.has(message.id))return;const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value}
async function waitFor(expression){const until=Date.now()+15000;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,80))}throw new Error(`Timed out: ${expression}`)}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)}
const line={value:7,changes:[{before:49,left:24,right:25,rightAfter:24,leftR:1,rightR:3,removed:5,remaining:44},{before:44,left:20,right:24,rightAfter:23,leftR:4,rightR:3,removed:8,remaining:36},{before:36,left:16,right:20,rightAfter:19,leftR:4,rightR:3,removed:8,remaining:28}]};
const reviewText={readingIds:['case-a','case-b'],summary:'同一件事先准备后跟进。',continuities:'两次都围绕同一场面试。',changes:'问题从准备转为跟进，现实进展增加了一次反馈。',uncertainties:'最终结果还不能判断。',nextStep:'记录下一次反馈。'};
const make=(id,question,date,connections=[])=>({id,question,lines:Array(6).fill(line),originalIndex:0,changedIndex:1,moving:[],completedAt:date,createdAt:date,updatedAt:date,note:'',connections,caseReviews:[]});
const a=make('case-a','我该如何准备这次面试？','2026-01-01T00:00:00.000Z');
const b=make('case-b','面试之后我该怎样跟进？','2026-02-01T00:00:00.000Z',[{id:'case-a',kind:'followup',reason:'同一场面试',updatedAt:'2026-02-01T01:00:00.000Z'}]);
try{
  await command('Page.enable');await command('Runtime.enable');await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.GUANXIANG_AI_ENDPOINT='/api/reading';localStorage.setItem('guanxiang-onboarding-v1','dismissed');localStorage.setItem('guanxiang-account-mode-v1','guest');localStorage.setItem('guanxiang-history-guest-v1',${JSON.stringify(JSON.stringify([a,b]))});
    const originalFetch=window.fetch.bind(window);window.fetch=async(url,options={})=>{const path=new URL(String(url),location.href).pathname;if(path==='/api/reading'){const payload=JSON.parse(options.body);const body=payload.task==='journal-links'?JSON.stringify({related:[{id:'case-b',reason:'两个问题都围绕同一场面试。'}]}):JSON.stringify(${JSON.stringify(reviewText)});return new Response(body)}return originalFetch(url,options)};
  `});
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await command('Page.navigate',{url:'http://127.0.0.1:4175/?entry=account#history/case-a'});
  await waitFor(`document.querySelector('.case-review-panel')&&document.querySelectorAll('.case-reading').length===2`);
  assert.equal(await evaluate(`document.querySelector('.case-review-panel').textContent.includes('同一件事')`),true);
  await click('[data-case-review]');await waitFor(`document.querySelector('.case-report')`);assert.equal(await evaluate(`document.querySelector('.case-report').textContent.includes('先准备后跟进')`),true);
  await evaluate(`document.querySelector('[data-case-analyze]').disabled=false`);await click('[data-case-analyze]');await waitFor(`document.querySelectorAll('.case-reading small').length>0`);
  const updated=await evaluate(`JSON.parse(localStorage.getItem('guanxiang-history-guest-v1')).find(item=>item.id==='case-a').connections`);assert.equal(updated[0].id,'case-b');assert.equal(updated[0].kind,'ai');
  await click('[data-case-followup]');await waitFor(`document.querySelector('#view-divination').classList.contains('active')&&document.querySelector('#questionInput').value==='我该如何准备这次面试？'`);assert.equal(await evaluate(`Boolean(document.querySelector('#followupContext'))`),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);assert.deepEqual(errors,[]);
  console.log('Case review browser passed: linked chain, AI comparison, AI association, and follow-up question entry.');
}finally{socket.close()}
