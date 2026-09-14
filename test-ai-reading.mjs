import assert from 'node:assert/strict';
import { AiReadingError, requestAiReading, splitAiReadingSections } from './ai-reading.mjs';

function chunkedResponse(text,cuts){
  const bytes=new TextEncoder().encode(text);
  return new Response(new ReadableStream({start(controller){let start=0;for(const end of cuts){controller.enqueue(bytes.slice(start,end));start=end}controller.enqueue(bytes.slice(start));controller.close()}}),{status:200,headers:{'content-type':'text/plain; charset=utf-8'}});
}

const expected='【核心判断】\n宜先观察。\n【当前处境】\n条件仍在形成。\n【行动建议】\n先核实条件。';
const seen=[];
const streamed=await requestAiReading({endpoint:'https://worker.example/reading',payload:{version:1},onChunk:chunk=>seen.push(chunk),fetchImpl:async()=>chunkedResponse(expected,[5,17,31])});
assert.equal(streamed,expected);
assert.ok(seen.filter(Boolean).length>=2);
const sections=splitAiReadingSections(streamed);
assert.equal(sections[0].id,'summary');
assert.equal(sections.at(-1).id,'actions');
assert.equal(sections.at(-1).text,'先核实条件。');

await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>new Response(JSON.stringify({error:{code:'RATE_LIMITED',message:'too many'}}),{status:429,headers:{'content-type':'application/json'}})}),error=>error instanceof AiReadingError&&error.code==='RATE_LIMITED'&&/频繁/.test(error.message));
await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>new Response('',{status:200})}),error=>error.code==='MODEL_UNAVAILABLE');

const partial='【核心判断】\n已经收到。';
const interrupted=new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(partial));setTimeout(()=>controller.error(new Error('socket closed')),0)}}),{status:200});
await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>interrupted}),error=>error.code==='STREAM_INTERRUPTED'&&error.partialText===partial);

assert.deepEqual(splitAiReadingSections('没有标题的解读'),[{id:'summary',title:'核心判断',text:'没有标题的解读'}]);
console.log('AI reading stream tests passed.');
