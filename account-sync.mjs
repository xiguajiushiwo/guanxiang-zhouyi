const DEFAULT_ACCOUNT_API='/api/account';

function apiUrl(path,base=DEFAULT_ACCOUNT_API){
  const root=String(base||DEFAULT_ACCOUNT_API).replace(/\/$/,'');
  return `${root}/${String(path||'').replace(/^\//,'')}`;
}

export class AccountApiError extends Error {
  constructor(code,message,status){super(message||code);this.name='AccountApiError';this.code=code;this.status=status}
}

async function accountRequest(path,{method='GET',body,language='zh-CN',apiBase,fetchImpl=globalThis.fetch}={}){
  const headers={'accept-language':language==='fa'?'fa,en;q=0.8':language==='en'?'en,zh-CN;q=0.8':'zh-CN,en;q=0.8'};
  if(body!==undefined)headers['content-type']='application/json';
  let response;
  try{response=await fetchImpl(apiUrl(path,apiBase),{method,headers,credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body)})}
  catch(error){throw new AccountApiError('NETWORK_ERROR','Account service is unavailable.',0)}
  let payload=null;
  try{payload=await response.json()}catch{}
  if(!response.ok){const error=payload?.error||{};throw new AccountApiError(error.code||`HTTP_${response.status}`,error.message||'Account request failed.',response.status)}
  return payload;
}

export function createAccountClient({apiBase=DEFAULT_ACCOUNT_API,fetchImpl=globalThis.fetch,language='zh-CN'}={}){
  const call=(path,options={})=>accountRequest(path,{...options,apiBase,fetchImpl,language:options.language||language});
  return {
    me:()=>call('me'),
    register:(email,password)=>call('register',{method:'POST',body:{email,password,language}}),
    login:(email,password)=>call('login',{method:'POST',body:{email,password,language}}),
    logout:()=>call('logout',{method:'POST'}),
    listReadings:()=>call('readings'),
    mergeReadings:records=>call('readings/merge',{method:'POST',body:{records}}),
    upsertReading:record=>call(`readings/${encodeURIComponent(record.id)}`,{method:'PUT',body:record}),
    deleteReading:id=>call(`readings/${encodeURIComponent(id)}`,{method:'DELETE'}),
  };
}

export async function getAccountSession(options={}){
  try{return (await createAccountClient(options).me()).user||null}
  catch(error){if(error.status===401||error.status===403)return null;throw error}
}

export async function synchronizeHistory({client,localRecords,strategy='merge'}={}){
  if(!client)throw new TypeError('client is required');
  const remote=(await client.listReadings()).records||[];
  if(strategy==='cloud')return {records:remote,uploaded:0};
  if(strategy!=='merge')throw new TypeError('strategy must be merge or cloud');
  if(!localRecords?.length)return {records:remote,uploaded:0};
  const merged=await client.mergeReadings(localRecords);
  return {records:merged.records||[],uploaded:localRecords.length};
}

export { DEFAULT_ACCOUNT_API, accountRequest };
