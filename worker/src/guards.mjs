const encoder=new TextEncoder();
const invalid=message=>({ok:false,error:{code:'INVALID_REQUEST',message}});
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(label);return value.trim()};
const index=(value,max,label)=>{if(!Number.isInteger(value)||value<0||value>max)throw new Error(label);return value};
const uniqueIndexes=(value,maxLength,label)=>{if(!Array.isArray(value)||value.length>maxLength)throw new Error(label);const copy=value.map(item=>index(item,5,label));if(new Set(copy).size!==copy.length)throw new Error(label);return copy};

export function parseAllowedOrigins(value){return new Set(String(value||'').split(',').map(item=>item.trim()).filter(Boolean))}

function hexagram(value,label){
  if(!value||typeof value!=='object')throw new Error(label);
  return {name:text(value.name,24,label),upper:text(value.upper,8,label),lower:text(value.lower,8,label),theme:text(value.theme,240,label),imageText:text(value.imageText,500,label),judgment:text(value.judgment,500,label)};
}
function localReading(value){
  if(!value||typeof value!=='object')throw new Error('localReading');
  const list=(items,max,label)=>{if(!Array.isArray(items)||items.length<1||items.length>max)throw new Error(label);return items.map(item=>text(item,360,label))};
  return {summary:text(value.summary,1000,'summary'),situation:text(value.situation,1000,'situation'),turningPoint:text(value.turningPoint,1800,'turningPoint'),trend:text(value.trend,1000,'trend'),actions:list(value.actions,3,'actions'),cautions:list(value.cautions,3,'cautions')};
}
function tenWingSources(value){
  if(!Array.isArray(value)||value.length<1||value.length>8)throw new Error('tenWings');
  return value.map((source,itemIndex)=>{
    if(!source||typeof source!=='object')throw new Error(`tenWings[${itemIndex}]`);
    if(!['primary','relating'].includes(source.hexagramRole)||!['direct','mention'].includes(source.kind))throw new Error(`tenWings[${itemIndex}]`);
    return {title:text(source.title,40,'ten Wings title'),sectionNumber:index(source.sectionNumber,999,'ten Wings section'),hexagramRole:source.hexagramRole,kind:source.kind,excerpt:text(source.excerpt,600,'ten Wings excerpt')};
  });
}

export function validateReadingPayload(value){
  try{
    if(!value||typeof value!=='object'||JSON.stringify(value).length>12*1024)return invalid('请求内容过大或格式不正确。');
    if(value.version!==1)return invalid('不支持的请求版本。');
    if(value.language!==undefined&&value.language!=='en'&&value.language!=='zh-CN')return invalid('不支持的语言。');
    const moving=uniqueIndexes(value.moving,6,'moving'),primary=uniqueIndexes(value.rule?.primary,6,'primary');
    if(typeof value.rule?.fromChanged!=='boolean')throw new Error('rule');
    if(!Array.isArray(value.primaryLines)||value.primaryLines.length>6)throw new Error('primaryLines');
    const copy={version:1,language:value.language==='en'?'en':'zh-CN',question:text(value.question,100,'question'),originalIndex:index(value.originalIndex,63,'originalIndex'),changedIndex:index(value.changedIndex,63,'changedIndex'),original:hexagram(value.original,'original'),changed:hexagram(value.changed,'changed'),moving,rule:{text:text(value.rule.text,400,'rule'),fromChanged:value.rule.fromChanged,primary},primaryLines:value.primaryLines.map(line=>({label:text(line?.label,16,'line label'),text:text(line?.text,800,'line text')})),tenWings:tenWingSources(value.tenWings),localReading:localReading(value.localReading)};
    if(copy.question.length<8)return invalid('问题过短。');
    return {ok:true,value:copy};
  }catch(error){return invalid('请求字段不完整：'+error.message+'。')}
}

export async function hashedIpKey(ip,salt,bucket){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(String(salt)+':'+String(bucket)+':'+String(ip)));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function consumeLimits({namespace,ip,salt,now=new Date(),perIpLimit=5,dailyLimit=50}){
  if(!namespace||typeof namespace.idFromName!=='function'||typeof namespace.get!=='function')throw new Error('RATE_LIMITER binding missing');
  const hour=now.toISOString().slice(0,13).replace(/[-T:]/g,''),day=now.toISOString().slice(0,10).replace(/-/g,'');
  const ipHash=await hashedIpKey(ip,salt,hour),stub=namespace.get(namespace.idFromName('global'));
  if(!stub||typeof stub.fetch!=='function')throw new Error('RATE_LIMITER stub missing');
  const response=await stub.fetch('https://rate-limiter/internal',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hour,day,ipHash,perIpLimit,dailyLimit})});
  if(!response.ok)throw new Error('RATE_LIMITER response failed');
  const result=await response.json();
  if(!result||typeof result.ok!=='boolean'||(!result.ok&&!['RATE_LIMITED','DAILY_LIMIT_REACHED'].includes(result.code)))throw new Error('RATE_LIMITER response invalid');
  return result;
}
