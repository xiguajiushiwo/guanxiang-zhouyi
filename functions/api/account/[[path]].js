import { proxyAccount } from '../../_shared/account-proxy.mjs';
import { resolveClientIp } from '../../_shared/domain-proxy.mjs';

const ACCOUNT_WORKER_URL='https://guanxiang-account.1510351214.workers.dev';
export async function onRequest({request,env}){
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/account/,'')||'/';
  const upstream=new URL(path+url.search,env?.ACCOUNT_WORKER_URL||ACCOUNT_WORKER_URL);
  return proxyAccount({request,upstreamUrl:upstream,proxySecret:env?.ACCOUNT_PROXY_SECRET,clientIp:await resolveClientIp(request,env?.DOMAIN_PROXY_SECRET),fetchImpl:env?.fetchImpl||globalThis.fetch});
}

export { ACCOUNT_WORKER_URL };
