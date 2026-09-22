// Cloudflare Workers production Web Crypto currently caps PBKDF2 at 100,000 iterations.
const ITERATIONS=100000;
const encoder=new TextEncoder();

function base64(bytes){return btoa(String.fromCharCode(...bytes))}
function bytes(value){return Uint8Array.from(atob(value),char=>char.charCodeAt(0))}

export async function hashPassword(password,cryptoImpl=globalThis.crypto){
  const salt=cryptoImpl.getRandomValues(new Uint8Array(16));
  const key=await cryptoImpl.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const derived=await cryptoImpl.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},key,256);
  return `pbkdf2-sha256$${ITERATIONS}$${base64(salt)}$${base64(new Uint8Array(derived))}`;
}

export async function verifyPassword(password,encoded,cryptoImpl=globalThis.crypto){
  try{
    const [algorithm,iterationText,saltText,hashText]=String(encoded).split('$');
    if(algorithm!=='pbkdf2-sha256')return false;
    const iterations=Number(iterationText),salt=bytes(saltText),expected=bytes(hashText);
    if(!Number.isInteger(iterations)||iterations<100000||iterations>500000||expected.length!==32)return false;
    const key=await cryptoImpl.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
    const derived=new Uint8Array(await cryptoImpl.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,256));
    let difference=0;for(let index=0;index<expected.length;index+=1)difference|=derived[index]^expected[index];
    return difference===0;
  }catch{return false}
}

export async function hashSessionToken(token,cryptoImpl=globalThis.crypto){
  const digest=await cryptoImpl.subtle.digest('SHA-256',encoder.encode(token));
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export function createSessionToken(cryptoImpl=globalThis.crypto){return base64(cryptoImpl.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
