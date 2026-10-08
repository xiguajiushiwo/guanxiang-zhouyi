import assert from 'node:assert/strict';
import { AccountApiError, DEFAULT_ACCOUNT_TIMEOUT_MS, createAccountClient, getAccountSession, synchronizeHistory } from './account-sync.mjs';

const calls=[];
const fetchImpl=async(url,init)=>{
  calls.push({url,init});
  if(String(url).endsWith('/me'))return new Response(JSON.stringify({user:{email:'a@example.com'}}),{headers:{'content-type':'application/json'}});
  if(String(url).endsWith('/readings'))return new Response(JSON.stringify({records:[{id:'remote'}]}),{headers:{'content-type':'application/json'}});
  if(String(url).endsWith('/readings/merge'))return new Response(JSON.stringify({records:[{id:'remote'},{id:'local'}]}),{headers:{'content-type':'application/json'}});
  return new Response('{}',{headers:{'content-type':'application/json'}});
};
const client=createAccountClient({apiBase:'/api/account',fetchImpl,language:'fa'});
assert.equal((await getAccountSession({apiBase:'/api/account',fetchImpl})).email,'a@example.com');
const result=await synchronizeHistory({client,localRecords:[{id:'local'}]});
assert.deepEqual(result.records.map(item=>item.id),['remote','local']);
assert.equal(calls.at(-1).init.credentials,'same-origin');
assert.equal(JSON.parse(calls.at(-1).init.body).records[0].id,'local');
const noSession=await getAccountSession({fetchImpl:async()=>new Response(JSON.stringify({error:{code:'UNAUTHORIZED'}}),{status:401,headers:{'content-type':'application/json'}})});
assert.equal(noSession,null);
assert.equal(DEFAULT_ACCOUNT_TIMEOUT_MS,12000);
const timeoutClient=createAccountClient({timeoutMs:15,fetchImpl:()=>new Promise(()=>{})});
await assert.rejects(timeoutClient.me(),error=>error instanceof AccountApiError&&error.code==='TIMEOUT'&&error.status===0);
console.log('Account sync tests passed.');
