import { normalizeHistoryRecords } from '../../storage.mjs';

export const MAX_BODY_BYTES=96*1024;
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCredentials(value){
  if(!value||typeof value!=='object')return {ok:false,code:'INVALID_REQUEST'};
  const email=typeof value.email==='string'?value.email.trim().toLowerCase():'';
  const password=typeof value.password==='string'?value.password:'';
  if(email.length<3||email.length>254||!emailPattern.test(email)||password.length<8||password.length>200)return {ok:false,code:'INVALID_CREDENTIALS'};
  return {ok:true,value:{email,password,language:['en','fa'].includes(value.language)?value.language:'zh-CN'}};
}

export function normalizeRecords(value){
  if(!value||typeof value!=='object'||!Array.isArray(value.records)||value.records.length>100)return {ok:false,code:'INVALID_REQUEST'};
  const records=normalizeHistoryRecords(value.records,100);
  if(records.length!==value.records.length)return {ok:false,code:'INVALID_RECORDS'};
  return {ok:true,value:records};
}

export function normalizeRecord(value){
  if(!value||typeof value!=='object')return {ok:false,code:'INVALID_RECORDS'};
  const records=normalizeHistoryRecords([value],1);
  return records.length===1?{ok:true,value:records[0]}:{ok:false,code:'INVALID_RECORDS'};
}

export async function readJson(request){
  const length=Number.parseInt(request.headers.get('content-length')||'0',10);
  if(Number.isFinite(length)&&length>MAX_BODY_BYTES)return {ok:false,code:'PAYLOAD_TOO_LARGE'};
  try{
    const body=await request.arrayBuffer();
    if(body.byteLength>MAX_BODY_BYTES)return {ok:false,code:'PAYLOAD_TOO_LARGE'};
    return {ok:true,value:JSON.parse(new TextDecoder().decode(body)||'{}')};
  }catch{return {ok:false,code:'INVALID_REQUEST'}}
}
