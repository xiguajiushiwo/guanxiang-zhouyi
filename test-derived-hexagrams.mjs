import assert from 'node:assert/strict';
import hexagrams from './hexagram-catalog.mjs';
import { catalogLines, hexagramRelations } from './derived-hexagrams.mjs';
const indexByName=name=>hexagrams.findIndex(hexagram=>hexagram[2]===name);
assert.deepEqual(hexagramRelations([1,1,1,1,1,1]),{mutual:indexByName('乾为天'),opposite:indexByName('坤为地'),inverse:indexByName('乾为天')});
assert.equal(hexagramRelations(catalogLines(indexByName('水雷屯'))).inverse,indexByName('山水蒙'));
assert.equal(hexagramRelations([1,2,1,0,1,0]).mutual,-1);
assert.equal(catalogLines(indexByName('火水未济')).length,6);
console.log('Derived hexagram relations passed.');
