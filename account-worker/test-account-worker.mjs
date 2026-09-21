import assert from 'node:assert/strict';
import worker from './src/index.mjs';

class FakeStatement {
  constructor(db,sql){this.db=db;this.sql=sql;this.args=[]}
  bind(...args){this.args=args;return this}
  async first(){return this.db.first(this.sql,this.args)}
  async all(){return {results:this.db.all(this.sql,this.args)}}
  async run(){return this.db.run(this.sql,this.args)}
}

class FakeD1 {
  constructor(){this.users=new Map();this.sessions=new Map();this.readings=new Map()}
  prepare(sql){return new FakeStatement(this,sql)}
  first(sql,args){
    if(sql.includes('/* user-by-email */'))return [...this.users.values()].find(row=>row.email===args[0])||null;
    if(sql.includes('/* user-by-id */'))return this.users.get(args[0])||null;
    if(sql.includes('/* session */')){const row=this.sessions.get(args[0]);return row?{...row}:null}
    if(sql.includes('/* reading-by-user */')){const row=this.readings.get(args[0]);return row&&row.user_id===args[1]?{...row}:null}
    return null;
  }
  all(sql,args){
    if(sql.includes('/* readings-for-user */'))return [...this.readings.values()].filter(row=>row.user_id===args[0]).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
    return [];
  }
  run(sql,args){
    if(sql.includes('/* insert-user */')){const [id,email,passwordHash,language,created,updated]=args;this.users.set(id,{id,email,password_hash:passwordHash,preferred_language:language,created_at:created,updated_at:updated});return {success:true}}
    if(sql.includes('/* insert-session */')){const [tokenHash,userId,expires,created]=args;this.sessions.set(tokenHash,{token_hash:tokenHash,user_id:userId,expires_at:expires,created_at:created});return {success:true}}
    if(sql.includes('/* delete-session */')){this.sessions.delete(args[0]);return {success:true}}
    if(sql.includes('/* insert-reading */')){const [id,userId,json,language,created,updated]=args;this.readings.set(id,{id,user_id:userId,payload_json:json,language,created_at:created,updated_at:updated});return {success:true}}
    if(sql.includes('/* update-reading */')){const [json,language,updated,id,userId]=args;const row=this.readings.get(id);if(row&&row.user_id===userId)this.readings.set(id,{...row,payload_json:json,language,updated_at:updated});return {success:true}}
    if(sql.includes('/* delete-reading */')){const row=this.readings.get(args[0]);if(row&&row.user_id===args[1])this.readings.delete(args[0]);return {success:true}}
    return {success:true};
  }
}

const db=new FakeD1();
const env={DB:db,SESSION_SECRET:'test-session-secret',ALLOWED_ORIGINS:'https://example.com'};
const request=(path,method='GET',body,cookie='',origin='https://example.com')=>new Request(`https://account.example${path}`,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{} )},...(body===undefined?{}:{body:JSON.stringify(body)})});
const call=(path,method='GET',body,cookie='')=>worker.fetch(request(path,method,body,cookie),env);
const sessionCookie=response=>response.headers.get('set-cookie');

const register=await call('/register','POST',{email:'reader@example.com',password:'correct horse battery',language:'fa'});
assert.equal(register.status,201);
assert.match(sessionCookie(register),/__Host-guanxiang_session=/);
const cookie=sessionCookie(register).split(';',1)[0];
assert.deepEqual(await register.json(),{user:{email:'reader@example.com',preferredLanguage:'fa'}});
assert.equal((await call('/register','POST',{email:'reader@example.com',password:'correct horse battery'})).status,409);

const me=await call('/me','GET',undefined,cookie);
assert.equal(me.status,200);
assert.equal((await me.json()).user.email,'reader@example.com');
const badLogin=await call('/login','POST',{email:'reader@example.com',password:'wrong'});
assert.equal(badLogin.status,401);
const login=await call('/login','POST',{email:'reader@example.com',password:'correct horse battery'});
assert.equal(login.status,200);
const loginCookie=sessionCookie(login).split(';',1)[0];

const line=()=>({value:8,changes:[{before:49,removed:5,remaining:44},{before:44,removed:4,remaining:40},{before:40,removed:4,remaining:36}]});
const record={id:'reading-1',question:'Should I proceed?',lines:[{...line(),value:6},{...line(),value:7},{...line(),value:8},{...line(),value:9},{...line(),value:7},{...line(),value:8}],originalIndex:0,changedIndex:1,note:'old local note',tags:[],reviewState:'未开始',createdAt:'2026-09-20T00:00:00.000Z',updatedAt:'2026-09-20T00:00:00.000Z'};
assert.equal((await call('/readings','PUT',record,loginCookie)).status,200);
const list=await call('/readings','GET',undefined,loginCookie);
assert.equal((await list.json()).records[0].id,'reading-1');
const merge=await call('/readings/merge','POST',{records:[{...record,note:'new local note',updatedAt:'2026-09-21T00:00:00.000Z'}]},loginCookie);
assert.equal(merge.status,200);
assert.equal((await merge.json()).records[0].note,'new local note');
const otherRegister=await call('/register','POST',{email:'other@example.com',password:'another password'});
const otherCookie=sessionCookie(otherRegister).split(';',1)[0];
assert.equal((await call('/readings/reading-1','DELETE',undefined,otherCookie)).status,404);
assert.equal((await call('/logout','POST',undefined,loginCookie)).status,204);
assert.equal((await call('/me','GET',undefined,loginCookie)).status,401);

console.log('D1 account worker tests passed.');
