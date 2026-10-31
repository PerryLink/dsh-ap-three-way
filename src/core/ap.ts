export interface InvoiceLine { id:string; supplier:string; po_no:string; line_no:string; qty:number; unit_price_cents:number; amount_cents:number; evidence_sha256:string }
export interface PoLine { po_no:string; line_no:string; qty:number; unit_price_cents:number; amount_cents:number }
export interface GrnLine { po_no:string; line_no:string; qty:number }
export interface ApMatch { match_id:string; invoice_id:string; po_no:string; line_no:string; qty_delta:number; price_delta_cents:number; state:'matched'|'exception'; reason:string; created_at:string }
export type ApErrorCode='E_AP_CSV_INVALID'|'E_AP_MATCH_FAILED'|'E_AP_EXPORT_FAILED'
export class ApError extends Error { readonly code:ApErrorCode; constructor(code:ApErrorCode,message:string){super(`${code}: ${message}`);this.name='ApError';this.code=code} }
export function cents(raw:string):number{const v=raw.trim().replace(/[¥￥,\s]/g,'');const m=/^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(v);if(!m)throw new ApError('E_AP_CSV_INVALID',`bad amount ${raw}`);return (m[1]==='-'?-1:1)*(Number(m[2])*100+Number((m[3]??'').padEnd(2,'0')))}
function rows(text:string):string[][]{const l=text.trim().split(/\r?\n/).filter(Boolean);if(l.length<2)throw new ApError('E_AP_CSV_INVALID','CSV needs header+rows');return l.map(x=>x.split(',').map(y=>y.trim()))}
export function parseInvoices(text:string,sha:string):InvoiceLine[]{const r=rows(text);const h=r[0]!.map(x=>x.toLowerCase());const ix=(n:string)=>{const i=h.indexOf(n);if(i<0)throw new ApError('E_AP_CSV_INVALID',`missing ${n}`);return i};const si=ix('supplier'),pi=ix('po_no'),li=ix('line_no'),qi=ix('qty'),pi2=ix('unit_price'),ai=ix('amount');return r.slice(1).map((c,i)=>({id:`inv-${i}`,supplier:c[si]??'',po_no:c[pi]??'',line_no:c[li]??'',qty:Number(c[qi]),unit_price_cents:cents(c[pi2]??''),amount_cents:cents(c[ai]??''),evidence_sha256:sha}))}
export function parsePo(text:string):PoLine[]{const r=rows(text);const h=r[0]!.map(x=>x.toLowerCase());const ix=(n:string)=>h.indexOf(n);const pi=ix('po_no'),li=ix('line_no'),qi=ix('qty'),ui=ix('unit_price'),ai=ix('amount');return r.slice(1).map(c=>({po_no:c[pi]??'',line_no:c[li]??'',qty:Number(c[qi]),unit_price_cents:cents(c[ui]??''),amount_cents:cents(c[ai]??'')}))}
export function parseGrn(text:string):GrnLine[]{const r=rows(text);const h=r[0]!.map(x=>x.toLowerCase());const ix=(n:string)=>h.indexOf(n);const pi=ix('po_no'),li=ix('line_no'),qi=ix('qty');return r.slice(1).map(c=>({po_no:c[pi]??'',line_no:c[li]??'',qty:Number(c[qi])}))}
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
  return items.map((item: any, index: number) => ({
    id: `xml-${index}-${String(invoice.InvoiceNo ?? '')}`,
    supplier,
    po_no: poNo,
    line_no: String(index + 1),
    qty: Number(item.Quantity ?? 1),
    unit_price_cents: cents(String(item.UnitPrice ?? '0')),
    amount_cents: cents(String(item.Amount ?? '0')),
    evidence_sha256: '',
  }))
}
