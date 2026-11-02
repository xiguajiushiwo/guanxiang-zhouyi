import assert from 'node:assert/strict';
import {signClientIp,resolveClientIp,IP_HEADERS} from './functions/_shared/domain-proxy.mjs';
import worker,{forward} from './domain-worker/index.mjs';

const secret='test-domain-proxy-secret',now=1793613000000,ip='203.0.113.8',base='https://guanxiang.wayella.com';
const original=new Request(base+'/api/reading?mode=study',{method:'POST',body:'{}'});
const signed=await signClientIp(original,secret,ip,now);
const forwarded=(changes={},url='https://guanxiang-zhouyi-evf.pages.dev/api/reading?mode=study',method='POST')=>new Request(url,{method,headers:{...signed,'cf-connecting-ip':'2a06:98c0:3600::103',...changes}});
assert.equal(await resolveClientIp(forwarded(),secret,now),ip);
for(const request of [forwarded({[IP_HEADERS[0]]:'203.0.113.9'}),forwarded({[IP_HEADERS[2]]:'0'.repeat(64)}),forwarded({},base+'/api/account/me'),forwarded({},original.url,'GET')]){
  assert.equal(await resolveClientIp(request,secret,now),'2a06:98c0:3600::103');
}
assert.equal(await resolveClientIp(forwarded(),secret,now+61000),'2a06:98c0:3600::103');
assert.equal(await resolveClientIp(forwarded(),undefined,now),'2a06:98c0:3600::103');
assert.equal(await resolveClientIp(new Request(base,{headers:{'cf-connecting-ip':ip}}),secret,now),ip);

let captured,body;
const response=await forward(new Request(base+'/api/account/login',{method:'POST',headers:{'cf-connecting-ip':ip,cookie:'__Host-guanxiang_session=test','content-type':'application/json',[IP_HEADERS[0]]:'1.1.1.1'},body:'{"email":"test@example.com"}'}),{DOMAIN_PROXY_SECRET:secret},async request=>{
  captured=request;body=await request.text();
  return new Response('streamed result',{headers:{'set-cookie':'__Host-guanxiang_session=new; Path=/; Secure; HttpOnly; SameSite=Lax','cache-control':'no-store'}});
});
assert.equal(captured.url,'https://guanxiang-zhouyi-evf.pages.dev/api/account/login');
assert.equal(captured.headers.get('cookie'),'__Host-guanxiang_session=test');
assert.equal(await resolveClientIp(captured,secret),ip);
assert.equal(body,'{"email":"test@example.com"}');
assert.equal(response.headers.get('cache-control'),'no-store');
assert.match(response.headers.get('set-cookie'),/__Host-guanxiang_session=new/);
assert.equal(await response.text(),'streamed result');
assert.equal((await forward(new Request(base+'/api/reading',{method:'POST',body:'{}'}),{})).status,503);
assert.equal((await forward(new Request('https://other.example/'),{})).status,404);
assert.equal((await forward(new Request('http://guanxiang.wayella.com/#welcome'),{})).status,308);
const asset=await forward(new Request(base+'/auth?next=home',{headers:signed}),{},async request=>{
  IP_HEADERS.forEach(name=>assert.equal(request.headers.has(name),false));
  return Response.redirect('https://guanxiang-zhouyi-evf.pages.dev/auth.html?next=home',302);
});
assert.equal(asset.headers.get('location'),base+'/auth.html?next=home');
assert.equal((await forward(new Request(base),{},async()=>{throw new Error('private detail')})).status,502);
const originalFetch=globalThis.fetch;
try{
  globalThis.fetch=async()=>new Response('asset');
  assert.equal(await (await worker.fetch(new Request(base),{},{waitUntil(){}})).text(),'asset');
}finally{globalThis.fetch=originalFetch}
console.log('Domain gateway passed: fixed upstream, preserved body/cookies/stream, redirects, signed client IP, expiry and forged-header rejection.');
