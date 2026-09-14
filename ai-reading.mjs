export const AI_ERROR_MESSAGES={INVALID_REQUEST:'解读资料不完整，请重新成卦后再试。',ORIGIN_NOT_ALLOWED:'当前网站地址未获 AI 服务授权。',RATE_LIMITED:'请求过于频繁，请稍后再试。',DAILY_LIMIT_REACHED:'今天的 AI 解读额度已用完，本地解读仍可继续使用。',MODEL_UNAVAILABLE:'AI 模型暂时不可用，请稍后再试。',STREAM_INTERRUPTED:'连接中断，已保留本次收到的部分内容。',SERVICE_ERROR:'AI 解读服务暂时异常，请稍后再试。',ABORTED:'本次 AI 解读已取消。'};
const SECTION_IDS=new Map([['核心判断','summary'],['当前处境','situation'],['关键变化','turningPoint'],['后续趋势','trend'],['行动建议','actions']]);

export class AiReadingError extends Error{
  constructor(code,message='',partialText=''){super(AI_ERROR_MESSAGES[code]||message||AI_ERROR_MESSAGES.SERVICE_ERROR);this.name='AiReadingError';this.code=code;this.partialText=partialText}
}

export function splitAiReadingSections(text){
  const fallback={id:'summary',title:'核心判断',text:''},sections=[],lines=String(text||'').replace(/\r/g,'').split('\n');
  let current={...fallback,lines:[]};
  const flush=()=>{const value=current.lines.join('\n').trim();if(value)sections.push({id:current.id,title:current.title,text:value})};
  for(const line of lines){const match=line.trim().match(/^【(核心判断|当前处境|关键变化|后续趋势|行动建议)】$/);if(match){flush();current={id:SECTION_IDS.get(match[1]),title:match[1],lines:[]}}else current.lines.push(line)}
  flush();
  return sections.length?sections:[{...fallback,text:String(text||'').trim()}].filter(section=>section.text);
}

async function httpError(response){
  let code=response.status===429?'RATE_LIMITED':'SERVICE_ERROR',message='';
  try{const body=await response.json();code=body?.error?.code||code;message=body?.error?.message||''}catch{}
  return new AiReadingError(code,message);
}

export async function requestAiReading({endpoint,payload,onChunk=()=>{},fetchImpl=globalThis.fetch,signal}={}){
  if(!endpoint)throw new AiReadingError('SERVICE_ERROR','AI endpoint is not configured');
  let response;
  try{response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal})}catch(error){if(error?.name==='AbortError'||signal?.aborted)throw new AiReadingError('ABORTED');throw new AiReadingError('SERVICE_ERROR',error?.message)}
  if(!response.ok)throw await httpError(response);
  if(!response.body)throw new AiReadingError('MODEL_UNAVAILABLE');
  const reader=response.body.getReader(),decoder=new TextDecoder();let complete='';
  try{
    while(true){const {value,done}=await reader.read();if(done)break;const chunk=decoder.decode(value,{stream:true});if(chunk){complete+=chunk;onChunk(chunk,complete)}}
    const tail=decoder.decode();if(tail){complete+=tail;onChunk(tail,complete)}
  }catch(error){if(error?.name==='AbortError'||signal?.aborted)throw new AiReadingError('ABORTED','',complete);throw new AiReadingError('STREAM_INTERRUPTED',error?.message,complete)}
  if(!complete.trim())throw new AiReadingError('MODEL_UNAVAILABLE');
  return complete;
}
