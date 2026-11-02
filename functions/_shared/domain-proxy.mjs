const encoder=new TextEncoder();
export const IP_HEADERS=['x-guanxiang-edge-ip','x-guanxiang-edge-time','x-guanxiang-edge-signature'];
const message=(request,ip,time)=>{const url=new URL(request.url);return encoder.encode([request.method,url.pathname+url.search,ip,time].join('\n'))};
const key=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);

// Cross-zone Worker fetches replace CF-Connecting-IP. Carry the client address
// only through an authenticated, short-lived envelope to preserve rate limits.
export async function signClientIp(request,secret,ip,now=Date.now()){
  const time=String(Math.floor(now/1000));
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),message(request,ip,time)));
  return {[IP_HEADERS[0]]:ip,[IP_HEADERS[1]]:time,[IP_HEADERS[2]]:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
}

export async function resolveClientIp(request,secret,now=Date.now()){
  const fallback=request.headers.get('cf-connecting-ip')||'unknown';
  const [ip,time,signature]=IP_HEADERS.map(name=>request.headers.get(name)||'');
  if(!secret||!ip||ip.length>45||!/^[0-9a-fA-F:.]+$/.test(ip)||!/^\d{10}$/.test(time)||Math.abs(Math.floor(now/1000)-Number(time))>60||!/^[0-9a-f]{64}$/.test(signature))return fallback;
  const bytes=Uint8Array.from(signature.match(/../g),value=>parseInt(value,16));
  return await crypto.subtle.verify('HMAC',await key(secret),bytes,message(request,ip,time))?ip:fallback;
}
