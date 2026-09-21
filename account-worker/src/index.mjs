import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from './crypto.mjs';
import { MAX_BODY_BYTES, normalizeCredentials, normalizeRecord, normalizeRecords, readJson } from './validation.mjs';

const SESSION_MAX_AGE=30*24*60*60;
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const messages={INVALID_REQUEST:'请求格式不正确。',INVALID_CREDENTIALS:'邮箱或密码无效。',ACCOUNT_EXISTS:'邮箱或密码无效。',UNAUTHORIZED:'请先登录。',INVALID_RECORDS:'占问记录格式不正确。',PAYLOAD_TOO_LARGE:'请求内容过大。',SERVICE_ERROR:'账户服务暂时异常。'};
const messagesEn={INVALID_REQUEST:'The request is invalid.',INVALID_CREDENTIALS:'The email or password is not valid.',ACCOUNT_EXISTS:'The email or password is not valid.',UNAUTHORIZED:'Please sign in first.',INVALID_RECORDS:'The reading record is invalid.',PAYLOAD_TOO_LARGE:'The request is too large.',SERVICE_ERROR:'The account service is temporarily unavailable.'};
const messagesFa={INVALID_REQUEST:'قالب درخواست معتبر نیست.',INVALID_CREDENTIALS:'ایمیل یا رمز عبور معتبر نیست.',ACCOUNT_EXISTS:'ایمیل یا رمز عبور معتبر نیست.',UNAUTHORIZED:'ابتدا وارد شوید.',INVALID_RECORDS:'قالب رکورد خوانش معتبر نیست.',PAYLOAD_TOO_LARGE:'حجم درخواست بیش از حد مجاز است.',SERVICE_ERROR:'خدمت حساب موقتاً دچار مشکل است.'};

function message(code,language='zh-CN'){const table=language==='en'?messagesEn:language==='fa'?messagesFa:messages;return table[code]||table.SERVICE_ERROR}
function error(code,status,language='zh-CN',headers={}){return json({error:{code,message:message(code,language)}},status,headers)}
function allowedOrigins(value){return new Set(String(value||'').split(',').map(item=>item.trim()).filter(Boolean))}
function cookieValue(request){const cookie=request.headers.get('cookie')||'';const match=cookie.match(/(?:^|;\s*)__Host-guanxiang_session=([^;]+)/);return match?.[1]||''}
function cookieHeader(token,maxAge=SESSION_MAX_AGE){return `__Host-guanxiang_session=${token}; Max-Age=${maxAge}; Path=/; Secure; HttpOnly; SameSite=Lax`}
function languageFor(request,body){return body?.language==='en'||body?.language==='fa'?body.language:(request.headers.get('accept-language')||'').toLowerCase().startsWith('fa')?'fa':'zh-CN'}
function routePath(request){const path=new URL(request.url).pathname.replace(/\/+/g,'/').replace(/\/$/,'');return path.replace(/^\/api\/account/,'')||'/'}
function recordFromRow(row){try{return JSON.parse(row.payload_json)}catch{return null}}

async function sessionFor(request,env){
  const token=cookieValue(request);if(!token)return null;
  const tokenHash=await hashSessionToken(token),session=await env.DB.prepare('/* session */ SELECT token_hash,user_id,expires_at FROM sessions WHERE token_hash = ?').bind(tokenHash).first();
  if(!session||new Date(session.expires_at).getTime()<=Date.now())return null;
  const user=await env.DB.prepare('/* user-by-id */ SELECT id,email,preferred_language FROM users WHERE id = ?').bind(session.user_id).first();
  return user?{...session,user}:null;
}

async function issueSession(userId,env){
  const token=createSessionToken(),tokenHash=await hashSessionToken(token),createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+SESSION_MAX_AGE*1000).toISOString();
  await env.DB.prepare('/* insert-session */ INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(tokenHash,userId,expiresAt,createdAt).run();
  return cookieHeader(token);
}

async function register(request,env){
  const parsed=await readJson(request);if(!parsed.ok)return error(parsed.code,parsed.code==='PAYLOAD_TOO_LARGE'?413:400);
  const credentials=normalizeCredentials(parsed.value);if(!credentials.ok)return error(credentials.code,400);
  const {email,password,language}=credentials.value;
  if(await env.DB.prepare('/* user-by-email */ SELECT id FROM users WHERE email = ?').bind(email).first())return error('ACCOUNT_EXISTS',409,language);
  const now=new Date().toISOString(),userId=crypto.randomUUID(),passwordHash=await hashPassword(password);
  try{await env.DB.prepare('/* insert-user */ INSERT INTO users(id,email,password_hash,preferred_language,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(userId,email,passwordHash,language,now,now).run()}catch{return error('ACCOUNT_EXISTS',409,language)}
  return json({user:{email,preferredLanguage:language}},201,{'set-cookie':await issueSession(userId,env)})
}

async function login(request,env){
  const parsed=await readJson(request);if(!parsed.ok)return error(parsed.code,parsed.code==='PAYLOAD_TOO_LARGE'?413:400);
  const credentials=normalizeCredentials(parsed.value);if(!credentials.ok)return error('INVALID_CREDENTIALS',401);
  const {email,password}=credentials.value,user=await env.DB.prepare('/* user-by-email */ SELECT id,email,password_hash,preferred_language FROM users WHERE email = ?').bind(email).first();
  if(!user||!(await verifyPassword(password,user.password_hash)))return error('INVALID_CREDENTIALS',401,credentials.value.language);
  return json({user:{email:user.email,preferredLanguage:user.preferred_language}},200,{'set-cookie':await issueSession(user.id,env)})
}

async function requireSession(request,env){const session=await sessionFor(request,env);return session||null}
function userResponse(session){return {email:session.user.email,preferredLanguage:session.user.preferred_language}}

async function listReadings(session,env){
  const rows=await env.DB.prepare('/* readings-for-user */ SELECT id,payload_json,language,created_at,updated_at FROM readings WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100').bind(session.user_id).all();
  return json({records:rows.results.map(recordFromRow).filter(Boolean)});
}

async function upsertRecord(request,session,env,id=null){
  const parsed=await readJson(request);if(!parsed.ok)return error(parsed.code,parsed.code==='PAYLOAD_TOO_LARGE'?413:400);
  const normalized=normalizeRecord(parsed.value);if(!normalized.ok)return error(normalized.code,400);
  const record=normalized.value;if(id&&record.id!==id)return error('INVALID_RECORDS',400);
  const existing=await env.DB.prepare('/* reading-by-user */ SELECT id,payload_json,language,created_at,updated_at FROM readings WHERE id = ? AND user_id = ?').bind(record.id,session.user_id).first();
  const now=new Date().toISOString(),language=record.aiReading?.language||'zh-CN',serialized=JSON.stringify(record);
  if(existing)await env.DB.prepare('/* update-reading */ UPDATE readings SET payload_json=?,language=?,updated_at=? WHERE id=? AND user_id=?').bind(serialized,language,record.updatedAt||now,record.id,session.user_id).run();
  else await env.DB.prepare('/* insert-reading */ INSERT INTO readings(id,user_id,payload_json,language,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(record.id,session.user_id,serialized,language,record.createdAt||now,record.updatedAt||now).run();
  return json({record});
}

async function deleteRecord(session,env,id){
  const existing=await env.DB.prepare('/* reading-by-user */ SELECT id FROM readings WHERE id = ? AND user_id = ?').bind(id,session.user_id).first();
  if(!existing)return error('INVALID_RECORDS',404);
  await env.DB.prepare('/* delete-reading */ DELETE FROM readings WHERE id=? AND user_id=?').bind(id,session.user_id).run();
  return new Response(null,{status:204,headers:{'cache-control':'no-store'}});
}

async function mergeRecords(request,session,env){
  const parsed=await readJson(request);if(!parsed.ok)return error(parsed.code,parsed.code==='PAYLOAD_TOO_LARGE'?413:400);
  const normalized=normalizeRecords(parsed.value);if(!normalized.ok)return error(normalized.code,400);
  for(const record of normalized.value){
    const fakeRequest=new Request(request.url,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(record)});
    await upsertRecord(fakeRequest,session,env);
  }
  return listReadings(session,env);
}

export default {async fetch(request,env){
  const origin=request.headers.get('origin')||'',allowed=allowedOrigins(env.ALLOWED_ORIGINS),language=(request.headers.get('accept-language')||'').toLowerCase().startsWith('fa')?'fa':'zh-CN';
  if(!origin||!allowed.has(origin))return error('UNAUTHORIZED',403,language);
  if(env.ACCOUNT_PROXY_SECRET && request.headers.get('x-guanxiang-account-proxy-secret')!==env.ACCOUNT_PROXY_SECRET)return error('UNAUTHORIZED',403,language);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-methods':'GET, POST, PUT, DELETE, OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store','vary':'Origin'}});
  if(!env.DB||!env.SESSION_SECRET)return error('SERVICE_ERROR',503,language);
  const path=routePath(request),segments=path.split('/').filter(Boolean),route=segments[0]||'';
  try{
    if(route==='register'&&request.method==='POST')return register(request,env);
    if(route==='login'&&request.method==='POST')return login(request,env);
    if(route==='logout'&&request.method==='POST'){const token=cookieValue(request);if(token)await env.DB.prepare('/* delete-session */ DELETE FROM sessions WHERE token_hash=?').bind(await hashSessionToken(token)).run();return new Response(null,{status:204,headers:{'set-cookie':cookieHeader('',0),'cache-control':'no-store'}})}
    const session=await requireSession(request,env);if(!session)return error('UNAUTHORIZED',401,language);
    if(route==='me'&&request.method==='GET')return json({user:userResponse(session)});
    if(route==='readings'&&segments.length===1&&request.method==='GET')return listReadings(session,env);
    if(route==='readings'&&segments[1]==='merge'&&request.method==='POST')return mergeRecords(request,session,env);
    if(route==='readings'&&segments[1]&&request.method==='PUT')return upsertRecord(request,session,env,segments[1]);
    if(route==='readings'&&segments[1]&&request.method==='DELETE')return deleteRecord(session,env,segments[1]);
    if(route==='readings'&&segments.length===1&&request.method==='PUT')return upsertRecord(request,session,env);
    return error('INVALID_REQUEST',405,language);
  }catch(error){return error('SERVICE_ERROR',503,language)}
}};

export { MAX_BODY_BYTES };
