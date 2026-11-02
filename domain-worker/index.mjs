import {IP_HEADERS,signClientIp} from '../functions/_shared/domain-proxy.mjs';

const HOST='guanxiang.wayella.com',UPSTREAM='guanxiang-zhouyi-evf.pages.dev';
export async function forward(request,env,fetchImpl=globalThis.fetch){
  const url=new URL(request.url);
  if(url.hostname!==HOST)return new Response('Not found',{status:404});
  if(url.protocol!=='https:'){url.protocol='https:';return Response.redirect(url,308)}
  const headers=new Headers(request.headers);
  IP_HEADERS.forEach(name=>headers.delete(name));
  if(url.pathname.startsWith('/api/')){
    if(!env.DOMAIN_PROXY_SECRET)return new Response('Service temporarily unavailable',{status:503,headers:{'cache-control':'no-store'}});
    const signed=await signClientIp(request,env.DOMAIN_PROXY_SECRET,request.headers.get('cf-connecting-ip')||'unknown');
    Object.entries(signed).forEach(([name,value])=>headers.set(name,value));
  }
  url.hostname=UPSTREAM;url.port='';
  const upstream=new Request(url,new Request(request,{headers,redirect:'manual'}));
  let response;
  try{response=await fetchImpl(upstream)}catch{return new Response('Service temporarily unavailable',{status:502,headers:{'cache-control':'no-store'}})}
  const location=response.headers.get('location');
  if(location){
    const target=new URL(location,url);
    if(target.hostname===UPSTREAM){
      target.hostname=HOST;target.protocol='https:';
      response=new Response(response.body,response);
      response.headers.set('location',target.href);
    }
  }
  return response;
}
export default {fetch(request,env){return forward(request,env)}};
