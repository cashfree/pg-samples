// Refresh the checked-in bank directory from Cashfree's published reference.
// Usage: node scripts/update-enach-banks.js [local-markdown-file]
import { readFile, writeFile } from 'node:fs/promises';
const source='https://www.cashfree.com/docs/payments/subscription/payment-modes#bank-account-e-mandate';
let markdown;
if(process.argv[2]) markdown=await readFile(process.argv[2],'utf8');
else {
  const response=await fetch('https://www.cashfree.com/docs/payments/subscription/payment-modes.md',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`Bank directory download failed: ${response.status}`);
  markdown=await response.text();
}
const banks=[];
for(const line of markdown.split('\n')){
  const cells=line.replace(/^>\s?/,'').trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());
  if(cells.length===4 && /^[A-Z0-9]{4}$/.test(cells[1]) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(cells[2]) && ['MATCH','MISMATCH'].includes(cells[3])) banks.push({id:cells[1],name:cells[0]});
}
if(banks.length<100 || new Set(banks.map(b=>b.id)).size!==banks.length)throw new Error('Bank table was missing, incomplete or contains duplicate IDs. Existing directory was not changed.');
banks.sort((a,b)=>a.name.localeCompare(b.name));
const directory={source,updatedAt:new Date().toISOString().slice(0,10),banks};
await writeFile(new URL('../lib/enach-banks.json',import.meta.url),JSON.stringify(directory,null,2)+'\n');
console.log(`Saved ${banks.length} bank names and Bank IDs. IFSC examples were deliberately not copied into the form.`);
