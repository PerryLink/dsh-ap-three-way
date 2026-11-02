import {createHash} from 'node:crypto'; import {mkdtemp,readFile,rm} from 'node:fs/promises'; import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { strFromU8, unzipSync } from 'fflate'; import {createTools} from '../lib/plugin/tools.js'
class T{map=new Map();get(k){return this.map.get(k)};entries(){return this.map.entries()};get size(){return this.map.size};async put(k,v){this.map.set(k,v)}}
function decodeXml(value){return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g,(entity)=>entity==='&amp;'?'&':entity==='&lt;'?'<':entity==='&gt;'?'>':entity==='&quot;'?'"':entity==='&apos;'?"'":String.fromCodePoint(entity.startsWith('&#x')?parseInt(entity.slice(3,-1),16):parseInt(entity.slice(2,-1),10)))}
// Unzip the xlsx in-memory and inspect the worksheet XML directly (no spreadsheet library).
function readSheets(buffer){
 const zip=unzipSync(buffer); const workbook=strFromU8(zip['xl/workbook.xml']); const rels=strFromU8(zip['xl/_rels/workbook.xml.rels'])
 const paths=new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map((hit)=>{const tag=hit[0];const target=/\bTarget="([^"]*)"/.exec(tag)[1];return [/\bId="([^"]*)"/.exec(tag)[1],target.startsWith('/')?target.slice(1):`xl/${target}`]}))
 return [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((hit)=>{const tag=hit[0];const name=decodeXml(/\bname="([^"]*)"/.exec(tag)[1]);const xml=strFromU8(zip[paths.get(/\br:id="([^"]*)"/.exec(tag)[1])]);return {name,rows:(xml.match(/<row\b/g)||[]).length,values:[...xml.matchAll(/<(?:v|t)(?:\s[^>]*)?>([\s\S]*?)<\/(?:v|t)>/g)].map((cell)=>decodeXml(cell[1]))}})
}
const inv=['supplier,po_no,line_no,qty,unit_price,amount'],po=['po_no,line_no,qty,unit_price,amount'],grn=['po_no,line_no,qty'];for(let i=1;i<=20;i++){const good=i<=16;inv.push(`S,PO${i},1,10,${good?100:110}.00,${good?1000:1100}.00`);po.push(`PO${i},1,10,100.00,1000.00`);grn.push(`PO${i},1,10`)}
const d=await mkdtemp(path.join(os.tmpdir(),'ap-acc-')),root=process.cwd(),run=`sku05-${Date.now()}`,ev=path.join(root,'evidence',run);mkdirSync(ev,{recursive:true});let rows=0,m=0,x=0,sheets=0,workpaperOk=false,tolMatched=0,dupCount=0
try{const ts=createTools({invoices:new T(),po:new T(),grn:new T(),matches:new T(),baseDir:path.join(d,'s')});const b=Object.fromEntries(ts.map(t=>[t.name,t]));const e={callId:'a'};rows=(await b['ap.import'].execute({invoices_csv:inv.join('\n'),po_csv:po.join('\n'),grn_csv:grn.join('\n')},e)).invoices;const r=await b['ap.match'].execute({},e);m=r.matched;x=r.exceptions;const ex=await b['ap.export'].execute({},e);const workpaper=readSheets(await readFile(ex.path));sheets=workpaper.length;workpaperOk=workpaper.length===2&&workpaper[0].name==='Matches'&&workpaper[0].rows===17&&workpaper[1].name==='Exceptions'&&workpaper[1].rows===5&&workpaper[0].values.includes('match_id')&&workpaper[1].values.includes('reason');const tol=await b['ap.tolerance_match'].execute({invoices_csv:inv.join('\n'),po_csv:po.join('\n'),grn_csv:grn.join('\n'),price_bps:1000},e);tolMatched=tol.matched;dupCount=(await b['ap.duplicate_check'].execute({invoices_csv:inv.join('\n')},e)).duplicates.length}finally{await rm(d,{recursive:true,force:true})}
const xmlTools=createTools({invoices:new T(),po:new T(),grn:new T(),matches:new T(),baseDir:'/tmp/ap-xml'});const xmlRows=await xmlTools.find(t=>t.name==='ap.import_invoice_xml').execute({xml_text:readFileSync('fixtures/public/mit/invoice-github-sample.xml','utf8'),po_no:'PO-XML'},{callId:'a'});const ms=[{i:'SKU-05-A01',m:'发票行解析',t:'20/20',a:rows,p:rows===20},{i:'SKU-05-A02',m:'1:1 三单匹配',t:'16/20',a:m,p:m===16},{i:'SKU-05-A03',m:'异常',t:'4',a:x,p:x===4},{i:'SKU-05-A04',m:'底稿 sheet',t:'2',a:sheets,p:sheets===2&&workpaperOk},{i:'SKU-05-A05',m:'XML 发票导入',t:'1',a:xmlRows.rows,p:xmlRows.rows===1},{i:'SKU-05-A06',m:'可配置容差匹配(10%)',t:'20/20',a:tolMatched,p:tolMatched===20},{i:'SKU-05-A07',m:'重复发票行检测',t:'0',a:dupCount,p:dupCount===0}];const r={run_id:run,scope:'SKU-05-S1',status:'partial',counted:false,note:'synthetic; user-approved public/synthetic; 0 real firms',metrics:ms,pass:ms.every(g=>g.p)};const t=JSON.stringify(r,null,2)+'\n';writeFileSync(path.join(ev,'result.json'),t);const h=createHash('sha256').update(t).digest('hex');writeFileSync(path.join(root,'ACCEPTANCE.csv'),'req_id,metric,threshold,actual,script,evidence_sha256,pass\n'+ms.map(g=>`${g.i},${g.m},${g.t},${g.a},scripts/acceptance.mjs,${h},${g.p}`).join('\n')+'\n');if(!r.pass)process.exit(1);console.log('acceptance ok',run)


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
