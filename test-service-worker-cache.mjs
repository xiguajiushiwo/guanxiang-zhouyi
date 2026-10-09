import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('./service-worker.js',import.meta.url),'utf8');
const handlers={};
const writes=[];
let skipWaitingCalls=0,networkCalls=0,networkFails=false,cachedResponse=null;
const response=source=>({ok:true,source,clone(){return response(source)}});
const cache={
  addAll:async()=>{},
  put:async(request,value)=>writes.push({request,value}),
};
const caches={
  open:async()=>cache,
  keys:async()=>[],
  delete:async()=>true,
  match:async()=>cachedResponse,
};
const self={
  location:{origin:'https://example.com'},
  clients:{claim:async()=>{}},
  addEventListener:(type,handler)=>{handlers[type]=handler},
  skipWaiting:async()=>{skipWaitingCalls+=1},
};
const fetch=async()=>{networkCalls+=1;if(networkFails)throw new Error('offline');return response('network')};
vm.runInNewContext(source,{self,caches,fetch,URL,Response:{error:()=>response('error')}});

let pending;
handlers.install({waitUntil:value=>{pending=value}});
await pending;
assert.equal(skipWaitingCalls,1,'new service worker should activate immediately');

const request={method:'GET',mode:'navigate',url:'https://example.com/auth?v=20260922-auth7'};
handlers.fetch({request,respondWith:value=>{pending=value}});
assert.equal((await pending).source,'network','navigation should prefer the network');
assert.equal(networkCalls,1);
assert.equal(writes.length,1,'fresh navigation should update the cache');

networkFails=true;
cachedResponse=response('cached');
handlers.fetch({request,respondWith:value=>{pending=value}});
assert.equal((await pending).source,'cached','offline navigation should fall back to cache');

cachedResponse=null;
const routeLookups=[];
caches.match=async request=>{
  routeLookups.push(request);
  return typeof request==='string'?response(request):null;
};
for(const [path,fallback] of [['/privacy','./privacy.html'],['/support','./support.html'],['/auth','./auth.html'],['/unknown','./index.html']]){
  routeLookups.length=0;
  const routeRequest={method:'GET',mode:'navigate',url:`https://example.com${path}`};
  handlers.fetch({request:routeRequest,respondWith:value=>{pending=value}});
  assert.equal((await pending).source,fallback,`${path} should use its own offline document`);
  assert.equal(routeLookups.at(-1),fallback);
}

console.log('Service worker navigation cache strategy passed.');
