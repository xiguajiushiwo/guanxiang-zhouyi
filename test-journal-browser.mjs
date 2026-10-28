import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const targets=await (await fetch(`http://127.0.0.1:${process.argv[2]}/json/list`)).json();
const socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(!pending.has(message.id))return;const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)});
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value}
async function waitFor(expression){const until=Date.now()+18000;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,80))}throw new Error(`Timed out: ${expression}`)}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!el.contains(document.elementFromPoint(x,y)))throw new Error('Obscured: '+${JSON.stringify(selector)});return {x,y}})()`);await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point})}
async function fill(id,value){await evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}))})()`)}
async function fits(){assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'must fit the viewport')}
async function screenshot(name){const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`output/journal/${name}.png`,Buffer.from(shot.data,'base64'))}
const line={value:7,changes:[{before:49,left:24,right:25,rightAfter:24,leftR:1,rightR:3,removed:5,remaining:44},{before:44,left:20,right:24,rightAfter:23,leftR:4,rightR:3,removed:8,remaining:36},{before:36,left:16,right:20,rightAfter:19,leftR:4,rightR:3,removed:8,remaining:28}]};
const aiText='【核心判断】\n先整理作品再沟通。\n【当前处境】\n条件仍在形成。\n【关键变化】\n先核实转折条件。\n思考方向：哪些条件已经具备？\n思维调整：逐步验证条件。\n【后续趋势】\n后续倾向逐步展开。\n【行动建议】\n1. 核实事实\n2. 小步验证\n3. 按期复盘';
const seed={id:'journal-test',question:'面对下个月的求职，我可以如何准备？',lines:Array(6).fill(line),originalIndex:0,changedIndex:0,moving:[],note:'旧札记保留',completedAt:'2026-01-01T00:00:00.000Z',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',aiReading:{text:aiText,generatedAt:'2026-01-01T00:00:00.000Z',language:'zh-CN'}};
await mkdir('output/journal',{recursive:true});
try{
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('Network.setBypassServiceWorker',{bypass:true});
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.GUANXIANG_AI_ENDPOINT='/api/reading';
    localStorage.setItem('guanxiang-onboarding-v1','dismissed');
    if(!sessionStorage.getItem('journal-seeded')){localStorage.setItem('guanxiang-account-mode-v1','guest');localStorage.setItem('guanxiang-history-guest-v1',JSON.stringify([${JSON.stringify(seed)}]));sessionStorage.setItem('journal-seeded','yes');sessionStorage.setItem('library-failure','yes')}
    const originalFetch=window.fetch.bind(window);window.aiCalls=0;window.cloudRecords=JSON.parse(sessionStorage.getItem('cloud-records')||'[]');
    window.fetch=async(url,options={})=>{
      const path=new URL(String(url),location.href).pathname;
      if(path.endsWith('hexagram-texts.json')&&sessionStorage.getItem('library-failure'))return new Response('',{status:503});
      if(path==='/api/reading'){window.aiCalls++;await new Promise(resolve=>setTimeout(resolve,300));if(window.failAi)return Response.json({error:{code:'SERVICE_ERROR'}},{status:503});return new Response(${JSON.stringify(aiText.replace('先整理作品再沟通。','新版本：核实岗位要求。').replace('条件仍在形成。','条件仍在形成。'+'每一步需要事实反馈，记录实际行动，保持调整空间。'.repeat(80)))})}
      if(path.endsWith('/api/account/me')){await new Promise(resolve=>setTimeout(resolve,150));return Response.json({user:{email:'journal@example.com'}})}
      if(path.endsWith('/api/account/readings')){await new Promise(resolve=>setTimeout(resolve,150));return Response.json({records:window.cloudRecords})}
      if(path.startsWith('/api/account/readings/')&&options.method==='PUT'){const record=JSON.parse(options.body);window.cloudRecords=window.cloudRecords.filter(item=>item.id!==record.id).concat(record);sessionStorage.setItem('cloud-records',JSON.stringify(window.cloudRecords));return Response.json({record})}
      return originalFetch(url,options);
    };
  `});
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await command('Page.navigate',{url:'http://127.0.0.1:4175/?entry=account#history/journal-test'});
  await waitFor(`document.querySelector('.journal-panel form')&&document.querySelector('[data-library-retry]')`);
  assert.equal(await evaluate(`location.hash`),'#history/journal-test');
  assert.equal(await evaluate(`document.querySelector('#historyDetail').textContent.includes('先整理作品再沟通')`),true);
  assert.equal(await evaluate(`document.querySelector('#historyNote').value`),'旧札记保留');
  await fill('journal-intention','当时希望尽快转岗');
  await evaluate(`sessionStorage.removeItem('library-failure')`);await click('#historyDetail [data-library-retry]');
  await waitFor(`!document.querySelector('#historyDetail .history-source-status')`);
  assert.equal(await evaluate(`document.querySelector('#journal-intention').value`),'当时希望尽快转岗','draft survives loading completion');
  await fill('journal-action','本周修改作品并投递三个岗位');await fill('journal-date','2020-01-01');await click('.journal-plan button[type="submit"]');
  await waitFor(`document.querySelector('.journal-save-status').textContent==='已保存'`);
  await fill('journal-progress','空间不足时也要保留草稿');
  await evaluate(`window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='guanxiang-history-guest-v1')throw new DOMException('Full','QuotaExceededError');return window.originalStorageSet.call(this,key,value)}`);
  await click('.journal-progress button');await waitFor(`document.querySelector('.journal-save-status').textContent.includes('保存失败')`);
  assert.equal(await evaluate(`document.querySelector('#journal-progress').value`),'空间不足时也要保留草稿');
  await evaluate(`Storage.prototype.setItem=window.originalStorageSet`);
  await fill('journal-progress','收到面试邀请 <img src=x onerror="window.unsafe=true">');await click('.journal-progress button');
  await waitFor(`document.querySelectorAll('.journal-timeline article').length===1`);
  assert.equal(await evaluate(`window.unsafe===true`),false);
  assert.equal(await evaluate(`document.querySelector('#journal-progress').value`),'');
  await click('[data-history-back]');await click('[data-journal-filter="due"]');
  assert.equal(await evaluate(`document.querySelectorAll('.history-item').length`),1);
  await click('.history-item-open');await click('.journal-review > summary');
  for(const [key,value] of Object.entries({facts:'收到两次面试邀请',actions:'修改作品并投递三个岗位',assessment:'作品准备有所帮助；其他判断仍无法判断',nextStep:'先核实岗位要求，再准备针对性的作品'}))await fill('journal-'+key,value);
  await click('.journal-review button');await waitFor(`document.querySelector('.journal-heading .journal-badge').classList.contains('reviewed')`);
  assert.equal(await evaluate(`document.querySelectorAll('.journal-timeline article').length`),2);
  await evaluate(`document.querySelector('.journal-heading').scrollIntoView({block:'start',behavior:'instant'})`);await screenshot('review-mobile');await fits();
  await command('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await fits();
  await command('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await fits();
  await evaluate(`document.querySelector('.journal-heading').scrollIntoView({block:'start',behavior:'instant'})`);await screenshot('review-desktop');
  await command('Page.reload');await waitFor(`document.querySelectorAll('.journal-timeline article').length===2&&!document.querySelector('#historyDetail .history-source-status')`);
  await evaluate('window.failAi=true');await click('[data-history-ai]');
  await waitFor(`!document.querySelector('[data-history-ai-error]').classList.contains('hidden')`);
  assert.equal(await evaluate(`document.querySelector('[data-history-ai-content]').textContent.includes('先整理作品再沟通')`),true,'failed regeneration keeps the saved reading visible');
  await evaluate('window.failAi=false');
  await click('[data-history-ai]');await waitFor(`JSON.parse(localStorage.getItem('guanxiang-history-guest-v1'))[0].aiReadings?.length===2`);
  const saved=await evaluate(`JSON.parse(localStorage.getItem('guanxiang-history-guest-v1'))[0]`);
  assert.equal(saved.aiReadings[0].text,aiText);assert.match(saved.aiReading.text,/新版本/);
  assert.equal(saved.journal.status,'reviewed');assert.equal(saved.journal.entries.length,2);
  // A fresh device must retain the requested detail route while account and cloud data arrive.
  await evaluate(`sessionStorage.setItem('cloud-records',JSON.stringify([${JSON.stringify(saved)}]));localStorage.removeItem('guanxiang-history-guest-v1');localStorage.setItem('guanxiang-account-mode-v1','account')`);
  await command('Page.reload');await waitFor(`document.querySelector('#syncStatus').classList.contains('synced')&&document.querySelectorAll('.journal-timeline article').length===2`);
  assert.equal(await evaluate(`location.hash`),'#history/journal-test');
  await fill('journal-progress','第二台设备补充了一次电话沟通');await click('.journal-progress button');
  await waitFor(`document.querySelector('#syncStatus').classList.contains('synced')&&window.cloudRecords[0].journal.entries.length===3`);
  await fill('journal-progress','还没提交的草稿');await evaluate(`window.dispatchEvent(new Event('online'))`);await waitFor(`document.querySelector('#syncStatus').classList.contains('synced')`);
  assert.equal(await evaluate(`document.querySelector('#journal-progress').value`),'还没提交的草稿','sync must not erase drafts');
  await click('[data-history-ai]');await waitFor(`document.querySelector('#syncStatus').classList.contains('synced')&&window.cloudRecords[0].aiReadings.length===3`);
  assert.equal(await evaluate(`document.querySelectorAll('.history-reading-versions > details').length`),3);
  await click('[data-history-back]');await click('[data-journal-filter="due"]');assert.equal(await evaluate(`document.querySelectorAll('.history-item').length`),0);
  await click('[data-journal-filter="reviewed"]');assert.equal(await evaluate(`document.querySelectorAll('.history-item').length`),1);
  await click('.history-item-open');
  for(const language of ['en','fa','zh-CN']){
    await click('#languageToggle [data-language-menu-trigger]');await click('#languageToggle [data-language="'+language+'"]');
    await waitFor('document.documentElement.lang==='+JSON.stringify(language));await fits();
    assert.equal(await evaluate(`document.querySelector('.journal-panel').textContent.includes('undefined')`),false);
  }
  assert.deepEqual(errors,[]);
  console.log('Journal browser passed: failed sources/retry, saved AI visibility, draft preservation, mobile/desktop, progress, review filters, refresh, original AI retention, delayed account detail routes, cloud updates and AI sync.');
}catch(error){console.error({browserErrors:errors,body:await evaluate(`document.querySelector('#historyDetail')?.textContent.slice(-1500)`).catch(()=>null)});await screenshot('failure').catch(()=>{});throw error}finally{socket.close()}
