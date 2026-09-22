import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const output=path.resolve(root,'dist');
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw new Error('Refusing to clean an unexpected output path.');

const files=[
  'index.html','auth.html','styles.css','auth.css','landing-v2.css','landing-rich.css','landing-details.css',
  'app.js','auth.js','i18n.mjs','hexagram-i18n.mjs','hexagram-catalog.mjs','daily-hexagram.mjs','yarrow-core.mjs',
  'reading-rules.mjs','interpretation.mjs','ai-reading.mjs','ai-sources.mjs','derived-hexagrams.mjs',
  'liuyao-core.mjs','liuyao-rules.mjs','sexagenary.mjs',
  'study-storage.mjs','storage.mjs','account-sync.mjs','html-safety.mjs','service-worker-update.mjs',
  'ten-wings.json','hexagram-texts.json','principles.json','principles-en.json','relations.json',
  'manifest.webmanifest','app-icon.svg','service-worker.js'
];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await Promise.all(files.map(file=>cp(path.join(root,file),path.join(output,file))));
await cp(path.join(root,'vendor'),path.join(output,'vendor'),{recursive:true});
console.log(`Built ${files.length} production files in ${output}`);
