import assert from 'node:assert/strict';
import { AI_ERROR_MESSAGES_EN, AiReadingError, isCompleteAiReading, requestAiReading, splitAiReadingSections, splitAiReadingSectionsLocalized } from './ai-reading.mjs';

function chunkedResponse(text,cuts){
  const bytes=new TextEncoder().encode(text);
  return new Response(new ReadableStream({start(controller){let start=0;for(const end of cuts){controller.enqueue(bytes.slice(start,end));start=end}controller.enqueue(bytes.slice(start));controller.close()}}),{status:200,headers:{'content-type':'text/plain; charset=utf-8'}});
}

const expected='【核心判断】\n宜先观察。\n【当前处境】\n条件仍在形成。\n【关键变化】\n先核实转折条件。\n思考方向：哪些条件已经具备？\n思维调整：从追求立刻定论转向验证条件。\n【后续趋势】\n后续倾向逐步展开。\n【行动建议】\n1. 核实事实\n2. 小步验证\n3. 按期复盘';
const seen=[];
const streamed=await requestAiReading({endpoint:'https://worker.example/reading',payload:{version:1},onChunk:chunk=>seen.push(chunk),fetchImpl:async()=>chunkedResponse(expected,[5,17,31])});
assert.equal(streamed,expected);
assert.ok(seen.filter(Boolean).length>=2);
const sections=splitAiReadingSections(streamed);
assert.equal(sections[0].id,'summary');
assert.equal(sections.at(-1).id,'actions');
assert.equal(sections.at(-1).text,'1. 核实事实\n2. 小步验证\n3. 按期复盘');
assert.equal(isCompleteAiReading(expected),true);
assert.equal(isCompleteAiReading(expected,'zh-CN',{movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026']}}),false);
const evidenceComplete=expected.replace('先核实转折条件。','九三：“井渫不食”。先核实转折条件。').replace('后续倾向逐步展开。','2026年：后续倾向逐步展开。');
assert.equal(isCompleteAiReading(evidenceComplete,'zh-CN',{movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026']}}),true);
assert.equal(isCompleteAiReading(evidenceComplete.replace('2026年：','2026 年\n'),'zh-CN',{movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026']}}),true);
assert.equal(isCompleteAiReading(evidenceComplete.replace('2026年：','2026—2027年：'),'zh-CN',{movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026','2027']}}),false);
const citedPayload={original:{lines:[{label:'初六',text:'井泥不食，旧井无禽。'},{label:'九三',text:'井渫不食'}]},changed:{lines:[]},movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026']}};
assert.equal(isCompleteAiReading(evidenceComplete.replace('2026年：','2026 年\n'),'zh-CN',citedPayload),true);
assert.equal(isCompleteAiReading(evidenceComplete.replace('2026年：','2026 年\n').replace('1. 核实事实','1. 上六“井泥不食，旧井无禽。”说明先核实事实'),'zh-CN',citedPayload),false);
assert.equal(isCompleteAiReading(evidenceComplete.replace('九三：“井渫不食”。先核实转折条件。','九三：“井渫不食”。此爻虽未动，仍可先核实转折条件。'),'zh-CN',citedPayload),false);
assert.equal(isCompleteAiReading(evidenceComplete,'zh-CN',{movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026'],detailTarget:'long'}}),false);
const detailedEvidence=evidenceComplete.replace('条件仍在形成。','条件仍在形成。'.repeat(400));
assert.equal(isCompleteAiReading(detailedEvidence,'zh-CN',{movingLines:[{label:'九三',text:'井渫不食'}],analysisPlan:{years:['2026'],detailTarget:'long'}}),true);
assert.equal(isCompleteAiReading(expected.replace('思维调整：','思考方向：重复。\n思维调整：')),false);
assert.equal(isCompleteAiReading(expected+'\n4. 额外行动'),false);
assert.equal(isCompleteAiReading(expected.replace('【关键变化】\n先核实转折条件。\n','')),false);
assert.equal(isCompleteAiReading(expected.replace('【当前处境】\n条件仍在形成。','【当前处境】\n')),false);
assert.equal(isCompleteAiReading(expected.replace('【后续趋势】','【核心判断】')),false);
assert.equal(isCompleteAiReading(expected.replace('3. 按期复盘','')),false);
assert.equal(isCompleteAiReading(expected.replace('思考方向：哪些条件已经具备？\n','')),false);
assert.equal(isCompleteAiReading(expected.replace('思维调整：从追求立刻定论转向验证条件。\n','')),false);

const boldChinese=expected.replaceAll('【','**').replaceAll('】','**');
assert.equal(isCompleteAiReading(boldChinese),true);
assert.deepEqual(splitAiReadingSections(boldChinese).map(section=>section.title),['核心判断','当前处境','关键变化','后续趋势','行动建议']);

const english='[Core judgment]\nWait for clearer evidence.\n[Present situation]\nConditions are still forming.\n[Key change]\nThinking direction: Which assumptions can be tested now?\nMindset adjustment: Move from seeking certainty to testing conditions.\n[Developing trend]\nProgress is likely to unfold gradually.\n[Suggested actions]\n1. Verify the facts\n2. Run a small test\n3. Review on schedule';
assert.equal(isCompleteAiReading(english,'en'),true);
assert.equal(isCompleteAiReading(english.replace('Thinking direction: Which assumptions can be tested now?\n',''),'en'),false);
assert.equal(isCompleteAiReading(english.replace('Mindset adjustment: Move from seeking certainty to testing conditions.\n',''),'en'),false);
const boldEnglish=english.replace(/^\[([^\]]+)\]$/gm,'**$1**');
assert.equal(isCompleteAiReading(boldEnglish,'en'),true);
assert.deepEqual(splitAiReadingSectionsLocalized(boldEnglish,'en').map(section=>section.title),['Core judgment','Present situation','Key change','Developing trend','Suggested actions']);

await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>new Response(JSON.stringify({error:{code:'RATE_LIMITED',message:'too many'}}),{status:429,headers:{'content-type':'application/json'}})}),error=>error instanceof AiReadingError&&error.code==='RATE_LIMITED'&&/频繁/.test(error.message));
await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>new Response('',{status:200})}),error=>error.code==='MODEL_UNAVAILABLE');
assert.match(new AiReadingError('RATE_LIMITED','','','en').message,/Too many requests/);
assert.match(AI_ERROR_MESSAGES_EN.INCOMPLETE_RESPONSE,/incomplete/i);
await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{language:'en'},fetchImpl:async()=>new Response(JSON.stringify({error:{code:'RATE_LIMITED',message:'too many'}}),{status:429,headers:{'content-type':'application/json'}})}),error=>error instanceof AiReadingError&&error.code==='RATE_LIMITED'&&/Too many requests/.test(error.message));

const partial='【核心判断】\n已经收到。';
const interrupted=new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(partial));setTimeout(()=>controller.error(new Error('socket closed')),0)}}),{status:200});
await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>interrupted}),error=>error.code==='STREAM_INTERRUPTED'&&error.partialText===partial);
await assert.rejects(()=>requestAiReading({endpoint:'x',payload:{},fetchImpl:async()=>chunkedResponse(partial,[partial.length])}),error=>error.code==='INCOMPLETE_RESPONSE'&&error.partialText===partial);

assert.deepEqual(splitAiReadingSections('没有标题的解读'),[{id:'summary',title:'核心判断',text:'没有标题的解读'}]);
console.log('AI reading stream tests passed.');
