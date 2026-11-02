import { MAX_BODY_BYTES, UPSTREAM_URL, proxyReading } from '../_shared/reading-proxy.mjs';
import { resolveClientIp } from '../_shared/domain-proxy.mjs';

export async function onRequest({request,env}){
  return proxyReading({request,proxySecret:env?.PROXY_SECRET,clientIp:await resolveClientIp(request,env?.DOMAIN_PROXY_SECRET)});
}

export { MAX_BODY_BYTES, UPSTREAM_URL };
