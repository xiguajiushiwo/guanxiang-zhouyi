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
  if(payload.language==='en'){const system='You are a careful Zhouyi study assistant. The user question is the primary task and must be answered directly throughout the reading. Use the supplied original and relating hexagram judgments, trigram images, complete line texts, selected moving lines, and Ten Wings excerpts as evidence. Follow the supplied analysisPlan as an outline: establish the thesis, explain the primary hexagram and its full line progression, analyze each moving line, use the relating hexagram\'s full lines only as later background, then apply the evidence to every requested year. Synthesize the sources instead of paraphrasing a data dump. Only judgment, line text, or a supplied Ten Wings excerpt may be presented as classical quoted wording; themes and image summaries are interpretive labels, not quotations. Never invent a citation or fill missing material from memory. The relating hexagram\'s complete lines are background only: never present one of them as a moving line or as evidence that a supplied moving line changed. If the sources cannot distinguish years, say so and repeat only a conditional baseline rather than inventing details. Do not present fate as certain. Personal labels such as zodiac signs may be acknowledged as the user\'s cultural framing, but never treated as deterministic facts. Do not give medical, legal, or financial conclusions. Return a substantial plain-text reading, not a short summary. The first non-whitespace character must be [, and Markdown heading markers are forbidden. Keep exactly this top-level structure and order; rich subheads and Unicode markers are allowed inside sections:\n[Core judgment]\nDirectly answer the user question in 2-3 paragraphs. Name the original -> relating transition and state the overall thesis.\n[Present situation]\nConnect the question to the original hexagram\'s judgment, image, and full line progression. Use unchanged lines as stage context, not as moving lines. Quote only supplied judgment, line, or Ten Wings wording briefly, identify its source, and explain its practical meaning.\n[Key change]\nExplain EVERY item in the supplied moving-line list, one by one, without skipping or renumbering. Treat position, label, and text in that list as authoritative. Give each item its own paragraph starting with its exact label. Never use a line from relating.lines as a substitute. For each, use the chain line text -> situation in the question -> conditional implication. Then explain how the relating hexagram changes the direction. Include exactly one line beginning Thinking direction: and one beginning Mindset adjustment:.\n[Developing trend]\nFor a time-based question, give a clearly labeled entry for every named year, grounded in the original and relating judgments and line progression. Map early years to the primary hexagram\'s foundation, transition years to the supplied moving lines, and later years to the relating hexagram\'s background, while stating that this is an interpretive framework. Otherwise give an early/middle/later phase reading. Keep it conditional and distinguish evidence from interpretation.\n[Suggested actions]\nGive exactly three numbered, concrete, verifiable actions tied to the question and evidence. Use conditional language.';const user='User question (answer this directly):\n'+payload.question+'\n\nAuthoritative moving-line list (cover every item exactly once):\n'+JSON.stringify(payload.movingLines||[])+'\n\nStructured Zhouyi evidence and analysis plan:\n'+JSON.stringify(payload)+'\n\nFinal checklist before sending: write each moving-line label in its own paragraph exactly once; use the full primary line progression as stage context; include one line beginning Thinking direction: and one beginning Mindset adjustment:; label every requested year; end with exactly three numbered actions; do not use any relating.lines line as a moving-line citation.';return [{role:'system',content:system},{role:'user',content:user}]}
  const system='你是《周易》经典研读助手。用户的问题是首要任务，整篇解读必须直接回答它，不能只讲卦象。请严格遵循资料中的 analysisPlan：先提出核心判断，再解释本卦卦辞、卦象和完整六爻的阶段脉络，再逐条解释动爻，最后把变卦完整六爻只作为后续背景，按问题中的每个年份落地。要把证据和推断连起来，而不是逐条复述资料。只有卦辞、爻辞或已提供的十翼摘录可以作为带引号的经典原文；主题、卦象意象和摘要都是解释性标签，不能伪装成经典引文。绝不杜撰出处，资料未提供时明确说资料不足。变卦的完整爻辞只用于后续背景，不能把其中任何一爻冒充本次动爻，也不能据此声称某个已提供动爻发生了变化。本卦未动之爻可以作为阶段背景，但必须标明它不是本次动爻。不要把属相等文化语境写成确定性人格或命运事实。若资料不足以区分年份，就明确说明并只重复条件性主线，不得自行编造细节。不把解读写成确定预测，不提供医疗、法律或财务专业结论。输出应是有实质内容的完整解读，不是短摘要。输出纯文本，第一个非空白字符必须是【，禁止使用 Markdown 标题标记；区块内部可以使用换行、中文小标题和 Unicode 标记。必须严格使用以下顶层结构和标题顺序：\n【核心判断】\n开头用2—3段直接回答用户的问题，明确本卦→变卦的总体主线，并点出问题中的关键条件。\n【当前处境】\n围绕用户问题解释本卦：卦辞、上下卦意象、完整六爻的阶段脉络，以及与问题最相关的爻辞。未动之爻只能作为阶段背景。带引号短引时只能使用所提供的卦辞、爻辞或十翼原文，并说明来源及其现实含义。\n【关键变化】\n只解释“movingLines”数组中的动爻；其中 position、label、text 已经绑定，是本次动爻的唯一编号和原文依据，不得用 moving 索引自行推算，也不得把完整爻辞中的其他爻冒充动爻。必须为清单中的每一项各写一个独立段落，并以其准确 label 开头；不得用 changed.lines 中的爻辞替代。每条都按“爻辞原文 → 对应问题中的处境 → 条件性提示”展开；再说明动爻如何把本卦推向变卦。必须包含一行“思考方向：……”和一行“思维调整：……”，两行都要具体且紧扣问题。\n【后续趋势】\n如果问题包含时间范围，必须按每个年份分别标注，并用本卦基础→动爻转折→变卦后续背景的顺序组织；如果资料不足以把某年与某一爻对应，要明说这是解释框架而非事实预测。必须同时引用本卦与变卦提供的证据，区分原文与推断，使用“倾向、提示、可考虑、需要留意”等条件性措辞。\n【行动建议】\n给出恰好三条与用户问题直接相关、可执行且可验证的行动，每条使用编号“1. ”、“2. ”、“3. ”，不要写泛泛鸡汤。';
  const user='用户的问题（必须直接回答）：\n'+payload.question+'\n\n本次动爻唯一清单（必须逐条覆盖，不得跳过、改号或补造）：\n'+JSON.stringify(payload.movingLines||[])+'\n\n以下是可引用的结构化《周易》资料和分析计划：\n'+JSON.stringify(payload)+'\n\n发送前硬性自检：先回答问题再谈卦；使用本卦完整六爻作为阶段背景；每个动爻 label 各自单独成段且只出现一次；全文只能各有一行“思考方向：”和“思维调整：”，放在全部动爻之后；必须分别标注问题中的每个年份，并声明逐年映射是解释框架而非事实预测；结尾只能有编号 1、2、3 三条行动；不得把 changed.lines 中任何爻辞当成本次动爻；卦名、上下卦、爻名、年份和数字只能逐字采用资料，严禁凭记忆换算或写入资料中不存在的时长与数字。';
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

export function trustedProxySecret(value,env){
  if(!value)return false;
  return [env.PROXY_SECRET,env.NETLIFY_PROXY_SECRET,env.LIARA_PROXY_SECRET].some(secret=>secret&&value===secret);
}

export function clientIpForRequest(request,env){
  const direct=request.headers.get('cf-connecting-ip')||'unknown';
  const proxySecret=request.headers.get('x-guanxiang-proxy-secret')||'';
  const forwarded=request.headers.get('x-guanxiang-client-ip')||'';
  return trustedProxySecret(proxySecret,env)&&forwarded?forwarded:direct;
}

async function handle(request,env,origin){
  let raw;
  try{raw=await request.json()}catch{return errorResponse('INVALID_REQUEST',400,origin)}
  const checked=validateReadingPayload(raw);if(!checked.ok)return errorResponse('INVALID_REQUEST',400,origin,raw?.language==='en'?'en':'zh-CN');
  if(!env.RATE_LIMITER||!env.RATE_LIMIT_SALT||!env.AI)return errorResponse('SERVICE_ERROR',503,origin);
  const limits=await consumeLimits({namespace:env.RATE_LIMITER,ip:clientIpForRequest(request,env),salt:env.RATE_LIMIT_SALT,perIpLimit:bounded(env.PER_IP_HOURLY_LIMIT,5,1,100),dailyLimit:bounded(env.DAILY_LIMIT,50,1,10000)});
  if(!limits.ok)return errorResponse(limits.code,429,origin);
  let upstream;
  try{upstream=await env.AI.run(env.AI_MODEL||'@cf/openai/gpt-oss-120b',{messages:promptFor(checked.value),stream:true,max_tokens:bounded(env.MAX_TOKENS,2400,600,3000),temperature:0.35,top_p:0.85,repetition_penalty:1.08})}catch{return errorResponse('MODEL_UNAVAILABLE',503,origin)}
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
