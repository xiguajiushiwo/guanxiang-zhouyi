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
  const movingPositions=new Set((payload.movingLines||[]).map(line=>line.position));
  const movingLabels=(payload.movingLines||[]).map(line=>line.label);
  const unchangedLabels=(payload.original?.lines||[]).filter((line,index)=>!movingPositions.has(index+1)).map(line=>line.label);
  const lineRoleLedger={moving: movingLabels,unchanged:unchangedLabels,relatingBackground:(payload.changed?.lines||[]).map(line=>line.label)};
  if(payload.language==='en'){const system='You are a careful Zhouyi study assistant. The user question is the primary task and must be answered directly throughout the reading. Use the supplied original and relating hexagram judgments, trigram images, complete line texts, selected moving lines, Ten Wings excerpts, and analysisPlan.referenceNotes as evidence. The referenceNotes are trusted interpretive aids supplied by the application; follow them exactly but never present them as classical quotations. For every line that has a referenceNote, the first interpretive sentence after its quotation must faithfully restate that note; do not replace it with a looser or more positive meaning. Follow the supplied analysisPlan as an outline: establish the thesis, explain the primary hexagram and its full line progression, analyze each moving line, use the relating hexagram\'s full lines only as later background, then apply the evidence to every requested year. Synthesize the sources instead of paraphrasing a data dump. Only judgment, line text, or a supplied Ten Wings excerpt may be presented as classical quoted wording; themes, notes, and image summaries are interpretive labels, not quotations. Never invent a citation or fill missing material from memory. Treat every supplied line object as an inseparable label-text pair: whenever quoting a line, copy its label and complete text from the same object exactly, and never attach that text to another label. The movingLines list is authoritative: never call one of its entries unchanged or non-moving anywhere in the answer. Do not guess a lexical gloss that reverses or contradicts the supplied wording or referenceNotes; if a term is uncertain, explain only its structural role in the progression. The relating hexagram\'s complete lines are background only: never present one of them as a moving line or as evidence that a supplied moving line changed. If the sources cannot distinguish years, say so rather than inventing details. Do not present fate as certain. Personal labels such as zodiac signs may be acknowledged as the user\'s cultural framing, but never treated as deterministic facts. Do not give medical, legal, or financial conclusions. Produce an in-depth reading of roughly 2,800-4,000 English words when a multi-year range is supplied, and at least 1,500 words otherwise. Do not use Markdown bold markers. The first non-whitespace character must be [, and Markdown heading markers are forbidden. Keep exactly this top-level structure and order:\n[Core judgment]\nUse 3 substantive paragraphs to answer the question, name the original -> relating transition, state the thesis, and identify the real-world tension.\n[Present situation]\nExplain the judgment, image, relevant Ten Wings evidence, and all six primary lines. Give each line at least 2 sentences connecting its stage to the question; identify unchanged lines as background rather than moving lines.\n[Key change]\nExplain EVERY supplied moving line in its own substantial paragraph using line text -> situation in the question -> conditional implication -> practical consequence. Then explain how the relating hexagram redirects the situation and how its six-line progression frames later development. Include exactly one line beginning Thinking direction: and exactly one beginning Mindset adjustment:, after all moving-line paragraphs.\n[Developing trend]\nGive a separate paragraph for every requested year, each with evidence, interpretation, opportunity, risk, and a practical focus. State once that the year mapping is an interpretive framework rather than a factual prediction. Otherwise use detailed early/middle/later phases.\n[Suggested actions]\nGive exactly three numbered actions. Each must include what to do, when to do it, how to verify it, and which supplied evidence supports it.';const user='User question (answer this directly):\n'+payload.question+'\n\nAuthoritative line-role ledger (already verified; never recalculate it):\n'+JSON.stringify(lineRoleLedger)+'\n\nAuthoritative moving-line list (cover every item exactly once and never describe them as unchanged):\n'+JSON.stringify(payload.movingLines||[])+'\n\nTrusted interpretive notes (apply each one line by line before adding practical interpretation):\n'+JSON.stringify(payload.analysisPlan?.referenceNotes||[])+'\n\nStructured Zhouyi evidence and analysis plan:\n'+JSON.stringify(payload)+'\n\nDepth benchmark: this must read like a full consultation, not a summary. Develop the six primary lines, every moving line, the relating progression, and every requested year with evidence and practical interpretation. Final checklist: verify the line-role ledger; write each moving-line label in its own paragraph exactly once; keep every quoted line label joined to the complete text from the same supplied object; follow every referenceNote without quoting it as scripture; include exactly one Thinking direction: and one Mindset adjustment: after those paragraphs; label every requested year separately; end with exactly three numbered, verifiable actions; do not use any relating.lines line as a moving-line citation; do not use Markdown bold markers.';return [{role:'system',content:system},{role:'user',content:user}]}
  const system='你是《周易》经典研读助手。用户的问题是首要任务，整篇解读必须直接回答它，不能只讲卦象。请使用所提供的本卦、变卦、十翼摘录和 analysisPlan.referenceNotes。referenceNotes 是应用提供的可信解释依据，必须遵守，但不能把它冒充经典原文；凡有 referenceNote 的爻，引用爻辞后的第一句解释必须忠实复述该依据，不能换成更宽泛或更乐观的意思。请严格遵循资料中的 analysisPlan：先提出核心判断，再解释本卦卦辞、卦象和完整六爻的阶段脉络，再逐条解释动爻，最后把变卦完整六爻只作为后续背景，按问题中的每个年份落地。要把证据、推断和现实行动连成完整论证，而不是逐条复述资料。只有卦辞、爻辞或已提供的十翼摘录可以作为带引号的经典原文；主题、解释依据、卦象意象和摘要都不能伪装成经典引文。绝不杜撰出处，资料未提供时明确说资料不足。每个 lines 或 movingLines 对象中的 label 与 text 是不可拆分的一对；引用任何爻辞时，必须从同一个对象逐字复制“爻名＋完整爻辞”，绝不能把一条爻辞挂到另一爻名下。movingLines 是本次动爻的唯一清单，全文任何位置都不得把其中条目称为“未动”或“非动爻”。不得凭印象给生僻词作出与原文或 referenceNotes 相反的训释；不能确定时只解释它在六爻进程中的结构作用。变卦的完整爻辞只用于后续背景，不能把其中任何一爻冒充本次动爻。本卦未动之爻可以作为阶段背景，但必须标明它不是本次动爻。不要把属相等文化语境写成确定性人格或命运事实。若资料不足以区分年份，就明确说明，不得自行编造细节。不把解读写成确定预测，不提供医疗、法律或财务专业结论。有多年时间范围时，中文正文目标为2800—4000字；其他问题至少1500字。不得使用 Markdown 粗体符号。输出纯文本，第一个非空白字符必须是【，禁止使用 Markdown 标题标记。必须严格使用以下顶层结构和标题顺序：\n【核心判断】\n用3个有实质内容的段落直接回答问题，明确本卦→变卦的主线、现实中的核心矛盾和成立条件。\n【当前处境】\n深入解释本卦卦辞、上下卦意象和十翼证据，并逐一解释本卦完整六爻。每一爻至少用2句话说明其阶段含义及其与用户问题的现实联系；未动之爻只能作为阶段背景。\n【关键变化】\n只解释 movingLines 中的动爻。每个动爻单独写一个充分展开的段落，依次说明“爻辞原文→问题中的具体处境→条件性提示→现实后果”；再解释这些动爻如何把本卦推向变卦，并说明变卦六爻如何构成后续发展的阶段背景。全部动爻解释完后，只写一行“思考方向：……”和一行“思维调整：……”。\n【后续趋势】\n时间范围问题必须为每个年份各写一个独立完整段落，每年都包含经典依据、条件性解释、机会、风险和行动重点；统一说明逐年映射是解释框架而非事实预测。否则按前期、中期、后期充分展开。\n【行动建议】\n恰好给出三条编号行动。每条必须说明做什么、何时做、如何验证，以及它对应的卦辞或爻辞依据。';
  const user='用户的问题（必须直接回答）：\n'+payload.question+'\n\n爻位角色账本（这是已经核定的事实，不得重新推算；moving 中任何一爻都不能称为未动，unchanged 之外任何爻都不能称为未动）：\n'+JSON.stringify(lineRoleLedger)+'\n\n本次动爻唯一清单（必须逐条覆盖，全文不得把它们称为未动，不得跳过、改号或补造）：\n'+JSON.stringify(payload.movingLines||[])+'\n\n可信解释依据（必须逐爻先采用，再结合现实问题展开）：\n'+JSON.stringify(payload.analysisPlan?.referenceNotes||[])+'\n\n以下是可引用的结构化《周易》资料和分析计划：\n'+JSON.stringify(payload)+'\n\n深度标准：这必须是一篇完整咨询式解读，不是摘要。必须充分展开本卦六爻、每个动爻、变卦阶段和每个年份，让读者看见“经典原文为什么能推出这条现实判断”。发送前硬性自检：先回答问题再谈卦；逐字复查角色账本，尤其不得把 moving 中的爻写成未动；引用爻辞时必须把同一对象中的 label 和完整 text 紧邻写出并逐字核对，不能张冠李戴；逐条遵守 referenceNotes，但不要把解释依据加引号冒充经文；每个动爻 label 各自单独成段且只出现一次；全文只能各有一行“思考方向：”和“思维调整：”，放在全部动爻之后；必须分别标注问题中的每个年份，并声明逐年映射是解释框架而非事实预测；结尾只能有编号1、2、3三条可验证行动；不得把 changed.lines 中任何爻辞当成本次动爻；卦名、上下卦、爻名、年份和数字只能逐字采用资料；禁止使用 ** 粗体符号。';
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
  try{upstream=await env.AI.run(env.AI_MODEL||'@cf/openai/gpt-oss-120b',{messages:promptFor(checked.value),stream:true,max_tokens:bounded(env.MAX_TOKENS,6000,1200,6000),temperature:0.1,top_p:0.75,repetition_penalty:1.08})}catch{return errorResponse('MODEL_UNAVAILABLE',503,origin)}
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
