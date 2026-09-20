import assert from 'node:assert/strict';
import { consumeLimits, hashedIpKey, parseAllowedOrigins, validateReadingPayload } from './src/guards.mjs';
import worker, { clientIpForRequest, promptFor, trustedProxySecret } from './src/index.mjs';
import { ReadingRateLimiter } from './src/rate-limiter.mjs';

class MemoryStorage {
  constructor(){this.values=new Map();this.queue=Promise.resolve()}
  async get(key){return this.values.get(key)??null}
  async put(key,value){this.values.set(key,value)}
  async transaction(callback){const run=this.queue.then(()=>callback(this));this.queue=run.catch(()=>{});return run}
}
class MemoryNamespace {
  constructor(){this.storage=new MemoryStorage();this.object=new ReadingRateLimiter({storage:this.storage})}
  idFromName(name){return name}
  get(id){return id==='global'?{fetch:(input,init)=>this.object.fetch(new Request(input,init))}:null}
}
const hexagram={name:'水雷屯',upper:'水',lower:'雷',theme:'初生艰难，守正待时',imageText:'云雷屯，君子以经纶',judgment:'元亨利贞，勿用有攸往',lines:[{label:'初六',text:'磐桓，利居贞，利建侯。'},{label:'六二',text:'屯如邅如，乘马班如。'},{label:'六三',text:'即鹿无虞，惟入于林中。'},{label:'六四',text:'乘马班如，求婚媾。'},{label:'九五',text:'屯其膏，小贞吉，大贞凶。'},{label:'上六',text:'乘马班如，泣血涟如。'}]};
const validPayload=()=>({version:1,question:'未来三个月我该如何推进职业选择？',originalIndex:2,changedIndex:4,original:hexagram,changed:{...hexagram,name:'水天需'},moving:[0],movingLines:[{position:1,label:'初六',text:'磐桓，利居贞，利建侯。'}],rule:{text:'一爻变，以初爻为主。',fromChanged:false,primary:[0]},primaryLines:[{label:'初六',text:'磐桓；利居贞。'}],tenWings:[{title:'《象传上》',sectionNumber:3,hexagramRole:'primary',kind:'direct',excerpt:'云雷屯，君子以经纶。'}],localReading:{summary:'当前宜先辨明条件。',situation:'事情仍在形成。',turningPoint:'初爻提示先稳住基础。',trend:'之后倾向蓄势而进。',actions:['核实条件','小步验证'],cautions:['不要冒进']}});

assert.deepEqual([...parseAllowedOrigins(' https://a.example,https://b.example, https://a.example ')],['https://a.example','https://b.example']);
assert.equal(validateReadingPayload(validPayload()).ok,true);
assert.equal(validateReadingPayload({...validPayload(),language:'en'}).value.language,'en');
assert.equal(validateReadingPayload({...validPayload(),language:'fr'}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),question:'问'.repeat(101)}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),originalIndex:64}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),moving:[0,0]}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),movingLines:[{position:7,label:'上六',text:'文本'}]}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),original:{...hexagram,lines:Array.from({length:8},()=>hexagram.lines[0])}}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),tenWings:[{...validPayload().tenWings[0],kind:'invented'}]}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),tenWings:Array.from({length:9},()=>validPayload().tenWings[0])}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),extra:'not forwarded'}).value.extra,undefined);
assert.equal(validateReadingPayload({...validPayload(),localReading:{...validPayload().localReading,summary:'长'.repeat(13000)}}).ok,false);
assert.deepEqual(validateReadingPayload({...validPayload(),analysisPlan:{years:['2026','2030'],detailTarget:'long',originalLineLabels:['初六'],relatingLineLabels:['初九'],movingLineLabels:['初六'],sequence:['核心主线']}}).value.analysisPlan.years,['2026','2030']);
assert.deepEqual(validateReadingPayload({...validPayload(),analysisPlan:{years:[],referenceNotes:['初六表示起步阶段。']}}).value.analysisPlan.referenceNotes,['初六表示起步阶段。']);
assert.equal(validateReadingPayload({...validPayload(),analysisPlan:{years:[],referenceNotes:Array(21).fill('过多')}}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),analysisPlan:{years:['bad']}}).ok,false);
assert.equal(validateReadingPayload({...validPayload(),analysisPlan:{years:[],detailTarget:'brief',originalLineLabels:[],relatingLineLabels:[],movingLineLabels:[],sequence:[]}}).ok,false);

const firstHash=await hashedIpKey('203.0.113.8','private-salt','2026091108');
const secondHash=await hashedIpKey('203.0.113.8','private-salt','2026091108');
assert.equal(firstHash,secondHash);
assert.equal(firstHash.includes('203.0.113.8'),false);

const perIpNamespace=new MemoryNamespace(),now=new Date('2026-09-11T08:00:00.000Z');
for(let count=0;count<5;count+=1)assert.equal((await consumeLimits({namespace:perIpNamespace,ip:'203.0.113.8',salt:'salt',now,perIpLimit:5,dailyLimit:50})).ok,true);
assert.equal((await consumeLimits({namespace:perIpNamespace,ip:'203.0.113.8',salt:'salt',now,perIpLimit:5,dailyLimit:50})).code,'RATE_LIMITED');

const globalNamespace=new MemoryNamespace();
for(let request=0;request<50;request+=1)assert.equal((await consumeLimits({namespace:globalNamespace,ip:'203.0.113.'+(Math.floor(request/5)+1),salt:'salt',now,perIpLimit:5,dailyLimit:50})).ok,true);
assert.equal((await consumeLimits({namespace:globalNamespace,ip:'203.0.113.99',salt:'salt',now,perIpLimit:5,dailyLimit:50})).code,'DAILY_LIMIT_REACHED');
const globalStateBeforeReject=JSON.stringify(globalNamespace.storage.values.get('limit-state'));
assert.equal((await consumeLimits({namespace:globalNamespace,ip:'203.0.113.100',salt:'salt',now,perIpLimit:5,dailyLimit:50})).code,'DAILY_LIMIT_REACHED');
assert.equal(JSON.stringify(globalNamespace.storage.values.get('limit-state')),globalStateBeforeReject);

const origin='https://reader.example';
const request=(method='POST',body=validPayload(),requestOrigin=origin)=>new Request('https://worker.example/reading',{method,headers:{origin:requestOrigin,'content-type':'application/json','cf-connecting-ip':'203.0.113.20'},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const proxiedRequest=new Request('https://worker.example/reading',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.10','x-guanxiang-client-ip':'203.0.113.77','x-guanxiang-proxy-secret':'shared-secret'},body:JSON.stringify(validPayload())});
assert.equal(clientIpForRequest(proxiedRequest,{PROXY_SECRET:'shared-secret'}),'203.0.113.77');
assert.equal(clientIpForRequest(proxiedRequest,{PROXY_SECRET:'wrong-secret'}),'192.0.2.10');
const netlifyProxiedRequest=new Request('https://worker.example/reading',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.10','x-guanxiang-client-ip':'203.0.113.88','x-guanxiang-proxy-secret':'netlify-secret'},body:JSON.stringify(validPayload())});
assert.equal(trustedProxySecret('shared-secret',{PROXY_SECRET:'shared-secret',NETLIFY_PROXY_SECRET:'netlify-secret'}),true);
assert.equal(trustedProxySecret('netlify-secret',{PROXY_SECRET:'shared-secret',NETLIFY_PROXY_SECRET:'netlify-secret'}),true);
assert.equal(trustedProxySecret('wrong-secret',{PROXY_SECRET:'shared-secret',NETLIFY_PROXY_SECRET:'netlify-secret'}),false);
assert.equal(clientIpForRequest(netlifyProxiedRequest,{NETLIFY_PROXY_SECRET:'netlify-secret'}),'203.0.113.88');
assert.equal(clientIpForRequest(netlifyProxiedRequest,{NETLIFY_PROXY_SECRET:'wrong-secret'}),'192.0.2.10');
const liaraProxiedRequest=new Request('https://worker.example/reading',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.10','x-guanxiang-client-ip':'203.0.113.99','x-guanxiang-proxy-secret':'liara-secret'},body:JSON.stringify(validPayload())});
assert.equal(trustedProxySecret('liara-secret',{PROXY_SECRET:'pages-secret',NETLIFY_PROXY_SECRET:'netlify-secret',LIARA_PROXY_SECRET:'liara-secret'}),true);
assert.equal(clientIpForRequest(liaraProxiedRequest,{LIARA_PROXY_SECRET:'liara-secret'}),'203.0.113.99');
assert.equal(clientIpForRequest(liaraProxiedRequest,{LIARA_PROXY_SECRET:'wrong-secret'}),'192.0.2.10');
let aiArguments;
const environment=()=>({ALLOWED_ORIGINS:origin,RATE_LIMITER:new MemoryNamespace(),RATE_LIMIT_SALT:'private-salt',PER_IP_HOURLY_LIMIT:'5',DAILY_LIMIT:'50',MAX_TOKENS:'6000',AI_MODEL:'model-for-test',AI:{run:async(model,input)=>{aiArguments={model,input};return new Response('data: {"response":"【核心判断】\\n"}\n\ndata: {"response":"宜先观察。"}\n\ndata: [DONE]\n\n',{status:200,headers:{'content-type':'text/event-stream'}})}}});
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
assert.equal(aiArguments.input.max_tokens,6000);
assert.equal(aiArguments.input.temperature,0.1);
assert.equal(aiArguments.input.top_p,0.75);
assert.equal(aiArguments.input.repetition_penalty,1.08);
assert.equal(JSON.stringify(aiArguments).includes('not forwarded'),false);
assert.match(JSON.stringify(aiArguments.input.messages),/云雷屯/);
assert.match(JSON.stringify(aiArguments.input.messages),/analysisPlan/);
const chinesePrompt=promptFor(validPayload())[0].content;
const chineseUserPrompt=promptFor(validPayload())[1].content;
assert.match(chinesePrompt,/卦辞.*爻辞.*十翼/);
assert.match(chinesePrompt,/完整爻辞/);
assert.match(chinesePrompt,/label 与 text 是不可拆分的一对/);
assert.match(chinesePrompt,/referenceNotes 是应用提供的可信解释依据/);
assert.match(chineseUserPrompt,/label 和完整 text 紧邻写出/);
assert.match(chineseUserPrompt,/用户的问题（必须直接回答）/);
assert.match(chineseUserPrompt,/未来三个月我该如何推进职业选择/);
assert.match(chineseUserPrompt,/movingLines/);
assert.match(chineseUserPrompt,/爻位角色账本/);
assert.match(chineseUserPrompt,/"moving":\["初六"\]/);
assert.match(chinesePrompt,/思考方向/);
assert.match(chinesePrompt,/思维调整：/);
assert.match(chinesePrompt,/第一个非空白字符必须是【/);
assert.match(chinesePrompt,/禁止使用 Markdown.*标记/);
const englishPrompt=promptFor({...validPayload(),language:'en'})[0].content;
assert.match(englishPrompt,/judgment.*line text.*Ten Wings/i);
assert.match(englishPrompt,/inseparable label-text pair/i);
assert.match(englishPrompt,/Thinking direction:/);
assert.match(englishPrompt,/Mindset adjustment:/);
assert.match(englishPrompt,/first non-whitespace character must be \[/i);
assert.match(englishPrompt,/Markdown heading markers are forbidden/i);

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
let calledWithoutLimiter=false;
const missingLimiter=environment();
delete missingLimiter.RATE_LIMITER;
missingLimiter.AI.run=async()=>{calledWithoutLimiter=true;return new Response('unexpected')};
const missingResponse=await worker.fetch(request(),missingLimiter);
assert.equal(missingResponse.status,503);
assert.equal(calledWithoutLimiter,false);

const concurrentNamespace=new MemoryNamespace();
const concurrent=await Promise.all(Array.from({length:12},()=>consumeLimits({namespace:concurrentNamespace,ip:'198.51.100.8',salt:'salt',now,perIpLimit:5,dailyLimit:50})));
assert.equal(concurrent.filter(result=>result.ok).length,5);
assert.equal(concurrent.filter(result=>result.code==='RATE_LIMITED').length,7);
const rollover=await consumeLimits({namespace:concurrentNamespace,ip:'198.51.100.8',salt:'salt',now:new Date('2026-09-11T09:00:00.000Z'),perIpLimit:5,dailyLimit:50});
assert.equal(rollover.ok,true);
console.log('Worker guard and streaming handler tests passed.');
