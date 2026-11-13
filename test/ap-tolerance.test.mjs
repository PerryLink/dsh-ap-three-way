import test from 'node:test'
import assert from 'node:assert/strict'
import { createTools } from '../lib/plugin/tools.js'

const po = 'po_no,line_no,qty,unit_price,amount\nPO1,1,10,100.00,1000.00'
const grn = 'po_no,line_no,qty\nPO1,1,10'
const tools = Object.fromEntries(createTools({ invoices: { get(){}, entries(){ return [] }, put(){} }, po: { get(){}, entries(){ return [] }, put(){} }, grn: { get(){}, entries(){ return [] }, put(){} }, matches: { get(){}, entries(){ return [] }, put(){} }, baseDir: '/tmp' }).map((t) => [t.name, t]))
const run = (inv, extra = {}) => tools['ap_tolerance_match'].execute({ invoices_csv: `supplier,po_no,line_no,qty,unit_price,amount\n${inv}`, po_csv: po, grn_csv: grn, ...extra }, { callId: 'tol' })

test('default policy keeps the 1% unit-price tolerance and zero quantity slack', async () => {
  const ok = await run('S,PO1,1,10,100.50,1005.00')
  assert.equal(ok.results[0].state, 'matched')
  assert.equal(ok.results[0].price_delta_cents, 50)
  const price = await run('S,PO1,1,10,102.00,1020.00')
  assert.equal(price.results[0].reason, 'price_tolerance')
  const qty = await run('S,PO1,1,11,100.00,1100.00')
  assert.equal(qty.results[0].reason, 'qty_over_grn')
})

test('quantity tolerance accepts a bounded over-receipt', async () => {
  const ok = await run('S,PO1,1,12,100.00,1200.00', { qty_bps: 2000 })
  assert.equal(ok.results[0].state, 'matched')
  const bad = await run('S,PO1,1,13,100.00,1300.00', { qty_bps: 2000 })
  assert.equal(bad.results[0].reason, 'qty_tolerance')
  assert.equal(bad.results[0].qty_delta, 3)
})

test('amount tolerance is opt-in and reports its own reason', async () => {
  const ok = await run('S,PO1,1,10,100.00,1005.00', { amount_bps: 100 })
  assert.equal(ok.results[0].state, 'matched')
  const bad = await run('S,PO1,1,10,100.00,1015.00', { amount_bps: 100 })
  assert.equal(bad.results[0].reason, 'amount_tolerance')
  assert.equal(bad.results[0].amount_delta_cents, 1500)
})

test('missing GRN is an exception and invalid policy is rejected', async () => {
  const noGrn = await tools['ap_tolerance_match'].execute({ invoices_csv: 'supplier,po_no,line_no,qty,unit_price,amount\nS,PO1,1,10,100.00,1000.00', po_csv: po, grn_csv: 'po_no,line_no,qty' }, { callId: 'tol' })
  assert.equal(noGrn.results[0].reason, 'grn_missing')
  await assert.rejects(() => run('S,PO1,1,10,100.00,1000.00', { price_bps: 20000 }), /E_AP_POLICY/)
})
