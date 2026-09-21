export const MAX_ACCOUNT_BODY_BYTES=96*1024;

const jsonError=(code,status)=>new Response(JSON.stringify({error:{code,message:'The account service is temporarily unavailable.'}}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

export async function proxyAccount({request,proxySecret,clientIp='unknown',upstreamUrl,fetchImpl=globalThis.fetch}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-methods':'GET, POST, PUT, DELETE, OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store'}});
  if(!['GET','POST','PUT','DELETE'].includes(request.method))return jsonError('INVALID_REQUEST',405);
  if(!proxySecret||!upstreamUrl)return jsonError('SERVICE_ERROR',503);
  const declaredLength=Number.parseInt(request.headers.get('content-length')||'0',10);
  if(Number.isFinite(declaredLength)&&declaredLength>MAX_ACCOUNT_BODY_BYTES)return jsonError('PAYLOAD_TOO_LARGE',413);
  let body;
  try{body=request.method==='GET'?undefined:await request.arrayBuffer()}catch{return jsonError('INVALID_REQUEST',400)}
  if(body?.byteLength>MAX_ACCOUNT_BODY_BYTES)return jsonError('PAYLOAD_TOO_LARGE',413);
  const target=new URL(upstreamUrl),headers={origin:new URL(request.url).origin,'x-guanxiang-account-proxy-secret':proxySecret,'x-guanxiang-client-ip':clientIp,'accept-language':request.headers.get('accept-language')||'zh-CN'};
  if(request.headers.has('content-type'))headers['content-type']=request.headers.get('content-type');
  if(request.headers.has('cookie'))headers.cookie=request.headers.get('cookie');
  let upstream;
  try{upstream=await fetchImpl(target,{method:request.method,headers,body})}catch{return jsonError('SERVICE_ERROR',503)}
  const responseHeaders=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff'});
  responseHeaders.set('content-type',upstream.headers.get('content-type')||'application/json; charset=utf-8');
  const cookies=upstream.headers.getSetCookie?.()||[];
  if(cookies.length)cookies.forEach(cookie=>responseHeaders.append('set-cookie',cookie));
  else if(upstream.headers.has('set-cookie'))responseHeaders.set('set-cookie',upstream.headers.get('set-cookie'));
  return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
}
