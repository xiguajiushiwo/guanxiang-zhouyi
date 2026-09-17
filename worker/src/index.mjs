import { consumeLimits, parseAllowedOrigins, validateReadingPayload } from './guards.mjs';
import { ReadingRateLimiter } from './rate-limiter.mjs';

export { ReadingRateLimiter };

const messages={
  INVALID_REQUEST:'请求资料不完整。',ORIGIN_NOT_ALLOWED:'来源域名未授权。',RATE_LIMITED:'请求过于频繁。',DAILY_LIMIT_REACHED:'今日 AI 解读额度已用完。',MODEL_UNAVAILABLE:'模型暂时不可用。',SERVICE_ERROR:'服务暂时异常。'
};
const bounded=(value,fallback,min,max)=>{const number=Number.parseInt(value,10);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback};
const cors=origin=>({'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400','vary':'Origin'});
function errorResponse(code,status,origin='',language='zh-CN'){const translated={INVALID_REQUEST:'The reading data is incomplete.',ORIGIN_NOT_ALLOWED:'This website is not authorized for AI readings.',RATE_LIMITED:'Too many requests. Please try again later.',DAILY_LIMIT_REACHED:'Today’s AI reading limit has been reached.',MODEL_UNAVAILABLE:'The AI model is temporarily unavailable.',SERVICE_ERROR:'The reading service is temporarily unavailable.'};return new Response(JSON.stringify({error:{code,message:language==='en'?(translated[code]||translated.SERVICE_ERROR):(messages[code]||messages.SERVICE_ERROR)}}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?cors(origin):{})}})}

export function promptFor(payload){
  if(payload.language==='en'){const system='You are a careful study assistant for the Zhouyi. Base the interpretation first on the supplied judgment and selected line text, then use the supplied Ten Wings passages to clarify images, timing, position, and change. Synthesize the evidence instead of paraphrasing each item. You do not need to quote the original wording. Quote briefly only when it materially helps, name the supplied source, and never invent a citation. If a source type is absent, say so rather than filling it from memory. Do not present certainty or give medical, legal, or financial advice. Return plain text. The first non-whitespace character must be [, and Markdown heading markers are forbidden. Use exactly this structure and heading order:\n[Core judgment]\n...\n[Present situation]\n...\n[Key change]\nThinking direction: include one question or direction that helps the reader reframe the issue.\nMindset adjustment: include one concrete adjustment grounded in this reading, not generic encouragement.\n[Developing trend]\n...\n[Suggested actions]\n1. ...\n2. ...\n3. ...\nList exactly three verifiable actions and use conditional language.';const user='Interpret this structured material:\n'+JSON.stringify(payload);return [{role:'system',content:system},{role:'user',content:user}]}
  const system='你是《周易》经典研读助手。分析时先结合资料中的卦辞与本次所取爻辞，再用所提供的十翼段落说明卦象、时位与变化关系；要综合推理，不逐条复述资料，也不能只改写本地解读。你不必列出原句；只有原句确实有助于判断时才短引，并说明来自所提供的《彖传》《象传》等资料，绝不杜撰出处。某类资料未提供时，应明确资料不足，不凭记忆补造。只能依据用户提供的卦象、经文和规则进行条件性分析，不把解读写成确定预测，不提供医疗、法律或财务专业结论。输出纯文本，第一个非空白字符必须是【，禁止使用 Markdown 标记。必须严格使用以下结构和标题顺序：\n【核心判断】\n……\n【当前处境】\n……\n【关键变化】\n思考方向：给出一个帮助重新界定问题的方向或反思问题。\n思维调整：给出一个紧扣本卦的具体调整，例如从执着结果转向检验条件、从二元吉凶转向观察时位与过程，不能写成泛泛鸡汤。\n【后续趋势】\n……\n【行动建议】\n1. ……\n2. ……\n3. ……\n行动建议必须恰好三项且可验证。措辞使用提示、倾向、可考虑、需要留意。';
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

export function clientIpForRequest(request,env){
  const direct=request.headers.get('cf-connecting-ip')||'unknown';
  const proxySecret=request.headers.get('x-guanxiang-proxy-secret')||'';
  const forwarded=request.headers.get('x-guanxiang-client-ip')||'';
  return env.PROXY_SECRET&&proxySecret===env.PROXY_SECRET&&forwarded?forwarded:direct;
}

async function handle(request,env,origin){
  let raw;
  try{raw=await request.json()}catch{return errorResponse('INVALID_REQUEST',400,origin)}
  const checked=validateReadingPayload(raw);if(!checked.ok)return errorResponse('INVALID_REQUEST',400,origin,raw?.language==='en'?'en':'zh-CN');
  if(!env.RATE_LIMITER||!env.RATE_LIMIT_SALT||!env.AI)return errorResponse('SERVICE_ERROR',503,origin);
  const limits=await consumeLimits({namespace:env.RATE_LIMITER,ip:clientIpForRequest(request,env),salt:env.RATE_LIMIT_SALT,perIpLimit:bounded(env.PER_IP_HOURLY_LIMIT,5,1,100),dailyLimit:bounded(env.DAILY_LIMIT,50,1,10000)});
  if(!limits.ok)return errorResponse(limits.code,429,origin);
  let upstream;
  try{upstream=await env.AI.run(env.AI_MODEL||'@cf/meta/llama-3.1-8b-instruct-fp8',{messages:promptFor(checked.value),stream:true,max_tokens:bounded(env.MAX_TOKENS,900,300,1200)})}catch{return errorResponse('MODEL_UNAVAILABLE',503,origin)}
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
