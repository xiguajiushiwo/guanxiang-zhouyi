export const UPSTREAM_URL='https://guanxiang-ai-reading.1510351214.workers.dev';
export const MAX_BODY_BYTES=12*1024;

const jsonError=(code,status)=>new Response(JSON.stringify({error:{code,message:'AI reading service is temporarily unavailable.'}}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

export async function proxyReading({request,proxySecret,clientIp='unknown',fetchImpl=globalThis.fetch}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store'}});
  if(request.method!=='POST')return jsonError('INVALID_REQUEST',405);
  if(!proxySecret)return jsonError('SERVICE_ERROR',503);

  const declaredLength=Number.parseInt(request.headers.get('content-length')||'0',10);
  if(Number.isFinite(declaredLength)&&declaredLength>MAX_BODY_BYTES)return jsonError('INVALID_REQUEST',413);

  let body;
  try{body=await request.arrayBuffer()}catch{return jsonError('INVALID_REQUEST',400)}
  if(body.byteLength>MAX_BODY_BYTES)return jsonError('INVALID_REQUEST',413);

  let upstream;
  try{
    upstream=await fetchImpl(UPSTREAM_URL,{method:'POST',headers:{'content-type':'application/json','origin':new URL(request.url).origin,'x-guanxiang-client-ip':clientIp,'x-guanxiang-proxy-secret':proxySecret},body});
  }catch{return jsonError('SERVICE_ERROR',503)}

  const headers=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff'});
  headers.set('content-type',upstream.headers.get('content-type')||'text/plain; charset=utf-8');
  if(upstream.headers.has('retry-after'))headers.set('retry-after',upstream.headers.get('retry-after'));
  return new Response(upstream.body,{status:upstream.status,headers});
}
