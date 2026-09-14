import assert from 'node:assert/strict';
import { readingRule } from './reading-rules.mjs';
import { buildLocalInterpretation, classifyQuestion } from './interpretation.mjs';

const original = ['屯','䷂','水雷屯','云雷屯，君子以经纶','元亨利贞，勿用有攸往','初生艰难，守正待时','水','雷'];
const changed = ['需','䷄','水天需','云上于天，需；君子以饮食宴乐','有孚，光亨，贞吉','守正以待，蓄势而进','水','天'];
const originalLines = Array.from({length:6},(_,index)=>({label:['初六','六二','六三','六四','九五','上六'][index],text:'本卦第'+(index+1)+'爻原文。'}));
const changedLines = Array.from({length:6},(_,index)=>({label:['初九','九二','九三','九四','九五','上九'][index],text:'变卦第'+(index+1)+'爻原文。'}));

function makeContext(count, originalIndex=2) {
  const moving=Array.from({length:count},(_,index)=>index);
  return {question:'未来三个月我该如何推进职业选择？',original,changed,moving,rule:readingRule(moving,originalIndex),originalLines,changedLines};
}

assert.equal(classifyQuestion('未来三个月我该如何推进职业选择？'),'career');
assert.equal(classifyQuestion('面对目前的合作关系，我应如何沟通？'),'relationship');
assert.equal(classifyQuestion('下个月考试复习应该注意什么？'),'study');
assert.equal(classifyQuestion('目前的资金安排应该注意什么？'),'finance');
assert.equal(classifyQuestion('最近睡眠和身体状态应该如何调整？'),'health');
assert.equal(classifyQuestion('这件事下一步最应注意什么？'),'general');
assert.equal(classifyQuestion('<img src=x onerror=alert(1)>'),'general');

for(let count=0;count<=6;count+=1){
  const result=buildLocalInterpretation(makeContext(count));
  assert.equal(result.category,'career');
  assert.ok(result.summary.length>10);
  assert.ok(result.situation.length>10);
  assert.ok(result.turningPoint.length>8);
  assert.ok(result.trend.length>8);
  assert.ok(result.actions.length>=2&&result.actions.length<=3);
  assert.ok(result.cautions.length>=1);
  assert.equal(result.evidence.originalName,'水雷屯');
  assert.equal(result.evidence.changedName,'水天需');
}

assert.match(buildLocalInterpretation(makeContext(0)).turningPoint,/相对稳定|六爻皆静/);
assert.deepEqual(buildLocalInterpretation(makeContext(1)).evidence.primaryLabels,['初六']);
assert.deepEqual(buildLocalInterpretation(makeContext(2)).evidence.primaryLabels,['初六','六二']);
assert.match(buildLocalInterpretation(makeContext(3)).turningPoint,/本卦.*变卦|两卦/);
assert.deepEqual(buildLocalInterpretation(makeContext(4)).evidence.primaryLabels,['九五','上九']);
assert.deepEqual(buildLocalInterpretation(makeContext(5)).evidence.primaryLabels,['上九']);
assert.match(buildLocalInterpretation(makeContext(6,0)).turningPoint,/用九|用六|六爻皆变/);

const same=buildLocalInterpretation({...makeContext(0),changed:original});
assert.match(same.trend,/现有条件|相对稳定/);

const hostile=buildLocalInterpretation({...makeContext(1),question:'我该如何处理 <img src=x onerror=alert(1)> 这件事？'});
assert.ok(hostile.summary.includes('<img'));
assert.equal(hostile.summary.includes('&lt;'),false);

console.log('Local interpretation tests passed.');
