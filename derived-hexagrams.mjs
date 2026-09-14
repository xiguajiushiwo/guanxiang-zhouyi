import hexagrams from './hexagram-catalog.mjs';

const trigramBits = {'天':'111','泽':'110','火':'101','雷':'100','风':'011','水':'010','山':'001','地':'000'};
function normalizeBits(lines){if(!Array.isArray(lines)||lines.length!==6)return null;const bits=lines.map(line=>{const value=typeof line==='object'?line?.value:line;if(value===0||value===1)return value;if([7,9].includes(value))return 1;if([6,8].includes(value))return 0;return null});return bits.every(bit=>bit!==null)?bits:null}
function findIndex(bits){const lower=bits.slice(0,3).join(''),upper=bits.slice(3,6).join(''),lowerName=Object.entries(trigramBits).find(([,value])=>value===lower)?.[0],upperName=Object.entries(trigramBits).find(([,value])=>value===upper)?.[0];if(!lowerName||!upperName)return -1;return hexagrams.findIndex(hexagram=>hexagram[6]===upperName&&hexagram[7]===lowerName)}
export function hexagramRelations(lines){const bits=normalizeBits(lines);if(!bits)return {mutual:-1,opposite:-1,inverse:-1};return {mutual:findIndex([bits[1],bits[2],bits[3],bits[2],bits[3],bits[4]]),opposite:findIndex(bits.map(bit=>bit?0:1)),inverse:findIndex([...bits].reverse())}}
export function catalogLines(index){const hexagram=hexagrams[index];if(!hexagram)return null;const upper=trigramBits[hexagram[6]],lower=trigramBits[hexagram[7]];return [...lower,...upper].map(Number)}
