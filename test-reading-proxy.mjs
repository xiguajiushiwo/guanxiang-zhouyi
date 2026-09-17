import assert from 'node:assert/strict';
import { MAX_BODY_BYTES, UPSTREAM_URL, proxyReading } from './functions/_shared/reading-proxy.mjs';

const secret='test-proxy-secret';
const call=(request,options={})=>proxyReading({request,proxySecret:secret,clientIp:'203.0.113.8',...options});

assert.equal((await call(new Request('https://mirror.example/api/reading'))).status,405);
const preflight=await call(new Request('https://mirror.example/api/reading',{method:'OPTIONS'}));
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('cache-control'),'no-store');
assert.equal((await proxyReading({request:new Request('https://mirror.example/api/reading',{method:'POST',body:'{}'}),clientIp:'203.0.113.8'})).status,503);
assert.equal((await call(new Request('https://mirror.example/api/reading',{method:'POST',headers:{'content-length':String(MAX_BODY_BYTES+1)},body:'{}'}))).status,413);
assert.equal((await call(new Request('https://mirror.example/api/reading',{method:'POST',body:'x'.repeat(MAX_BODY_BYTES+1)}))).status,413);

const originalFetch=globalThis.fetch;
try{
  const payload=JSON.stringify({question:'所问'});
  let captured;
  const response=await call(new Request('https://mirror.example/api/reading',{method:'POST',headers:{'content-type':'application/json'},body:payload}),{fetchImpl:async(url,init)=>{
    captured={url,init};
    return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('第一段'));controller.enqueue(new TextEncoder().encode('第二段'));controller.close()}}),{status:200,headers:{'content-type':'text/plain; charset=utf-8','retry-after':'9','access-control-allow-origin':'*'}});
  }});
  assert.equal(captured.url,UPSTREAM_URL);
  assert.equal(captured.init.headers.origin,'https://mirror.example');
  assert.equal(captured.init.headers['x-guanxiang-client-ip'],'203.0.113.8');
  assert.equal(captured.init.headers['x-guanxiang-proxy-secret'],secret);
  assert.equal(new TextDecoder().decode(captured.init.body),payload);
  assert.equal(await response.text(),'第一段第二段');
  assert.equal(response.headers.get('retry-after'),'9');
  assert.equal(response.headers.get('access-control-allow-origin'),null);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');

  const failed=await call(new Request('https://mirror.example/api/reading',{method:'POST',body:'{}'}),{fetchImpl:async()=>{throw new Error('internal network detail')}});
  assert.equal(failed.status,503);
  assert.equal((await failed.text()).includes('internal network detail'),false);
}finally{globalThis.fetch=originalFetch}

console.log('Shared reading proxy tests passed.');
