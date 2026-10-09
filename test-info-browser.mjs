import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const port=process.argv[2]||'9224';
const host=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let targets;
for(let attempt=0;attempt<40;attempt+=1){
  try{targets=await (await fetch(`${host}/json/list`)).json();if(targets.length)break}catch{}
  await sleep(200);
}
assert.ok(targets?.length,'browser debugging target unavailable');
const target=targets.find(item=>item.type==='page')||targets[0];
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});

let commandId=0;
const pending=new Map();
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(!message.id||!pending.has(message.id))return;
  const request=pending.get(message.id);pending.delete(message.id);
  if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result);
});
function command(method,params={}){const id=++commandId;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}))}
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value}
async function waitFor(expression,timeout=10000){const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(expression))return;await sleep(100)}throw new Error(`Timed out: ${expression}`)}
async function setViewport(width,height,mobile){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile})}
async function navigate(path){await command('Page.navigate',{url:`http://127.0.0.1:4175${path}`});await waitFor(`document.body?.dataset.infoPage&&document.querySelector('[data-info-title]')`)}
async function capture(filename){const result=await command('Page.captureScreenshot',{format:'png',fromSurface:true});await writeFile(filename,Buffer.from(result.data,'base64'))}

await command('Page.enable');
await command('Runtime.enable');
await mkdir('output/playwright',{recursive:true});

await setViewport(1440,900,false);
await navigate('/support');
const desktop=await evaluate(`({
  page:document.body.dataset.infoPage,
  navCount:document.querySelectorAll('[data-info-shell-nav] a').length,
  current:document.querySelector('[data-info-shell-nav] [aria-current="page"]')?.getAttribute('href'),
  placeholder:document.querySelector('.info-placeholder strong')?.textContent,
  github:document.querySelector('[data-social="github"]')?.href,
  unavailable:document.querySelectorAll('[data-social-unavailable]').length,
  overflow:document.documentElement.scrollWidth>innerWidth
})`);
assert.equal(desktop.page,'support');
assert.equal(desktop.navCount,7);
assert.equal(desktop.current,'./support');
assert.equal(desktop.placeholder,'即将开放');
assert.equal(desktop.github,'https://github.com/xiguajiushiwo/guanxiang-zhouyi');
assert.equal(desktop.unavailable,3);
assert.equal(desktop.overflow,false);
await capture('output/playwright/info-desktop.png');

await evaluate(`document.querySelector('[data-info-key="privacy"]').click();true`);
await waitFor(`location.pathname==='/privacy'&&document.body.dataset.infoPage==='privacy'`);
await sleep(350);
const transitionState=await evaluate(`({path:location.pathname,leaving:document.documentElement.classList.contains('page-is-leaving'),entering:document.documentElement.classList.contains('page-is-entering'),overflow:document.documentElement.scrollWidth>innerWidth})`);
assert.deepEqual(transitionState,{path:'/privacy',leaving:false,entering:false,overflow:false});

await setViewport(390,844,true);
await navigate('/privacy');
const mobile=await evaluate(`(()=>{
  const targets=[...document.querySelectorAll('.info-shell-link,.info-footer-home,[data-info-language-trigger]')];
  return {overflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...targets.map(item=>item.getBoundingClientRect().height)),title:document.querySelector('[data-info-title]').textContent,back:document.querySelector('.info-footer-home')?.textContent};
})()`);
assert.equal(mobile.overflow,false);
assert.ok(mobile.minTarget>=44);
assert.equal(mobile.title,'隐私');
assert.equal(mobile.back.replace(/\s+/g,' '),'← 返回首页');
await capture('output/playwright/info-mobile.png');

await setViewport(320,700,true);
await navigate('/feedback');
assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
await evaluate(`document.querySelector('[data-info-language-trigger]').click();document.querySelector('[data-language="fa"]').click();true`);
await waitFor(`document.documentElement.lang==='fa'&&document.documentElement.dir==='rtl'`);
const persian=await evaluate(`({title:document.querySelector('[data-info-title]').textContent,description:document.querySelector('[data-info-description]').textContent,back:document.querySelector('.info-footer-home').textContent,overflow:document.documentElement.scrollWidth>innerWidth})`);
assert.equal(persian.title,'بازخورد');
assert.ok(persian.description.length>10);
assert.equal(persian.back.replace(/\s+/g,' '),'← بازگشت به صفحه اصلی');
assert.equal(persian.overflow,false);

await evaluate(`document.querySelector('[data-info-language-trigger]').click();document.querySelector('[data-language="en"]').click();true`);
await waitFor(`document.documentElement.lang==='en'&&document.documentElement.dir==='ltr'`);
assert.equal(await evaluate(`document.title`),'Feedback · Guanxiang');
await navigate('/support');
await waitFor(`document.documentElement.lang==='en'`);
const english=await evaluate(`({
  brand:document.querySelector('.info-brand b').textContent,
  firstTitle:document.querySelector('[data-info-key-title]').textContent,
  section:document.querySelector('.info-section-label').textContent,
  social:document.querySelector('[data-social-name="xiaohongshu"]').textContent
})`);
assert.deepEqual(english,{brand:'Guanxiang',firstTitle:'Support Center',section:'Information and support',social:'Xiaohongshu'});

socket.close();
console.log(JSON.stringify({desktop,mobile,persian,english},null,2));
