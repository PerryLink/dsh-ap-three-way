import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createTools } from '../lib/plugin/tools.js'

class T { map = new Map(); get(k){return this.map.get(k)}; entries(){return this.map.entries()}; get size(){return this.map.size}; async put(k,v){this.map.set(k,v)} }

test('public MIT invoice XML import', async () => {
  const xml = readFileSync('fixtures/public/mit/invoice-github-sample.xml', 'utf8')
  const tools = createTools({ invoices: new T(), po: new T(), grn: new T(), matches: new T(), baseDir: '/tmp/ap-public' })
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
  const result = await byName['ap_import_invoice_xml'].execute({ xml_text: xml, po_no: 'PO-PUBLIC' }, { callId: 'xml' })
  assert.equal(result.rows, 1)
  assert.match(result.supplier, /云杉/)
})
