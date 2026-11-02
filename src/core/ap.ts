import { createHash } from 'node:crypto'
export interface InvoiceLine { id:string; supplier:string; po_no:string; line_no:string; qty:number; unit_price_cents:number; amount_cents:number; evidence_sha256:string }
export interface PoLine { po_no:string; line_no:string; qty:number; unit_price_cents:number; amount_cents:number }
export interface GrnLine { po_no:string; line_no:string; qty:number }
export interface ApMatch { match_id:string; invoice_id:string; po_no:string; line_no:string; qty_delta:number; price_delta_cents:number; state:'matched'|'exception'; reason:string; created_at:string }
export type ApErrorCode='E_AP_CSV_INVALID'|'E_AP_MATCH_FAILED'|'E_AP_EXPORT_FAILED'|'E_AP_PATH_INVALID'|'E_AP_PATH_NOT_ALLOWED'
export class ApError extends Error { readonly code:ApErrorCode; constructor(code:ApErrorCode,message:string,next?:string){super(next?`${message}（${code}）｜下一步：${next}`:`${message}（${code}）`);this.name='ApError';this.code=code} }
export function cents(raw:string):number{const v=raw.trim().replace(/[¥￥,\s]/g,'');const m=/^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(v);if(!m)throw new ApError('E_AP_CSV_INVALID',`金额“${raw}”读不懂`,'把金额改成 1234.56 这样的纯数字，最多两位小数');return (m[1]==='-'?-1:1)*(Number(m[2])*100+Number((m[3]??'').padEnd(2,'0')))}
/**
 * Stable invoice-line primary key: `inv-` + the first 16 hex of
 * sha256(supplier|invoice_no|line_no|qty|unit_price|amount).
 * Re-importing the same file yields the same ids, so rows are skipped instead of
 * silently overwritten; different lines/amounts no longer collide across imports.
 */
export function invoiceLineId(line:{supplier:string;invoice_no:string;line_no:string;qty:number;unit_price_cents:number;amount_cents:number}):string{
  const digest=createHash('sha256').update([line.supplier,line.invoice_no,line.line_no,line.qty,line.unit_price_cents,line.amount_cents].join('|')).digest('hex')
  return `inv-${digest.slice(0,16)}`
}
function rows(text:string):string[][]{const l=text.trim().split(/\r?\n/).filter(Boolean);if(l.length<2)throw new ApError('E_AP_CSV_INVALID','CSV needs header+rows');return l.map(x=>x.split(',').map(y=>y.trim()))}
export function parseInvoices(text:string,sha:string):InvoiceLine[]{
  const r=rows(text);const h=r[0]!.map(x=>x.toLowerCase());
  const ix=(n:string)=>{const i=h.indexOf(n);if(i<0)throw new ApError('E_AP_CSV_INVALID',`CSV 缺少 ${n} 列`,'按 README 的列名补齐第一行表头后重跑');return i};
  const si=ix('supplier'),pi=ix('po_no'),li=ix('line_no'),qi=ix('qty'),pi2=ix('unit_price'),ai=ix('amount');
  // invoice_no is optional; when the CSV has no such column the PO number identifies the document.
  const ni=h.indexOf('invoice_no');
  return r.slice(1).map((c)=>{const supplier=c[si]??'';const po_no=c[pi]??'';const line_no=c[li]??'';const qty=Number(c[qi]);const unit_price_cents=cents(c[pi2]??'');const amount_cents=cents(c[ai]??'');const invoice_no=ni>=0?(c[ni]??''):po_no;return{id:invoiceLineId({supplier,invoice_no,line_no,qty,unit_price_cents,amount_cents}),supplier,po_no,line_no,qty,unit_price_cents,amount_cents,evidence_sha256:sha}})
}
export function parsePo(text:string):PoLine[]{
  const r=rows(text);const h=r[0]!.map(x=>x.toLowerCase());
  const ix=(n:string)=>{const i=h.indexOf(n);if(i<0)throw new ApError('E_AP_CSV_INVALID',`CSV 缺少 ${n} 列`,'按 README 的列名补齐第一行表头后重跑');return i};
  const pi=ix('po_no'),li=ix('line_no'),qi=ix('qty'),ui=ix('unit_price'),ai=ix('amount');
  return r.slice(1).map(c=>({po_no:c[pi]??'',line_no:c[li]??'',qty:Number(c[qi]),unit_price_cents:cents(c[ui]??''),amount_cents:cents(c[ai]??'')}))
}
export function parseGrn(text:string):GrnLine[]{
  const r=rows(text);const h=r[0]!.map(x=>x.toLowerCase());
  const ix=(n:string)=>{const i=h.indexOf(n);if(i<0)throw new ApError('E_AP_CSV_INVALID',`CSV 缺少 ${n} 列`,'按 README 的列名补齐第一行表头后重跑');return i};
  const pi=ix('po_no'),li=ix('line_no'),qi=ix('qty');
  return r.slice(1).map(c=>({po_no:c[pi]??'',line_no:c[li]??'',qty:Number(c[qi])}))
}
export function matchLine(inv:InvoiceLine,po:PoLine|undefined,grn:GrnLine|undefined):{state:'matched'|'exception';reason:string;qty_delta:number;price_delta_cents:number}{if(!po)return{state:'exception',reason:'po_missing',qty_delta:0,price_delta_cents:0};if(!grn)return{state:'exception',reason:'grn_missing',qty_delta:0,price_delta_cents:inv.unit_price_cents-po.unit_price_cents};const qtyDelta=inv.qty-grn.qty;const priceDelta=inv.unit_price_cents-po.unit_price_cents;const tolerance=Math.max(1,Math.round(po.unit_price_cents*0.01));if(qtyDelta>0)return{state:'exception',reason:'qty_over_grn',qty_delta:qtyDelta,price_delta_cents:priceDelta};if(Math.abs(priceDelta)>tolerance)return{state:'exception',reason:'price_tolerance',qty_delta:qtyDelta,price_delta_cents:priceDelta};return{state:'matched',reason:'ok',qty_delta:qtyDelta,price_delta_cents:priceDelta}}

import { XMLParser } from 'fast-xml-parser'
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false, trimValues: true, processEntities: false })
export function parseInvoiceXml(text: string, poNo = ''): InvoiceLine[] {
  const root = xmlParser.parse(text) as any
  const invoice = root?.Invoice
  if (!invoice) throw new ApError('E_AP_CSV_INVALID', 'XML has no Invoice root')
  const supplier = String(invoice.Seller?.Name ?? '').trim()
  if (!supplier) throw new ApError('E_AP_CSV_INVALID', 'XML invoice has no Seller/Name')
  const items = Array.isArray(invoice.Items?.Item) ? invoice.Items.Item : invoice.Items?.Item ? [invoice.Items.Item] : []
  if (items.length === 0) throw new ApError('E_AP_CSV_INVALID', 'XML invoice has no Items/Item')
  const invoiceNo = String(invoice.InvoiceNo ?? '').trim()
  return items.map((item: any, index: number) => {
    const line_no = String(index + 1)
    const qty = Number(item.Quantity ?? 1)
    const unit_price_cents = cents(String(item.UnitPrice ?? '0'))
    const amount_cents = cents(String(item.Amount ?? '0'))
    return {
      id: invoiceLineId({ supplier, invoice_no: invoiceNo, line_no, qty, unit_price_cents, amount_cents }),
      supplier,
      po_no: poNo,
      line_no,
      qty,
      unit_price_cents,
      amount_cents,
      evidence_sha256: '',
    }
  })
}

export interface DuplicateInvoiceLine { line: InvoiceLine; occurrences: number }
/** Duplicate detection over imported invoice lines: the same supplier, PO line, quantity and amount twice. */
export function duplicateInvoiceLines(lines: InvoiceLine[]): DuplicateInvoiceLine[] {
  const buckets = new Map<string, InvoiceLine[]>()
  for (const line of lines) {
    const key = [line.supplier.trim().toLowerCase(), line.po_no, line.line_no, line.qty, line.unit_price_cents, line.amount_cents].join('|')
    const bucket = buckets.get(key) ?? []
    bucket.push(line)
    buckets.set(key, bucket)
  }
  return [...buckets.values()].filter((b) => b.length > 1).map((b) => ({ line: b[0]!, occurrences: b.length }))
}
