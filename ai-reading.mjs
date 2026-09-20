export const AI_ERROR_MESSAGES={INVALID_REQUEST:'解读资料不完整，请重新成卦后再试。',ORIGIN_NOT_ALLOWED:'当前网站地址未获 AI 服务授权。',RATE_LIMITED:'请求过于频繁，请稍后再试。',DAILY_LIMIT_REACHED:'今天的 AI 解读额度已用完，本地解读仍可继续使用。',MODEL_UNAVAILABLE:'AI 模型暂时不可用，请稍后再试。',STREAM_INTERRUPTED:'连接中断，已保留本次收到的部分内容。',INCOMPLETE_RESPONSE:'AI 解读未完整生成，已保留收到的内容，请重新尝试。',SERVICE_ERROR:'AI 解读服务暂时异常，请稍后再试。',ABORTED:'本次 AI 解读已取消。'};

export const AI_ERROR_MESSAGES_EN={INVALID_REQUEST:'The reading data is incomplete. Cast again and retry.',ORIGIN_NOT_ALLOWED:'This site is not authorized to use the AI service.',RATE_LIMITED:'Too many requests. Please try again later.',DAILY_LIMIT_REACHED:'Today’s AI reading allowance is exhausted. The offline interpretation remains available.',MODEL_UNAVAILABLE:'The AI model is temporarily unavailable. Please try again later.',STREAM_INTERRUPTED:'The connection was interrupted. The partial response has been preserved.',INCOMPLETE_RESPONSE:'The AI response was incomplete. The partial response has been preserved; please retry.',SERVICE_ERROR:'The AI reading service is temporarily unavailable. Please try again later.',ABORTED:'This AI reading was cancelled.'};
const SECTION_IDS=new Map([['核心判断','summary'],['当前处境','situation'],['关键变化','turningPoint'],['后续趋势','trend'],['行动建议','actions']]);

export class AiReadingError extends Error{
  constructor(code,message='',partialText='',language='zh-CN'){super((language==='en'?AI_ERROR_MESSAGES_EN:AI_ERROR_MESSAGES)[code]||message||(language==='en'?AI_ERROR_MESSAGES_EN:AI_ERROR_MESSAGES).SERVICE_ERROR);this.name='AiReadingError';this.code=code;this.partialText=partialText}
}

export function splitAiReadingSections(text){
  const fallback={id:'summary',title:'核心判断',text:''},sections=[],lines=String(text||'').replace(/\r/g,'').split('\n');
  let current={...fallback,lines:[]};
  const flush=()=>{const value=current.lines.join('\n').trim();if(value)sections.push({id:current.id,title:current.title,text:value})};
  for(const line of lines){const match=line.trim().match(/^(?:【(核心判断|当前处境|关键变化|后续趋势|行动建议)】|\*\*(核心判断|当前处境|关键变化|后续趋势|行动建议)\*\*)$/);if(match){const title=match[1]||match[2];flush();current={id:SECTION_IDS.get(title),title,lines:[]}}else current.lines.push(line)}
  flush();
  return sections.length?sections:[{...fallback,text:String(text||'').trim()}].filter(section=>section.text);
}

const REQUIRED_SECTIONS=['核心判断','当前处境','关键变化','后续趋势','行动建议'];
const LINE_LABEL_PATTERN='(?:初[六九]|[六九][二三四五]|上[六九]|用[六九])';
const escapeRegExp=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function hasConsistentLineCitations(text,payload){
  const lines=[...(payload?.original?.lines||[]),...(payload?.changed?.lines||[])].filter(line=>line?.label&&line?.text);
  if(!lines.length)return true;
  return lines.every(line=>{
    const wrongLabelBeforeText=new RegExp(`(${LINE_LABEL_PATTERN})(?:(?!${LINE_LABEL_PATTERN})[\\s：:，,、“”‘’「」『』()（）]){0,16}${escapeRegExp(line.text)}`,'g');
    return [...String(text||'').matchAll(wrongLabelBeforeText)].every(match=>match[1]===line.label);
  });
}

function hasConsistentMovingLineRoles(text,payload,language){
  return (payload?.movingLines||[]).every(line=>{
    const label=escapeRegExp(line.label);
    return language==='en'
      ?!new RegExp(`${label}[^\\n]{0,96}(?:is|as) (?:an )?(?:unchanged|non-moving) line`,'i').test(text)
      :!new RegExp(`${label}[^\\n]{0,96}(?:虽|并)?(?:未动|不是动爻|非动爻)`).test(text);
  });
}

export function isCompleteAiReading(text,language='zh-CN',payload=null){
  const sections=language==='en'?splitAiReadingSectionsLocalized(text,'en'):splitAiReadingSections(text);
  const required=language==='en'?['Core judgment','Present situation','Key change','Developing trend','Suggested actions']:['核心判断','当前处境','关键变化','后续趋势','行动建议'];
  const titles=sections.map(section=>section.title);
  if(sections.length!==required.length||titles.some((title,index)=>title!==required[index])||new Set(titles).size!==titles.length)return false;
  const actions=sections.at(-1).text.split(/\n+/).map(line=>line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean);
  const keyChange=sections[2]?.text||'';
  const thinkingMatches=language==='en'?keyChange.match(/Thinking direction\s*:/gi):keyChange.match(/思考方向\s*[：:]/g);
  const mindsetMatches=language==='en'?keyChange.match(/Mindset adjustment\s*:/gi):keyChange.match(/思维调整\s*[：:]/g);
  const hasThinkingFields=thinkingMatches?.length===1&&mindsetMatches?.length===1;
  const movingCovered=!payload?.movingLines?.length||payload.movingLines.every(line=>new RegExp(`${escapeRegExp(line.label)}[\\s：:，,、“”‘’「」『』()（）]{0,16}${escapeRegExp(line.text)}`).test(keyChange));
  const trend=sections[3]?.text||'';
  const yearsCovered=!payload?.analysisPlan?.years?.length||payload.analysisPlan.years.every(year=>new RegExp(`^\\s*${year}\\s*(?:年\\s*)?(?:[：:]|$)`,'m').test(trend));
  const nonWhitespaceLength=String(text||'').replace(/\s/g,'').length;
  const detailedEnough=payload?.analysisPlan?.detailTarget==='long'?nonWhitespaceLength>=2500:payload?.analysisPlan?.detailTarget==='standard'?nonWhitespaceLength>=1400:true;
  return sections.every(section=>section.text.trim())&&actions.length===3&&hasThinkingFields&&movingCovered&&yearsCovered&&hasConsistentLineCitations(text,payload)&&hasConsistentMovingLineRoles(text,payload,language)&&detailedEnough;
}

async function httpError(response,language='zh-CN'){
  let code=response.status===429?'RATE_LIMITED':'SERVICE_ERROR',message='';
  try{const body=await response.json();code=body?.error?.code||code;message=body?.error?.message||''}catch{}
  return new AiReadingError(code,message,'',language);
}

export async function requestAiReading({endpoint,payload,onChunk=()=>{},fetchImpl=globalThis.fetch,signal}={}){
  const language=payload?.language||'zh-CN';
  if(!endpoint)throw new AiReadingError('SERVICE_ERROR','AI endpoint is not configured','',language);
  let response;
  try{response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal})}catch(error){if(error?.name==='AbortError'||signal?.aborted)throw new AiReadingError('ABORTED','','',language);throw new AiReadingError('SERVICE_ERROR',error?.message,'',language)}
  if(!response.ok)throw await httpError(response,language);
  if(!response.body)throw new AiReadingError('MODEL_UNAVAILABLE','','',language);
  const reader=response.body.getReader(),decoder=new TextDecoder();let complete='';
  try{
    while(true){const {value,done}=await reader.read();if(done)break;const chunk=decoder.decode(value,{stream:true});if(chunk){complete+=chunk;onChunk(chunk,complete)}}
    const tail=decoder.decode();if(tail){complete+=tail;onChunk(tail,complete)}
  }catch(error){if(error?.name==='AbortError'||signal?.aborted)throw new AiReadingError('ABORTED','',complete,language);throw new AiReadingError('STREAM_INTERRUPTED',error?.message,complete,language)}
  if(!complete.trim())throw new AiReadingError('MODEL_UNAVAILABLE');
  if(!isCompleteAiReading(complete,payload?.language||'zh-CN',payload))throw new AiReadingError('INCOMPLETE_RESPONSE','',complete,payload?.language||'zh-CN');
  return complete;
}

const EN_SECTION_IDS=new Map([['Core judgment','summary'],['Present situation','situation'],['Key change','turningPoint'],['Developing trend','trend'],['Suggested actions','actions']]);
export function splitAiReadingSectionsLocalized(text,language='zh-CN'){
 if(language!=='en')return splitAiReadingSections(text);
 const sections=[],lines=String(text||'').replace(/\r/g,'').split('\n');let current={id:'summary',title:'Core judgment',lines:[]};
 const flush=()=>{const value=current.lines.join('\n').trim();if(value)sections.push({id:current.id,title:current.title,text:value})};
 for(const line of lines){const match=line.trim().match(/^(?:\[(Core judgment|Present situation|Key change|Developing trend|Suggested actions)\]|\*\*(Core judgment|Present situation|Key change|Developing trend|Suggested actions)\*\*)$/);if(match){const title=match[1]||match[2];flush();current={id:EN_SECTION_IDS.get(title),title,lines:[]}}else current.lines.push(line)}
 flush();return sections.length?sections:[{id:'summary',title:'Core judgment',text:String(text||'').trim()}].filter(section=>section.text);
}
