// Scoped publication guard; never print matching secret values.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const prefix='sub-sample/node/express/';
const files=execFileSync('git',['ls-files','-z','--',prefix],{encoding:'utf8'}).split('\0').filter(Boolean);
const problems=[];
for(const path of files){
  if(/(?:^|\/)(?:node_modules|data|logs|test-results|playwright-report|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:pem|key|jsonl|zip|png|jpe?g|webp|pdf)$/i.test(path)&&!path.endsWith('/.env.example'))problems.push(`${path}: prohibited runtime/private artifact`);
  let text;try{text=readFileSync(path,'utf8');}catch{continue;}
  if(/cfsk_[a-z0-9_]{16,}|TEST[a-f0-9]{32,}|https:\/\/[\w-]+\.ngrok(?:-free)?\.(?:app|dev|io)/i.test(text))problems.push(`${path}: possible credential or private tunnel URL`);
  if(path.endsWith('/.env.example'))for(const line of text.split('\n'))if(/^(?:CASHFREE_.*(?:ID|SECRET)|MERCHANT_PASSWORD)=.+/.test(line))problems.push(`${path}: credential/password template must be empty`);
}
if(problems.length){console.error(problems.join('\n'));process.exit(1);}
console.log(`Publication guard passed for ${files.length} tracked subscription files.`);
