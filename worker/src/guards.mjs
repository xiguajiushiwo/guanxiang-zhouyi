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

export function validateReadingPayload(value){
  try{
    if(!value||typeof value!=='object'||JSON.stringify(value).length>12*1024)return invalid('请求内容过大或格式不正确。');
    if(value.version!==1)return invalid('不支持的请求版本。');
    const moving=uniqueIndexes(value.moving,6,'moving'),primary=uniqueIndexes(value.rule?.primary,6,'primary');
    if(typeof value.rule?.fromChanged!=='boolean')throw new Error('rule');
    if(!Array.isArray(value.primaryLines)||value.primaryLines.length>6)throw new Error('primaryLines');
    const copy={version:1,question:text(value.question,100,'question'),originalIndex:index(value.originalIndex,63,'originalIndex'),changedIndex:index(value.changedIndex,63,'changedIndex'),original:hexagram(value.original,'original'),changed:hexagram(value.changed,'changed'),moving,rule:{text:text(value.rule.text,400,'rule'),fromChanged:value.rule.fromChanged,primary},primaryLines:value.primaryLines.map(line=>({label:text(line?.label,16,'line label'),text:text(line?.text,800,'line text')})),localReading:localReading(value.localReading)};
    if(copy.question.length<8)return invalid('问题过短。');
    return {ok:true,value:copy};
  }catch(error){return invalid('请求字段不完整：'+error.message+'。')}
}

export async function hashedIpKey(ip,salt,bucket){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(String(salt)+':'+String(bucket)+':'+String(ip)));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function consumeCounter(kv,key,limit,expirationTtl){
  const current=Number.parseInt(await kv.get(key),10)||0;
  if(current>=limit)return false;
  await kv.put(key,String(current+1),{expirationTtl});
  return true;
}

// KV increments are a best-effort cost guard, not an atomic billing ledger.
export async function consumeLimits({kv,ip,salt,now=new Date(),perIpLimit=5,dailyLimit=50}){
  const hour=now.toISOString().slice(0,13).replace(/[-T:]/g,''),day=now.toISOString().slice(0,10).replace(/-/g,'');
  const digest=await hashedIpKey(ip,salt,hour);
  if(!await consumeCounter(kv,'ip:'+hour+':'+digest,perIpLimit,3900))return {ok:false,code:'RATE_LIMITED'};
  if(!await consumeCounter(kv,'global:'+day,dailyLimit,90000))return {ok:false,code:'DAILY_LIMIT_REACHED'};
  return {ok:true};
}
