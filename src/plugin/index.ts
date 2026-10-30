import path from 'node:path'; import type { Context } from '@deepseek-ai/cordis'; import { createTools } from './tools.js'; import { openAp } from './storage.js'
export const name='dsh-ap-three-way'; export const inject=['tools','storageDomain']
export async function apply(ctx:Context):Promise<void>{const baseDir=process.env.DSH_AP_HOME??path.join(process.env.DSH_HOME??process.cwd(),'storages','dsh-ap-three-way');const{invoices,po,grn,matches}=await openAp(ctx);for(const t of createTools({invoices,po,grn,matches,baseDir}))ctx.tools.register(t)}
