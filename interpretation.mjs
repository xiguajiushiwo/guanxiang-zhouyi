const CATEGORY_RULES=[
  ['relationship',['关系','感情','伴侣','婚姻','家人','朋友','沟通','相处']],
  ['career',['工作','职业','事业','面试','岗位','项目','合作','创业']],
  ['study',['学习','考试','学业','课程','研究','论文','升学']],
  ['finance',['财务','收入','支出','投资','资金','金钱','预算']],
  ['health',['健康','身体','治疗','康复','睡眠','就医']]
];
const STAGES=['事情尚在起点，宜先辨明条件再行动','事情进入内部协作阶段，可观察支持是否真实','事情来到内外转换的门槛，需要留意用力过度','事情开始进入外部环境，宜试探并及时校正','事情处在承担与统合的位置，应兼顾原则和影响','事情接近阶段上限，需要留意盛极而转'];
const LENSES={
  career:{focus:'目标、资源和推进节奏',actions:['把近期目标收束为一个可验证的里程碑','先核实关键资源与合作条件，再扩大投入','为下一阶段预留调整空间'],caution:'需要留意只看结果而忽略时机与职责边界。'},
  relationship:{focus:'彼此立场、沟通方式和边界',actions:['先确认双方真正关切的事项','选择一次具体沟通，说明事实与边界','观察对方后续行动是否与表达一致'],caution:'需要留意把卦象当成对他人内心的确定判断。'},
  study:{focus:'基础、方法和持续投入',actions:['把当前难点拆成一次可完成的练习','检查方法是否与目标和时间匹配','以阶段结果校正计划'],caution:'需要留意追求捷径而跳过基础验证。'},
  finance:{focus:'现金流、风险边界和信息质量',actions:['先列清可承受损失与不可动用的资源','对关键数字和条件做独立核实','信息不足时保留余地'],caution:'卦象不能替代财务事实、合同审查或专业意见。'},
  health:{focus:'身体信号、生活节律和专业判断',actions:['记录近期身体变化与触发条件','优先采取低风险且可持续的调整','持续或严重症状应及时就医'],caution:'卦象不能用于诊断、停药或替代医疗建议。'},
  general:{focus:'事实、时机和可控行动',actions:['区分确认的事实与自己的推测','选择一个风险可控的小步骤验证判断','设定复盘时间并根据变化调整'],caution:'需要留意把条件性的提示理解成必然结果。'}
};
export function classifyQuestion(question){const text=String(question||'').trim();return CATEGORY_RULES.find(([,words])=>words.some(word=>text.includes(word)))?.[0]||'general'}
function selectedLines(context){const source=context.rule?.fromChanged?context.changedLines:context.originalLines;return (context.rule?.primary||[]).map(index=>source?.[index]).filter(Boolean)}
function lineReference(line,index){if(!line)return STAGES[index]||'此处需要结合实际条件观察';return (line.label||'所取爻位')+'：“'+String(line.text||'').trim()+'” '+(STAGES[index]||'')}
function turningPointFor(context,primaryLines){
  const count=context.moving.length;
  if(count===0)return '六爻皆静，提示当前结构相对稳定；重点在理解本卦整体，并观察现有条件是否真正改变。';
  if(count===1)return '本次变化集中在'+lineReference(primaryLines[0],context.rule.primary[0])+'。可把这里视为眼下最值得核实的转折点。';
  if(count===2)return '两处变化需要合看：'+primaryLines.map((line,i)=>lineReference(line,context.rule.primary[i])).join('；')+'。依本次取法，较高爻位的提醒权重更大。';
  if(count===3)return '三爻皆动，变量较多。可先以本卦判断当前处境，再用变卦检视可能形成的新结构。';
  if(count===4)return '四爻变时，观察变卦中仍保持不变的两爻：'+primaryLines.map(line=>lineReference(line,context.changedLines.indexOf(line))).join('；')+'。它们提示变化中仍需守住的条件。';
  if(count===5)return '五爻变时，以变卦唯一不变之爻为锚点：'+lineReference(primaryLines[0],context.changedLines.indexOf(primaryLines[0]))+'。';
  return (context.rule?.text||'六爻皆变。')+' 这提示局面处在整体转换中，应同时检查起点、方向与可承担的风险。';
}
export function buildLocalInterpretation(context){
  if(!context||!Array.isArray(context.original)||!Array.isArray(context.changed)||!Array.isArray(context.moving))throw new TypeError('Invalid interpretation context');
  const category=classifyQuestion(context.question),lens=LENSES[category],primaryLines=selectedLines(context);
  const question=String(context.question||'此次所问').trim().slice(0,100),originalName=context.original[2]||'本卦',changedName=context.changed[2]||'之卦',same=originalName===changedName;
  const summary='就“'+question+'”而言，'+originalName+'提示先从“'+(context.original[5]||'审时察势')+'”把握当前局面，重点观察'+lens.focus+'。';
  const situation=(context.original[3]||context.original[5]||'先观其象，再察其时位')+'。这更适合作为审视当前处境的角度，而不是对结果的确定断言。';
  const trend=same?'本卦与之卦相同，提示主要结构暂未改变；可考虑先在现有条件中修正做法，再等待新的事实出现。':'若动爻所示条件继续发展，局面倾向由'+originalName+'转向'+changedName+'所强调的“'+(context.changed[5]||'因时调整')+'”。这一方向仍取决于现实中的选择与条件。';
  return {category,summary,situation,turningPoint:turningPointFor(context,primaryLines),trend,actions:[...lens.actions],cautions:[lens.caution,'解读用于经典研读与自我反思，不替代现实调查和专业判断。'],evidence:{primaryLabels:primaryLines.map(line=>line.label||'所取爻位'),originalName,changedName,ruleText:context.rule?.text||'',lineSource:context.rule?.fromChanged?'changed':'original'}};
}
