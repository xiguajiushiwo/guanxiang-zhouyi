import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleNetlifyReading } from './netlify/functions/reading.mjs';

const site='https://guanxiang-zhouyi-global.netlify.app';
const secret='netlify-proxy-secret';
const payload=JSON.stringify({question:'所问'});

let captured;
const fetchImpl=async(url,init)=>{
  captured={url,init};
  return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('完整解读'));controller.close()}}),{status:200,headers:{'content-type':'text/plain; charset=utf-8'}});
};

const response=await handleNetlifyReading(new Request(`${site}/api/reading`,{method:'POST',headers:{'content-type':'application/json','x-nf-client-connection-ip':'192.0.2.9'},body:payload}),{ip:'198.51.100.24'},{PROXY_SECRET:secret,fetchImpl});
assert.equal(response.status,200);
assert.equal(await response.text(),'完整解读');
assert.equal(captured.init.headers.origin,site);
assert.equal(captured.init.headers['x-guanxiang-client-ip'],'198.51.100.24');
assert.equal(captured.init.headers['x-guanxiang-proxy-secret'],secret);
assert.equal(new TextDecoder().decode(captured.init.body),payload);

await handleNetlifyReading(new Request(`${site}/api/reading`,{method:'POST',headers:{'x-nf-client-connection-ip':'192.0.2.9'},body:'{}'}),{},{PROXY_SECRET:secret,fetchImpl});
assert.equal(captured.init.headers['x-guanxiang-client-ip'],'192.0.2.9');

const missing=await handleNetlifyReading(new Request(`${site}/api/reading`,{method:'POST',body:'{}'}),{},{});
assert.equal(missing.status,503);

const config=await readFile(new URL('./netlify.toml',import.meta.url),'utf8');
assert.match(config,/command\s*=\s*"npm run build:pages"/);
assert.match(config,/publish\s*=\s*"dist"/);
assert.match(config,/functions\s*=\s*"netlify\/functions"/);
assert.match(config,/from\s*=\s*"\/api\/reading"/);
assert.match(config,/to\s*=\s*"\/\.netlify\/functions\/reading"/);

console.log('Netlify proxy tests passed.');
