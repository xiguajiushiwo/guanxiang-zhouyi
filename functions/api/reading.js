import { MAX_BODY_BYTES, UPSTREAM_URL, proxyReading } from '../_shared/reading-proxy.mjs';

export async function onRequest({request,env}){
  return proxyReading({request,proxySecret:env?.PROXY_SECRET,clientIp:request.headers.get('cf-connecting-ip')||'unknown'});
}

export { MAX_BODY_BYTES, UPSTREAM_URL };
