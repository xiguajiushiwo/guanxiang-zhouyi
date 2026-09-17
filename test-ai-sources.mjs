import assert from 'node:assert/strict';
import { selectTenWingSources } from './ai-sources.mjs';

const relations={hexagrams:{
  '1':{references:[
    {wingId:'wen-yan',wingTitle:'《文言传》',sectionIndex:9,sectionNumber:10,kind:'direct',excerpt:'九五曰「飞龙在天，利见大人」，何谓也？'},
    {wingId:'tuan-shang',wingTitle:'《彖传上》',sectionIndex:0,sectionNumber:1,kind:'direct',excerpt:'大哉乾元，万物资始。'},
    {wingId:'xiang-shang',wingTitle:'《象传上》',sectionIndex:0,sectionNumber:1,kind:'direct',excerpt:'天行健，君子以自强不息。'},
    {wingId:'za-gua',wingTitle:'《杂卦传》',sectionIndex:0,sectionNumber:1,kind:'mention',excerpt:'乾刚坤柔。'},
  ]},
  '2':{references:[
    {wingId:'tuan-shang',wingTitle:'《彖传上》',sectionIndex:1,sectionNumber:2,kind:'direct',excerpt:'至哉坤元，万物资生。'},
  ]},
}};

const sources=selectTenWingSources({relations,originalIndex:0,changedIndex:1,fromChanged:false,primaryLines:[{label:'九五',text:'飞龙在天，利见大人。'}]});
assert.equal(sources.length,5);
assert.equal(sources[0].title,'《文言传》');
assert.equal(sources[0].hexagramRole,'primary');
assert.equal(sources.at(-1).hexagramRole,'relating');
assert.ok(sources.every(source=>source.excerpt.length<=600));

const changedFirst=selectTenWingSources({relations,originalIndex:0,changedIndex:1,fromChanged:true,primaryLines:[]});
assert.equal(changedFirst[0].hexagramRole,'relating');
assert.deepEqual(selectTenWingSources({relations:null,originalIndex:0,changedIndex:1,primaryLines:[]}),[]);
console.log('AI Ten Wings source selection tests passed.');
