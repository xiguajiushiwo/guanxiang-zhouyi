import { consumeLimits, parseAllowedOrigins, validateReadingPayload } from './guards.mjs';

const messages={
  INVALID_REQUEST:'请求资料不完整。',ORIGIN_NOT_ALLOWED:'来源域名未授权。',RATE_LIMITED:'请求过于频繁。',DAILY_LIMIT_REACHED:'今日 AI 解读额度已用完。',MODEL_UNAVAILABLE:'模型暂时不可用。',SERVICE_ERROR:'服务暂时异常。'
};
const bounded=(value,fallback,min,max)=>{const number=Number.parseInt(value,10);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback};
const cors=origin=>({'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400','vary':'Origin'});
function errorResponse(code,status,origin=''){return new Response(JSON.stringify({error:{code,message:messages[code]||messages.SERVICE_ERROR}}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?cors(origin):{})}})}

function promptFor(payload){
  const system='你是《周易》经典研读助手。只能依据用户提供的卦象、经文和规则进行条件性分析，不伪造出处，不把解读写成确定预测，不提供医疗、法律或财务专业结论。输出纯文本，不要 HTML。必须依次使用且只使用【核心判断】【当前处境】【关键变化】【后续趋势】【行动建议】五个标题；行动建议列出三项可验证行动。措辞使用提示、倾向、可考虑、需要留意。';
  const user='请解读以下结构化资料：\n'+JSON.stringify(payload);
  return [{role:'system',content:system},{role:'user',content:user}];
}

function deltaFromLine(line){
  const trimmed=line.trim();if(!trimmed.startsWith('data:'))return '';
  const data=trimmed.slice(5).trim();if(!data||data==='[DONE]')return '';
  try{const parsed=JSON.parse(data);return typeof parsed.response==='string'?parsed.response:parsed.choices?.[0]?.delta?.content||''}catch{return ''}
}
function plainTextStream(body){
  const reader=body.getReader(),decoder=new TextDecoder(),encoder=new TextEncoder();let buffer='';
  return new ReadableStream({
    start(controller){(async()=>{try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let newline;while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);const delta=deltaFromLine(line);if(delta)controller.enqueue(encoder.encode(delta))}}buffer+=decoder.decode();if(buffer){const delta=deltaFromLine(buffer);if(delta)controller.enqueue(encoder.encode(delta))}controller.close()}catch(error){controller.error(error)}})()},
    cancel(reason){return reader.cancel(reason)}
  });
}

async function handle(request,env,origin){
  let raw;
  try{raw=await request.json()}catch{return errorResponse('INVALID_REQUEST',400,origin)}
  const checked=validateReadingPayload(raw);if(!checked.ok)return errorResponse('INVALID_REQUEST',400,origin);
  if(!env.RATE_LIMITS||!env.RATE_LIMIT_SALT||!env.AI)return errorResponse('SERVICE_ERROR',503,origin);
  const limits=await consumeLimits({kv:env.RATE_LIMITS,ip:request.headers.get('cf-connecting-ip')||'unknown',salt:env.RATE_LIMIT_SALT,perIpLimit:bounded(env.PER_IP_HOURLY_LIMIT,5,1,100),dailyLimit:bounded(env.DAILY_LIMIT,50,1,10000)});
  if(!limits.ok)return errorResponse(limits.code,429,origin);
  let upstream;
  try{upstream=await env.AI.run(env.AI_MODEL||'@cf/meta/llama-3.1-8b-instruct',{messages:promptFor(checked.value),stream:true,max_tokens:bounded(env.MAX_TOKENS,900,300,1200)})}catch{return errorResponse('MODEL_UNAVAILABLE',503,origin)}
  let body;
  if(upstream instanceof Response){
    if(!upstream.ok||!upstream.body)return errorResponse('MODEL_UNAVAILABLE',503,origin);
    body=upstream.body;
  }else if(upstream&&typeof upstream.getReader==='function')body=upstream;
  else return errorResponse('MODEL_UNAVAILABLE',503,origin);
  return new Response(plainTextStream(body),{status:200,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...cors(origin)}});
}

export default {async fetch(request,env){
  const origin=request.headers.get('origin')||'',allowed=parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if(!origin||!allowed.has(origin))return errorResponse('ORIGIN_NOT_ALLOWED',403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=='POST')return errorResponse('INVALID_REQUEST',405,origin);
  try{return await handle(request,env,origin)}catch{return errorResponse('SERVICE_ERROR',503,origin)}
}};
