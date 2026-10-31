import {createHash} from 'node:crypto'; import {mkdtemp,readFile,rm} from 'node:fs/promises'; import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import * as XLSX from 'xlsx'; import {createTools} from '../lib/plugin/tools.js'
class T{map=new Map();get(k){return this.map.get(k)};entries(){return this.map.entries()};get size(){return this.map.size};async put(k,v){this.map.set(k,v)}}
const inv=['supplier,po_no,line_no,qty,unit_price,amount'],po=['po_no,line_no,qty,unit_price,amount'],grn=['po_no,line_no,qty'];for(let i=1;i<=20;i++){const good=i<=16;inv.push(`S,PO${i},1,10,${good?100:110}.00,${good?1000:1100}.00`);po.push(`PO${i},1,10,100.00,1000.00`);grn.push(`PO${i},1,10`)}
const d=await mkdtemp(path.join(os.tmpdir(),'ap-acc-')),root=process.cwd(),run=`sku05-${Date.now()}`,ev=path.join(root,'evidence',run);mkdirSync(ev,{recursive:true});let rows=0,m=0,x=0,sheets=0
try{const ts=createTools({invoices:new T(),po:new T(),grn:new T(),matches:new T(),baseDir:path.join(d,'s')});const b=Object.fromEntries(ts.map(t=>[t.name,t]));const e={callId:'a'};rows=(await b['ap.import'].execute({invoices_csv:inv.join('\n'),po_csv:po.join('\n'),grn_csv:grn.join('\n')},e)).invoices;const r=await b['ap.match'].execute({},e);m=r.matched;x=r.exceptions;const ex=await b['ap.export'].execute({},e);sheets=XLSX.read(await readFile(ex.path),{type:'buffer'}).SheetNames.length}finally{await rm(d,{recursive:true,force:true})}
const xmlTools=createTools({invoices:new T(),po:new T(),grn:new T(),matches:new T(),baseDir:'/tmp/ap-xml'});const xmlRows=await xmlTools.find(t=>t.name==='ap.import_invoice_xml').execute({xml_text:readFileSync('fixtures/public/mit/invoice-github-sample.xml','utf8'),po_no:'PO-XML'},{callId:'a'});const ms=[{i:'SKU-05-A01',m:'发票行解析',t:'20/20',a:rows,p:rows===20},{i:'SKU-05-A02',m:'1:1 三单匹配',t:'16/20',a:m,p:m===16},{i:'SKU-05-A03',m:'异常',t:'4',a:x,p:x===4},{i:'SKU-05-A04',m:'底稿 sheet',t:'2',a:sheets,p:sheets===2},{i:'SKU-05-A05',m:'XML 发票导入',t:'1',a:xmlRows.rows,p:xmlRows.rows===1}];const r={run_id:run,scope:'SKU-05-S1',status:'partial',counted:false,note:'synthetic; user-approved public/synthetic; 0 real firms',metrics:ms,pass:ms.every(g=>g.p)};const t=JSON.stringify(r,null,2)+'\n';writeFileSync(path.join(ev,'result.json'),t);const h=createHash('sha256').update(t).digest('hex');writeFileSync(path.join(root,'ACCEPTANCE.csv'),'req_id,metric,threshold,actual,script,evidence_sha256,pass\n'+ms.map(g=>`${g.i},${g.m},${g.t},${g.a},scripts/acceptance.mjs,${h},${g.p}`).join('\n')+'\n');if(!r.pass)process.exit(1);console.log('acceptance ok',run)


// Normalize the public-only acceptance schema: source + counted=false.
{
  const fs = await import('node:fs')
  const file = 'ACCEPTANCE.csv'
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
  if (!lines[0].includes('source,counted')) {
    lines[0] += ',source,counted'
    for (let i = 1; i < lines.length; i += 1) lines[i] += ',public/synthetic,false'
    fs.writeFileSync(file, lines.join('\n') + '\n')
  }
}
