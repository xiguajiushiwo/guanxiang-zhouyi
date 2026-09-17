import { proxyReading } from '../../functions/_shared/reading-proxy.mjs';

export function handleNetlifyReading(request,context={},env={}){
  const proxySecret=env.PROXY_SECRET??process.env.PROXY_SECRET;
  const clientIp=context.ip||request.headers.get('x-nf-client-connection-ip')||'unknown';
  return proxyReading({request,proxySecret,clientIp,fetchImpl:env.fetchImpl||globalThis.fetch});
}

export default (request,context)=>handleNetlifyReading(request,context);
