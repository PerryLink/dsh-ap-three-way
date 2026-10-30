import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { Context } from '@deepseek-ai/cordis'
import { z } from 'zod'
const invoice=z.object({id:z.string(),supplier:z.string(),po_no:z.string(),line_no:z.string(),qty:z.number(),unit_price_cents:z.number().int(),amount_cents:z.number().int(),evidence_sha256:z.string()})
const po=z.object({po_no:z.string(),line_no:z.string(),qty:z.number(),unit_price_cents:z.number().int(),amount_cents:z.number().int()})
const grn=z.object({po_no:z.string(),line_no:z.string(),qty:z.number()})
const match=z.object({match_id:z.string(),invoice_id:z.string(),po_no:z.string(),line_no:z.string(),qty_delta:z.number(),price_delta_cents:z.number().int(),state:z.enum(['matched','exception']),reason:z.string(),created_at:z.string()})
export type InvoiceRecord=z.infer<typeof invoice>;export type PoRecord=z.infer<typeof po>;export type GrnRecord=z.infer<typeof grn>;export type MatchRecord=z.infer<typeof match>
export type Table<T>={get(k:string):T|undefined;entries():IterableIterator<[string,T]>;size:number;put(k:string,v:T):Promise<void>}
export const apSpec=defineDomain({name:'ap',version:1,tables:{invoices:domainTable<string,InvoiceRecord>(invoice),po:domainTable<string,PoRecord>(po),grn:domainTable<string,GrnRecord>(grn),matches:domainTable<string,MatchRecord>(match)}})
export async function openAp(ctx:Context){const d=await ctx.storageDomain.open(apSpec);ctx.effect(()=>()=>d.close(),'dsh-ap-three-way.domainClose');return{invoices:d.table('invoices') as Table<InvoiceRecord>,po:d.table('po') as Table<PoRecord>,grn:d.table('grn') as Table<GrnRecord>,matches:d.table('matches') as Table<MatchRecord>}}
