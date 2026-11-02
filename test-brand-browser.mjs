import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const targets=await (await fetch(`http://127.0.0.1:${process.argv[2]}/json/list`)).json();
const socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);const task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result)});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value}
async function waitFor(expression){const end=Date.now()+15000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,50))}throw new Error(`Timed out: ${expression}`)}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!el.contains(document.elementFromPoint(x,y)))throw new Error('Obscured '+${JSON.stringify(selector)});return {x,y}})()`);await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point})}
async function screenshot(name){const shot=await command('Page.captureScreenshot',{format:'png'});await writeFile(`output/brand/${name}.png`,Buffer.from(shot.data,'base64'))}
async function viewport(width){await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<680})}
async function imageReady(){await waitFor(`document.querySelector('[data-share-preview]')?.naturalWidth===1080&&document.querySelector('[data-save-image]').hasAttribute('href')`)}
const line={value:7,changes:[{before:49,left:24,right:25,rightAfter:24,leftR:4,rightR:4,removed:9,remaining:40},{before:40,left:20,right:20,rightAfter:19,leftR:4,rightR:3,removed:8,remaining:32},{before:32,left:16,right:16,rightAfter:15,leftR:4,rightR:3,removed:8,remaining:24}]};
const record={id:'brand-private-record',question:'PRIVATE_QUESTION 我的面试问题',note:'PRIVATE_NOTE 我的私人札记 <img src=x onerror="window.unsafe=true">',lines:Array(6).fill(line),originalIndex:0,changedIndex:0,moving:[],createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z',completedAt:'2026-11-01T00:00:00Z'};
await mkdir('output/brand',{recursive:true});
try{
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');await command('Network.setBypassServiceWorker',{bypass:true});
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('guanxiang-onboarding-v1','dismissed');localStorage.setItem('guanxiang-account-mode-v1','guest');
    if(!localStorage.getItem('guanxiang-history-guest-v1'))localStorage.setItem('guanxiang-history-guest-v1',${JSON.stringify(JSON.stringify([record]))});
    window.painted=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){window.painted.push(String(value));return fill.call(this,value,...args)};
    Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});
    Object.defineProperty(navigator,'share',{value:async value=>{window.shared={names:value.files.map(file=>file.name),types:value.files.map(file=>file.type),title:value.title,url:value.url};if(window.shareCancelled)throw new DOMException('cancelled','AbortError');if(window.shareDenied)throw new DOMException('denied','NotAllowedError')},configurable:true});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>window.copied=value},configurable:true});
  `});
  await viewport(1366);await command('Page.navigate',{url:'http://127.0.0.1:4175/#welcome'});
  await waitFor(`document.body.classList.contains('intro-active')&&document.querySelector('[data-i18n="brand.question"]').textContent.length>10`);
  assert.equal(await evaluate(`document.querySelector('.app-shell').inert`),true);
  assert.equal(await evaluate(`document.querySelector('.brand-fictional').textContent.includes('虚构')`),true);
  await screenshot('home-desktop');
  for(const width of [320,390,1366]){await viewport(width);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);assert.equal(await evaluate(`document.querySelector('#chooseWelcomeStart').getBoundingClientRect().height>=44`),true)}
  await viewport(390);await screenshot('home-mobile');
  const beforeChoosing=await evaluate(`localStorage.getItem('guanxiang-history-guest-v1')`);
  for(const selector of ['#chooseWelcomeStart','.brand-closing [data-show-paths]']){
    await click(selector);
    assert.equal(await evaluate('location.hash'),'#welcome','both primary buttons stay on the introduction');
    assert.equal(await evaluate('document.activeElement.id'),'welcomePaths');
    assert.equal(await evaluate(`document.querySelector('.app-shell').inert`),true,'choosing an entry must not start casting');
    assert.equal(await evaluate(`localStorage.getItem('guanxiang-history-guest-v1')`),beforeChoosing);
  }
  await screenshot('paths-mobile');await viewport(1366);await evaluate(`document.querySelector('#welcomePaths').scrollIntoView({behavior:'instant'})`);await screenshot('paths-desktop');
  await click('[data-show-example]');await screenshot('example-desktop');
  for(const width of [1366,390]){await viewport(width);await evaluate(`document.querySelector('.brand-closing').scrollIntoView({behavior:'instant'})`);await screenshot(`closing-${width}`)}
  await click('[data-welcome-path="study"]');await waitFor(`document.querySelector('#view-home.active')&&document.querySelector('#productIntro').hidden`);
  await evaluate('history.back()');await waitFor(`!document.querySelector('#productIntro').hidden`);
  await viewport(390);
  await click('[data-show-example]');assert.equal(await evaluate(`document.activeElement.id`),'brandExample');await screenshot('example-mobile');
  const before=await evaluate(`localStorage.getItem('guanxiang-history-guest-v1')`);
  await click('[data-share-card="example"]');await imageReady();
  assert.equal(await evaluate(`window.painted.join(' ').includes('虚构示例')`),true);
  assert.equal(await evaluate(`localStorage.getItem('guanxiang-history-guest-v1')`),before,'example must not create real records');
  await click('[data-share-close]');await click('[data-welcome-path="question"]');await waitFor(`document.querySelector('#view-divination.active')&&document.querySelector('#siteCover').hidden`);
  assert.equal(await evaluate(`document.querySelector('#view-divination').dataset.phase`),'prepare');
  assert.equal(await evaluate(`document.querySelector('#questionInput').value`),'');
  assert.equal(await evaluate(`document.querySelector('#castButton').disabled`),true,'the explicit question entry still requires preparation and confirmation');
  assert.equal(await evaluate('location.pathname'),'/','start must not force an auth page');
  await evaluate('history.back()');await waitFor(`!document.querySelector('#productIntro').hidden`);
  await evaluate('history.forward()');await waitFor(`document.querySelector('#view-divination.active')&&document.querySelector('#siteCover').hidden`);
  await evaluate('history.back()');await waitFor(`!document.querySelector('#productIntro').hidden`);
  await click('[data-welcome-path="journal"]');await waitFor(`document.querySelector('#view-history.active')&&document.querySelector('#productIntro').hidden`);
  assert.equal(await evaluate('location.hash'),'#history');
  await command('Page.navigate',{url:'http://127.0.0.1:4175/#history/brand-private-record'});
  await waitFor(`document.querySelector('[data-share-card="record"]')`);
  await click('[data-share-card="record"]');await imageReady();
  assert.equal(await evaluate(`document.querySelectorAll('#shareCardDialog input[name="question"]:checked,#shareCardDialog input[name="note"]:checked').length`),0);
  assert.equal(await evaluate(`window.painted.join(' ').includes('PRIVATE_')`),false);
  assert.equal(await evaluate(`Boolean(window.shared||window.copied)`),false,'opening never sends or copies');
  await click('[data-copy-public]');assert.equal(await evaluate('window.copied'),'https://guanxiang.wayella.com/#hexagrams/1');
  await click('[data-send-image]');assert.deepEqual(await evaluate('window.shared'),{names:['guanxiang-card.png'],types:['image/png'],title:'观象 · Guanxiang'});
  await evaluate('window.painted=[]');await click('input[name="question"]');await imageReady();
  assert.equal(await evaluate(`window.painted.join(' ').includes('PRIVATE_QUESTION')`),true);assert.equal(await evaluate(`window.painted.join(' ').includes('PRIVATE_NOTE')`),false);
  await click('input[name="note"]');await imageReady();assert.equal(await evaluate(`window.unsafe===true`),false);
  await click('[data-share-close]');await evaluate('window.painted=[]');await click('[data-share-card="record"]');await imageReady();
  assert.equal(await evaluate(`window.painted.join(' ').includes('PRIVATE_')`),false,'private selections reset every open');
  await screenshot('share-mobile');
  await viewport(1366);await screenshot('share-desktop');
  const png=await evaluate(`fetch(document.querySelector('[data-share-preview]').src).then(r=>r.blob()).then(blob=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob)}))`);
  await writeFile('output/brand/share-public.png',Buffer.from(png,'base64'));
  await evaluate('window.shareCancelled=true');await click('[data-send-image]');assert.equal(await evaluate(`document.querySelector('[data-share-status]').textContent`),'');
  await evaluate('window.shareCancelled=false;window.shareDenied=true');await click('[data-send-image]');await waitFor(`document.querySelector('[data-share-status]').textContent.includes('未能分享')`);
  await evaluate(`window.originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null)}`);
  await click('input[name="quote"]');await waitFor(`document.querySelector('[data-share-status]').textContent.includes('生成失败')`);
  assert.equal(await evaluate(`document.querySelector('[data-save-image]').hasAttribute('href')`),false,'failure must not export the previous image');
  assert.equal(await evaluate(`document.querySelector('[data-share-preview]').hasAttribute('src')`),false);
  await evaluate('HTMLCanvasElement.prototype.toBlob=window.originalToBlob');await click('[data-share-close]');
  await command('Page.navigate',{url:'http://127.0.0.1:4175/#hexagrams/53'});await waitFor(`document.querySelector('[data-share-card="study"]')`);
  await click('[data-share-card="study"]');await imageReady();assert.equal(await evaluate(`document.querySelector('input[name="question"]')===null`),true);await click('[data-share-close]');
  await command('Page.navigate',{url:'http://127.0.0.1:4175/#welcome'});await waitFor(`document.body.classList.contains('intro-active')`);
  for(const language of ['en','fa','zh-CN']){
    await viewport(390);await click('#introLanguageToggle [data-language-menu-trigger]');await click(`#introLanguageToggle [data-language="${language}"]`);
    for(const width of [320,390,1366]){await viewport(width);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${language} at ${width}px`)}
    await viewport(390);
    await click('[data-welcome-top]');await screenshot(`welcome-${language}`);
    await click('[data-share-card="example"]');await imageReady();assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await screenshot(`example-card-${language}`);await click('[data-share-close]');
  }
  await evaluate(`document.body.classList.add('dark-mode')`);await click('[data-share-card="example"]');await imageReady();await screenshot('share-dark');
  assert.deepEqual(errors,[]);
  console.log('Brand browser passed: mobile/desktop, start/back/forward, fictional example isolation, private opt-in/reset, public links, PNG preview, native share/cancel/fallback, failed-image cleanup, three languages and dark mode.');
}catch(error){await screenshot('failure').catch(()=>{});throw error}finally{socket.close()}
