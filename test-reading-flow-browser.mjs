import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const targets=await (await fetch(`http://127.0.0.1:${process.argv[2]}/json/list`)).json();
const socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;
const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(!pending.has(message.id))return;
  const {resolve,reject}=pending.get(message.id);pending.delete(message.id);
  message.error?reject(new Error(message.error.message)):resolve(message.result);
});
function command(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value}
async function waitFor(expression){const until=Date.now()+15000;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,60))}throw new Error(`Timed out: ${expression}`)}
async function viewport(width,height=844){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=680})}
async function click(selector){
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!el.contains(document.elementFromPoint(x,y)))throw new Error('Target obscured: '+${JSON.stringify(selector)});return {x,y}})()`);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function capture(name){await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`output/reading-flow/${name}.png`,Buffer.from(shot.data,'base64'))}
async function fits(){assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'content must fit the viewport')}

await mkdir('output/reading-flow',{recursive:true});
try{
  await command('Page.enable');await command('Runtime.enable');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('guanxiang-onboarding-v1','dismissed');
    if(!localStorage.getItem('guanxiang-account-mode-v1'))localStorage.setItem('guanxiang-account-mode-v1','guest');
    const originalFetch=window.fetch.bind(window);
    window.testAccount={reads:0,fail:false,records:JSON.parse(localStorage.getItem('test-cloud-records')||'[]')};
    window.fetch=async(url,options={})=>{
      const path=new URL(String(url),location.href).pathname;
      if(!path.startsWith('/api/account/'))return originalFetch(url,options);
      const api=window.testAccount;
      if(path.endsWith('/me'))return Response.json({user:{email:'reader@example.com'}});
      if(path.endsWith('/readings')){api.reads++;if(api.fail)throw new Error('Simulated connection loss');return Response.json({records:api.records})}
      if(options.method==='PUT'){const record=JSON.parse(options.body);api.records=api.records.filter(item=>item.id!==record.id).concat(record);return Response.json({record})}
      return new Response(null,{status:204});
    };
  `});
  await viewport(1366,900);
  await command('Page.navigate',{url:'http://127.0.0.1:4175/?entry=account#home'});
  await waitFor(`document.querySelector('#siteCover')?.hidden&&document.querySelector('#view-home.active')`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#view-home [data-view]')].map(el=>el.dataset.view)`),['hexagrams','classics','principles']);
  await fits();await capture('study-desktop');
  await viewport(390);await fits();await capture('study-mobile');
  await click('.nav-item[data-view="divination"]');
  await waitFor(`document.querySelector('#view-divination').dataset.phase==='prepare'`);
  await fits();await capture('question-mobile');
  await evaluate(`document.querySelector('#questionInput').value='面对下周的合作讨论，我需要注意什么？';document.querySelector('#questionInput').dispatchEvent(new Event('input'))`);
  await click('[data-cast-mode="quick"]');await click('#confirmQuestion');
  await waitFor(`document.querySelector('#divinationConfirmDialog').open`);await click('#confirmDivination');
  await waitFor(`document.querySelector('#view-divination').dataset.phase==='cast'`);
  await click('#castButton');await waitFor(`!document.querySelector('#castButton').disabled`);
  await capture('cast-mobile');await fits();
  for(let index=1;index<=6;index++){
    await click('#castButton');await waitFor(`document.querySelector('#lineCount').textContent.startsWith('${index} / 6')`);
    if(index<6)await waitFor(`!document.querySelector('#castButton').disabled`);
  }
  await waitFor(`document.querySelector('#view-divination').dataset.phase==='result'`);
  assert.equal(await evaluate(`document.querySelectorAll('#readingPanel > details[open]').length`),0);
  await fits();await capture('result-mobile');
  await viewport(1366,900);await capture('result-desktop');
  await viewport(320,740);await fits();
  await click('#readingPanel > details:nth-of-type(2) > summary');
  await fits();await click('#resultRead');
  assert.equal(await evaluate(`document.querySelector('#view-hexagrams').classList.contains('mobile-detail-open')`),true);
  await evaluate(`location.hash='#divination/result'`);await waitFor(`document.querySelector('#view-divination').classList.contains('active')`);
  await click('#nextReadingButton');await waitFor(`document.querySelector('#view-divination').dataset.phase==='prepare'`);
  await evaluate(`document.querySelector('#questionInput').value='我应该怎样为下个月的工作做好准备？';document.querySelector('#questionInput').dispatchEvent(new Event('input'))`);
  await click('[data-cast-mode="complete"]');await click('#confirmQuestion');await click('#confirmDivination');
  await click('#castButton');await waitFor(`!document.querySelector('#splitControl').classList.contains('hidden')`);
  await capture('complete-mobile');await fits();
  // Exercise all 18 changes through the actual complete-mode controls.
  for(let count=0;count<100;count++){
    if(await evaluate(`document.querySelector('#view-divination').dataset.phase==='result'`))break;
    if(await evaluate(`!document.querySelector('#splitControl').classList.contains('hidden')`)){
      await evaluate(`document.querySelector('#splitChooser').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));document.querySelector('#splitChooser').dispatchEvent(new KeyboardEvent('keyup',{key:'Enter'}))`);
    }
    await waitFor(`!document.querySelector('#castButton').disabled`);await click('#castButton');
    await waitFor(`!document.querySelector('.yarrow-stage').classList.contains('is-calculating')||document.querySelector('#view-divination').dataset.phase==='result'`);
  }
  assert.equal(await evaluate(`document.querySelector('#view-divination').dataset.phase`),'result');
  const records=await evaluate(`JSON.parse(localStorage.getItem('guanxiang-history-guest-v1'))`);
  assert.equal(records.length,2,'both casting modes save their completed readings');
  // A second device starts with no local readings, then pulls the same cloud account.
  await evaluate(`localStorage.clear();localStorage.setItem('guanxiang-account-mode-v1','account');localStorage.setItem('test-cloud-records',${JSON.stringify(JSON.stringify(records))})`);
  await command('Page.navigate',{url:'http://127.0.0.1:4175/?entry=account#history'});
  await waitFor(`document.querySelector('#syncStatus')?.classList.contains('synced')`);
  assert.equal(await evaluate(`document.querySelector('#historyCount').textContent`),'2');
  assert.equal(await evaluate(`testAccount.reads`),1,'initial sync only needs one list request');
  assert.equal(await evaluate(`document.querySelector('#accountMergeDialog').open`),false);
  await evaluate(`testAccount.fail=true;window.dispatchEvent(new Event('online'))`);
  await waitFor(`document.querySelector('#syncStatus').classList.contains('failed')`);
  assert.equal(await evaluate(`document.querySelector('#profileButton').classList.contains('signed-in')`),true);
  assert.equal(await evaluate(`document.querySelector('#historyCount').textContent`),'2');
  await evaluate(`testAccount.fail=false;testAccount.records.push({...testAccount.records[0],id:'another-device-reading'});window.dispatchEvent(new Event('online'))`);
  await waitFor(`document.querySelector('#syncStatus').classList.contains('synced')&&document.querySelector('#historyCount').textContent==='3'`);
  await evaluate(`const key=Object.keys(localStorage).find(key=>key.startsWith('guanxiang-history-account-v1:'));const local=JSON.parse(localStorage.getItem(key));local.push({...local[0],id:'previously-unsynced'});localStorage.setItem(key,JSON.stringify(local));window.dispatchEvent(new Event('online'))`);
  await waitFor(`document.querySelector('#syncStatus').classList.contains('synced')&&testAccount.records.some(record=>record.id==='previously-unsynced')`);
  assert.equal(await evaluate(`document.querySelector('#historyCount').textContent`),'4','previously unsynced local records must survive and upload');
  await fits();await capture('synced-history-mobile');
  await click('.nav-item[data-view="home"]');
  for(const language of ['en','fa','zh-CN']){
    await click('#languageToggle [data-language-menu-trigger]');
    await click(`#languageToggle [data-language="${language}"]`);
    await waitFor(`document.documentElement.lang===${JSON.stringify(language)}`);
    await fits();
    assert.equal(await evaluate(`document.querySelector('#view-home h1').textContent.includes('flow.')`),false);
  }
  await click('#themeToggle');await capture('study-dark-mobile');await click('#themeToggle');
  assert.deepEqual(errors,[],'no uncaught browser errors');
  console.log('Passed: desktop/mobile study, 320px/390px layouts, quick and full 18-change casting, result disclosure, mobile source navigation, empty-device cloud sync, failure recovery, unsynced local recovery, three languages and dark mode.');
}catch(error){console.error({browserErrors:errors});await capture('failure').catch(()=>{});throw error}finally{socket.close()}
