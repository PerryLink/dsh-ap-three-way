import test from 'node:test'
import assert from 'node:assert/strict'
import { duplicateInvoiceLines } from '../lib/core/ap.js'
import { createTools } from '../lib/plugin/tools.js'

class T { map = new Map(); get(k){return this.map.get(k)}; entries(){return this.map.entries()}; get size(){return this.map.size}; async put(k,v){this.map.set(k,v)} }
const tools = Object.fromEntries(createTools({ invoices: new T(), po: new T(), grn: new T(), matches: new T(), baseDir: '/tmp/ap-dup' }).map((t) => [t.name, t]))
const exec = { callId: 'dup' }
const csv = 'supplier,po_no,line_no,qty,unit_price,amount\nS1,PO1,1,10,100.00,1000.00\nS1,PO1,1,10,100.00,1000.00\nS1,PO1,2,5,50.00,250.00'

test('an exact repeated line is reported once with its occurrence count', async () => {
  const r = await tools['ap.duplicate_check'].execute({ invoices_csv: csv }, exec)
  assert.equal(r.lines, 3)
  assert.equal(r.duplicates.length, 1)
  assert.equal(r.duplicates[0].po_no, 'PO1')
  assert.equal(r.duplicates[0].line_no, '1')
  assert.equal(r.duplicates[0].occurrences, 2)
})

test('supplier comparison is case and space insensitive', () => {
  const lines = [
    { id: 'a', supplier: ' ACME ', po_no: 'P', line_no: '1', qty: 1, unit_price_cents: 100, amount_cents: 100, evidence_sha256: '' },
    { id: 'b', supplier: 'acme', po_no: 'P', line_no: '1', qty: 1, unit_price_cents: 100, amount_cents: 100, evidence_sha256: '' },
  ]
  const dups = duplicateInvoiceLines(lines)
  assert.equal(dups.length, 1)
  assert.equal(dups[0].occurrences, 2)
})

test('different amounts on the same PO line are not duplicates', async () => {
  const r = await tools['ap.duplicate_check'].execute({ invoices_csv: 'supplier,po_no,line_no,qty,unit_price,amount\nS1,PO2,1,10,100.00,1000.00\nS1,PO2,1,10,110.00,1100.00' }, exec)
  assert.deepEqual(r.duplicates, [])
})
