import assert from 'node:assert/strict';
import worker, { promptFor } from './worker/src/index.mjs';
import { isCompleteAiReading } from './ai-reading.mjs';
import { MAX_BODY_BYTES } from './functions/_shared/reading-proxy.mjs';

const sourceLines=[
  {label:'初六',text:'井泥不食，旧井无禽。'},
  {label:'九二',text:'井谷射鲋，瓮敝漏。'},
  {label:'九三',text:'井渫不食，为我心恻。可用汲，王明，并受其福。'},
  {label:'六四',text:'井甃，无咎。'},
  {label:'九五',text:'井冽，寒泉食。'},
  {label:'上六',text:'井收勿幕，有孚元吉。'},
];
const changingLines=[
  {label:'初九',text:'有厉，利已。'},
  {label:'九二',text:'舆说輹。'},
  {label:'九三',text:'良马逐，利艰贞。日闲舆卫，利有攸往。'},
  {label:'六四',text:'童牛之牿，元吉。'},
  {label:'六五',text:'豮豕之牙，吉。'},
  {label:'上九',text:'何天之衢，亨。'},
];
const hex=(name,upper,lower,theme,imageText,judgment,lines)=>({name,upper,lower,theme,imageText,judgment,lines});
const payload={
  version:1,
  language:'zh-CN',
  question:'属虎的人从2026年到2030年的事业运势如何？',
  originalIndex:47,
  changedIndex:26,
  original:hex('水风井','水','风','修德待用，资源不改其源','木上有水，井；君子以劳民劝相。','井，改邑不改井，无丧无得。往来井井，汔至亦未繘井，羸其瓶，凶。',sourceLines),
  changed:hex('山天大畜','山','天','蓄德积力，待时而行','天在山中，大畜；君子以多识前言往行，以畜其德。','大畜，利贞。不家食吉，利涉大川。',changingLines),
  moving:[2,3],
  movingLines:[sourceLines[2]&&{position:3,label:sourceLines[2].label,text:sourceLines[2].text},sourceLines[3]&&{position:4,label:sourceLines[3].label,text:sourceLines[3].text}],
  rule:{text:'三爻变，取本卦动爻为分析重点。',fromChanged:false,primary:[2,3]},
  primaryLines:[sourceLines[2],sourceLines[3]],
  tenWings:[
    {title:'《象传·井》',sectionNumber:48,hexagramRole:'primary',kind:'direct',excerpt:'木上有水，井；君子以劳民劝相。'},
    {title:'《彖传·井》',sectionNumber:48,hexagramRole:'primary',kind:'direct',excerpt:'井养而不穷也。'},
    {title:'《象传·大畜》',sectionNumber:26,hexagramRole:'relating',kind:'direct',excerpt:'天在山中，大畜；君子以多识前言往行，以畜其德。'},
  ],
  analysisPlan:{years:['2026','2027','2028','2029','2030'],originalLineLabels:sourceLines.map(line=>line.label),relatingLineLabels:changingLines.map(line=>line.label),movingLineLabels:['九三','六四'],sequence:['核心主线','本卦当前基础','动爻转折','变卦后续背景','逐年条件性落地']},
  localReading:{summary:'先修基础，再把积累转成机会。',situation:'当前重在修井与建立稳定输出。',turningPoint:'动爻提示主动让价值被看见，并继续筑基。',trend:'后续倾向由积累转向稳健突破。',actions:['梳理技能证据','主动寻找反馈','按阶段复盘'],cautions:['不要把卦象当作确定预测']},
};

const questionMarker='用户的问题（必须直接回答）：';
assert.ok(new TextEncoder().encode(JSON.stringify(payload)).byteLength<MAX_BODY_BYTES);
const prompt=promptFor(payload);
assert.ok(prompt[1].content.includes(questionMarker));
assert.ok(prompt[1].content.includes(payload.question));
assert.ok(prompt[1].content.includes('井渫不食，为我心恻'));
assert.ok(prompt[1].content.includes('何天之衢，亨'));

const answer=`【核心判断】
你问的是2026—2030年的事业走向。水风井 → 山天大畜的主线，不是突然爆发，而是先修复能力与位置，再把积累转成更大的行动空间。卦辞提示环境可以变化，但真正要守住的是持续供给价值的能力。

【当前处境】
本卦井的“改邑不改井”说明外部平台、岗位或行业可能变化，但核心能力需要持续维护。卦象“木上有水”，重点在于让资源真正可取用；“井渫不食”也提示，能力整理好了，还需要主动让合适的人看见。

【关键变化】
九三“井渫不食，为我心恻。可用汲，王明，并受其福”：如果你已经具备能力却缺少机会，问题更像曝光与匹配，而不是能力不存在。可把作品、成果和求职方向整理成别人能快速理解的证据。
六四“井甃，无咎”：事业基础需要继续修整，短期停顿可以用来补齐流程、技能和合作边界。
本卦转入大畜后，重点由“修井”转为“蓄力”。思考方向：未来每个机会，哪些条件已经具备，哪些仍需要验证？
思维调整：从等待一次性证明自己，转向持续建立可复用的成果与信任。

【后续趋势】
2026—2027年倾向先修基础、找准能被看见的输出方式；2028年需要在机会面前先评估风险；2029年若资源和技能已经备齐，可以承担更大项目；2030年重点是把成果制度化，避免因短期顺利而过度扩张。这是依据井的持续供给和大畜的蓄力逻辑作出的条件性分析，不是确定预测。

【行动建议】
1. 在30天内整理一份能证明能力的项目或作品清单，并请至少一位业内人士给出反馈。
2. 按季度复盘技能、资源和机会来源，记录哪些积累已经转化为实际面试、项目或职责。
3. 面对重大跳槽或创业选择，先写出资金、能力、合作和退出条件，再决定是否行动。`;
assert.equal(isCompleteAiReading(answer),true);

console.log('Virtual question:',payload.question);
console.log('Virtual hexagrams:',`${payload.original.name} -> ${payload.changed.name}`);
console.log('\n--- Mock AI response ---\n');
console.log(answer);
export { payload };
console.log('\nVirtual AI reading test passed.');
