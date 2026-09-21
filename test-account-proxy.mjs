import assert from 'node:assert/strict';
import { MAX_ACCOUNT_BODY_BYTES, proxyAccount } from './functions/_shared/account-proxy.mjs';
import { onRequest } from './functions/api/account/[[path]].js';

const secret='account-proxy-secret',origin='https://guanxiang-zhouyi-evf.pages.dev';
let captured;
const fetchImpl=async(url,init)=>{
  captured={url,init};
  return new Response(JSON.stringify({user:{email:'reader@example.com'}}),{status:200,headers:[['content-type','application/json'],['set-cookie','__Host-guanxiang_session=abc; Path=/; Secure; HttpOnly; SameSite=Lax']]});
};
const response=await proxyAccount({request:new Request(`${origin}/api/account/me`,{headers:{origin,cookie:'__Host-guanxiang_session=old', 'accept-language':'fa'}}),proxySecret:secret,clientIp:'203.0.113.8',upstreamUrl:'https://account.example/me',fetchImpl});
assert.equal(response.status,200);
assert.equal((await response.json()).user.email,'reader@example.com');
assert.equal(captured.url.toString(),'https://account.example/me');
assert.equal(captured.init.headers.cookie,'__Host-guanxiang_session=old');
assert.equal(captured.init.headers.origin,origin);
assert.equal(captured.init.headers['x-guanxiang-client-ip'],'203.0.113.8');
assert.equal(response.headers.get('set-cookie').includes('__Host-guanxiang_session=abc'),true);
assert.equal((await proxyAccount({request:new Request(`${origin}/api/account/me`,{method:'POST',body:'x'.repeat(MAX_ACCOUNT_BODY_BYTES+1)}),proxySecret:secret,upstreamUrl:'https://account.example/me',fetchImpl})).status,413);
assert.equal((await onRequest({request:new Request(`${origin}/api/account/me`),env:{ACCOUNT_PROXY_SECRET:secret,ACCOUNT_WORKER_URL:'https://account.example',fetchImpl}})).status,200);
console.log('Account proxy tests passed.');
