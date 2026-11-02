import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { parseInvoices } from '../lib/core/ap.js'
import { createTools } from '../lib/plugin/tools.js'

class T { map = new Map(); get(k) { return this.map.get(k) }; entries() { return this.map.entries() }; get size() { return this.map.size }; async put(k, v) { this.map.set(k, v) } }

const invoices = 'supplier,po_no,line_no,qty,unit_price,amount\nS1,PO1,1,10,100.00,1000.00\nS2,PO2,2,5,50.00,250.00'
const po = 'po_no,line_no,qty,unit_price,amount\nPO1,1,10,100.00,1000.00\nPO2,2,5,50.00,250.00'
const grn = 'po_no,line_no,qty\nPO1,1,10\nPO2,2,5'

async function setup(dir) {
  const tables = { invoices: new T(), po: new T(), grn: new T(), matches: new T() }
  const tools = createTools({ ...tables, baseDir: path.join(dir, 'store') })
  return { tables, by: Object.fromEntries(tools.map((tool) => [tool.name, tool])), exec: { callId: 'idem' } }
}

test('invoice ids are stable hashes, not row positions', () => {
  const first = parseInvoices(invoices, 'sha')
  const second = parseInvoices(invoices, 'sha')
  assert.deepEqual(first.map((line) => line.id), second.map((line) => line.id))
  for (const line of first) assert.match(line.id, /^inv-[0-9a-f]{16}$/)
  assert.notEqual(first[0].id, first[1].id)
})

test('re-importing the same invoice CSV is idempotent and reports skipped lines', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-ap-idem-'))
  try {
    const { tables, by, exec } = await setup(dir)
    const first = await by['ap.import'].execute({ invoices_csv: invoices, po_csv: po, grn_csv: grn }, exec)
    assert.equal(first.skipped, 0)
    assert.equal(tables.invoices.size, 2)
    const second = await by['ap.import'].execute({ invoices_csv: invoices, po_csv: po, grn_csv: grn }, exec)
    assert.equal(second.skipped, 2)
    assert.equal(tables.invoices.size, 2)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('different invoice lines no longer overwrite each other across imports', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-ap-idem-'))
  try {
    const { tables, by, exec } = await setup(dir)
    await by['ap.import'].execute({ invoices_csv: invoices, po_csv: po, grn_csv: grn }, exec)
    const other = 'supplier,po_no,line_no,qty,unit_price,amount\nS3,PO3,1,10,100.00,1000.00'
    await by['ap.import'].execute({ invoices_csv: other, po_csv: po, grn_csv: grn }, exec)
    assert.equal(tables.invoices.size, 3)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('XML invoice re-import is idempotent', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-ap-idem-'))
  try {
    const { tables, by, exec } = await setup(dir)
    const xml = readFileSync('fixtures/public/mit/invoice-github-sample.xml', 'utf8')
    const first = await by['ap.import_invoice_xml'].execute({ xml_text: xml }, exec)
    assert.equal(first.rows, 1)
    assert.equal(first.skipped, 0)
    const second = await by['ap.import_invoice_xml'].execute({ xml_text: xml }, exec)
    assert.equal(second.rows, 1)
    assert.equal(second.skipped, 1)
    assert.equal(tables.invoices.size, 1)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
