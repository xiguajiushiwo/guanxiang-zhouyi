const SOURCE_LIMIT=8;
const EXCERPT_LIMIT=600;

function relevanceScore(reference,primaryLines){
  const excerpt=String(reference?.excerpt||'');
  let score=reference?.kind==='direct'?30:0;
  if(/彖传|彖傳/.test(reference?.wingTitle||''))score+=12;
  if(/象传|象傳/.test(reference?.wingTitle||''))score+=10;
  for(const line of primaryLines||[]){
    if(line?.label&&excerpt.includes(line.label))score+=100;
    const phrase=String(line?.text||'').replace(/[，。；：“”「」『』、\s]/g,'').slice(0,6);
    if(phrase.length>=3&&excerpt.replace(/[，。；：“”「」『』、\s]/g,'').includes(phrase))score+=80;
  }
  return score;
}

function sourcesFor(relations,index,hexagramRole,primaryLines){
  const references=relations?.hexagrams?.[String(index+1)]?.references;
  if(!Array.isArray(references))return [];
  return references
    .map((reference,order)=>({reference,order,score:relevanceScore(reference,primaryLines)}))
    .sort((left,right)=>right.score-left.score||left.order-right.order)
    .map(({reference})=>({
      title:String(reference.wingTitle||'').slice(0,40),
      sectionNumber:Number(reference.sectionNumber)||1,
      hexagramRole,
      kind:reference.kind==='direct'?'direct':'mention',
      excerpt:String(reference.excerpt||'').trim().slice(0,EXCERPT_LIMIT),
    }))
    .filter(source=>source.title&&source.excerpt);
}

export function selectTenWingSources({relations,originalIndex,changedIndex,fromChanged=false,primaryLines=[]}={}){
  if(!relations?.hexagrams||!Number.isInteger(originalIndex)||!Number.isInteger(changedIndex))return [];
  const primary=sourcesFor(relations,originalIndex,'primary',fromChanged?[]:primaryLines);
  if(originalIndex===changedIndex)return primary.slice(0,SOURCE_LIMIT);
  const relating=sourcesFor(relations,changedIndex,'relating',fromChanged?primaryLines:[]);
  const ordered=fromChanged?[relating,primary]:[primary,relating];
  const selected=[];
  for(const group of ordered){
    const allowance=selected.length===0?6:SOURCE_LIMIT-selected.length;
    selected.push(...group.slice(0,allowance));
    if(selected.length>=SOURCE_LIMIT)break;
  }
  return selected;
}

export const AI_SOURCE_LIMITS=Object.freeze({sources:SOURCE_LIMIT,excerpt:EXCERPT_LIMIT});
