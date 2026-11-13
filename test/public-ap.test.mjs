import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createTools } from '../lib/plugin/tools.js'

class T {
  map = new Map()
  get(key) { return this.map.get(key) }
  entries() { return this.map.entries() }
  get size() { return this.map.size }
  async put(key, value) { this.map.set(key, value) }
}

function csvRows(text) {
  const [head, ...lines] = text.trim().split('\n')
  const keys = head.split(',')
  return lines.map((line) => {
    const cells = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((value) => value.replace(/^"|"$/g, '').trim()) ?? []
    return Object.fromEntries(keys.map((key, index) => [key, cells[index] ?? '']))
  })
}

test('public MIT synthetic invoice scenarios: clean vs structural exceptions', async () => {
  const rows = csvRows(readFileSync('fixtures/public/mit/invoice-scenarios-starter.csv', 'utf8'))
  const byId = Object.fromEntries(rows.map((row) => [row.scenario_id, row]))
  for (const [scenario, expected] of [['INV-S01', 1], ['INV-S02', 0], ['INV-S03', 0], ['INV-S04', 0]]) {
    const row = byId[scenario]
    assert.ok(row, scenario)
    const amount = Number(row.invoice_total)
    const invoiceCsv = `supplier,po_no,line_no,qty,unit_price,amount\n${row.vendor_id},${row.po_number},1,1,${amount},${amount}`
    const hasPo = /^PO-/.test(row.po_number ?? '')
    const poCsv = hasPo ? `po_no,line_no,qty,unit_price,amount\n${row.po_number},1,1,${scenario === 'INV-S02' ? Math.round(amount * 1.05) : amount},${scenario === 'INV-S02' ? Math.round(amount * 1.05) : amount}` : 'po_no,line_no,qty,unit_price,amount\nPO-NONE,1,1,1,1'
    const grnCsv = hasPo ? `po_no,line_no,qty\n${row.po_number},1,${scenario === 'INV-S03' ? 0 : 1}` : 'po_no,line_no,qty\nPO-NONE,1,1'
    const tools = createTools({ invoices: new T(), po: new T(), grn: new T(), matches: new T(), baseDir: '/tmp/ap-public' })
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
    await byName['ap_import'].execute({ invoices_csv: invoiceCsv, po_csv: poCsv, grn_csv: grnCsv }, { callId: scenario })
    const result = await byName['ap_match'].execute({}, { callId: scenario })
    assert.equal(result.matched, expected, scenario)
  }
})
