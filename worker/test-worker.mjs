import assert from 'node:assert/strict';
import { consumeLimits, hashedIpKey, parseAllowedOrigins, validateReadingPayload } from './src/guards.mjs';
import worker from './src/index.mjs';

class MemoryKv{
  constructor(){this.values=new Map()}
  async get(key){return this.values.get(key)?.value??null}
  async put(key,value,options={}){this.values.set(key,{value,options})}
}
const hexagram={name:'水雷屯',upper:'水',lower:'雷',theme:'初生艰难，守正待时',imageText:'云雷屯，君子以经纶',judgment:'元亨利贞，勿用有攸往'};
const validPayload=()=>({version:1,question:'未来三个月我该如何推进职业选择？',originalIndex:2,changedIndex:4,original:hexagram,changed:{...hexagram,name:'水天需'},moving:[0],rule:{text:'一爻变，以初爻为主。',fromChanged:false,primary:[0]},primaryLines:[{label:'初六',text:'磐桓；利居贞。'}],localReading:{summary:'当前宜先辨明条件。',situation:'事情仍在形成。',turningPoint:'初爻提示先稳住基础。',trend:'之后倾向蓄势而进。',actions:['核实条件','小步验证'],cautions:['不要冒进']}});

assert.deepEqual([...parseAllowedOrigins(' https://a.example,https://b.example, https://a.example ')],['https://a.example','https://b.example']);
assert.equal(validateReadingPayload(validPayload()).ok,true);
assert.equal(validateReadingPayload({...validPayload(),question:'问'.repeat(101)}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),originalIndex:64}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),moving:[0,0]}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),extra:'not forwarded'}).value.extra,undefined);
assert.equal(validateReadingPayload({...validPayload(),localReading:{...validPayload().localReading,summary:'长'.repeat(13000)}}).ok,false);

const firstHash=await hashedIpKey('203.0.113.8','private-salt','2026091108');
const secondHash=await hashedIpKey('203.0.113.8','private-salt','2026091108');
assert.equal(firstHash,secondHash);
assert.equal(firstHash.includes('203.0.113.8'),false);

const perIpKv=new MemoryKv(),now=new Date('2026-09-11T08:00:00.000Z');
for(let count=0;count<5;count+=1)assert.equal((await consumeLimits({kv:perIpKv,ip:'203.0.113.8',salt:'salt',now,perIpLimit:5,dailyLimit:50})).ok,true);
assert.equal((await consumeLimits({kv:perIpKv,ip:'203.0.113.8',salt:'salt',now,perIpLimit:5,dailyLimit:50})).code,'RATE_LIMITED');

const globalKv=new MemoryKv();
for(let request=0;request<50;request+=1)assert.equal((await consumeLimits({kv:globalKv,ip:'203.0.113.'+(Math.floor(request/5)+1),salt:'salt',now,perIpLimit:5,dailyLimit:50})).ok,true);
assert.equal((await consumeLimits({kv:globalKv,ip:'203.0.113.99',salt:'salt',now,perIpLimit:5,dailyLimit:50})).code,'DAILY_LIMIT_REACHED');

const origin='https://reader.example';
const request=(method='POST',body=validPayload(),requestOrigin=origin)=>new Request('https://worker.example/reading',{method,headers:{origin:requestOrigin,'content-type':'application/json','cf-connecting-ip':'203.0.113.20'},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
let aiArguments;
const environment=()=>({ALLOWED_ORIGINS:origin,RATE_LIMITS:new MemoryKv(),RATE_LIMIT_SALT:'private-salt',PER_IP_HOURLY_LIMIT:'5',DAILY_LIMIT:'50',MAX_TOKENS:'900',AI_MODEL:'model-for-test',AI:{run:async(model,input)=>{aiArguments={model,input};return new Response('data: {"response":"【核心判断】\\n"}\n\ndata: {"response":"宜先观察。"}\n\ndata: [DONE]\n\n',{status:200,headers:{'content-type':'text/event-stream'}})}}});
const providerStream=()=>new ReadableStream({start(controller){const encoder=new TextEncoder();controller.enqueue(encoder.encode('data: {"response":"【当前处境】\\n"}\n\ndata: {"response":"条件正在形成。"}\n\n'));controller.enqueue(encoder.encode('data: [DONE]\n\n'));controller.close()}});

assert.equal((await worker.fetch(request('OPTIONS'),environment())).status,204);
assert.equal((await worker.fetch(request('GET'),environment())).status,405);
assert.equal((await worker.fetch(request('POST',validPayload(),'https://blocked.example'),environment())).status,403);
assert.equal((await worker.fetch(request('POST','{bad json'),environment())).status,400);
const env=environment(),response=await worker.fetch(request(),env);
assert.equal(response.status,200);
assert.equal(response.headers.get('access-control-allow-origin'),origin);
assert.equal(await response.text(),'【核心判断】\n宜先观察。');
assert.equal(aiArguments.model,'model-for-test');
assert.equal(aiArguments.input.stream,true);
assert.equal(aiArguments.input.max_tokens,900);
assert.equal(JSON.stringify(aiArguments).includes('not forwarded'),false);

const streamEnvironment=environment();
streamEnvironment.AI.run=async()=>providerStream();
const streamResponse=await worker.fetch(request(),streamEnvironment);
assert.equal(streamResponse.status,200);
assert.equal(await streamResponse.text(),'【当前处境】\n条件正在形成。');

const failing=environment();
failing.AI.run=async()=>new Response('provider details',{status:503});
const failedResponse=await worker.fetch(request(),failing);
assert.equal(failedResponse.status,503);
assert.equal((await failedResponse.json()).error.code,'MODEL_UNAVAILABLE');
const invalid=environment();
invalid.AI.run=async()=>({response:'not a stream'});
const invalidResponse=await worker.fetch(request(),invalid);
assert.equal(invalidResponse.status,503);
assert.equal((await invalidResponse.json()).error.code,'MODEL_UNAVAILABLE');
console.log('Worker guard and streaming handler tests passed.');
