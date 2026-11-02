#!/usr/bin/env node
/**
 * Quickstart runner for the shipped synthetic sample.
 *
 *   node samples/quickstart/run.mjs          # human-readable transcript (screenshot source)
 *   node samples/quickstart/run.mjs --json   # canonical result used as the gold file
 *
 * Everything runs locally against `samples/quickstart/input/`; nothing is uploaded and no
 * customer data is involved. The export is written to a temporary directory that is removed
 * afterwards, so the sample never writes into the checkout.
 */
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTools } from '../../lib/plugin/tools.js'
import { readWorkbook } from '../../lib/core/xlsx-lite.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const readInput = (name) => readFileSync(path.join(root, 'samples', 'quickstart', 'input', name), 'utf8')
const sha = (value) => createHash('sha256').update(value).digest('hex')

class MemoryTable {
  map = new Map()
  get(key) { return this.map.get(key) }
  entries() { return this.map.entries() }
  async put(key, value) { this.map.set(key, value) }
}

async function run() {
  const invoicesCsv = readInput('invoices.csv')
  const poCsv = readInput('po.csv')
  const grnCsv = readInput('grn.csv')
  const duplicateCsv = readInput('invoices-duplicate.csv')
  const invoiceXml = readInput('invoice-sample.xml')

  const baseDir = await mkdtemp(path.join(os.tmpdir(), 'dsh-ap-quickstart-'))
  try {
    const tables = { invoices: new MemoryTable(), po: new MemoryTable(), grn: new MemoryTable(), matches: new MemoryTable(), baseDir }
    const tools = Object.fromEntries(createTools(tables).map((tool) => [tool.name, tool]))
    const call = (name, args) => tools[name].execute(args, { callId: 'quickstart' })

    const imported = await call('ap.import', {
      invoices_csv: invoicesCsv,
      po_csv: poCsv,
      grn_csv: grnCsv,
    })
    const match = await call('ap.match', {})
    const exported = await call('ap.export', {})
    const workbook = readWorkbook(await readFile(exported.path))
    const tolerance = await call('ap.tolerance_match', {
      invoices_csv: invoicesCsv,
      po_csv: poCsv,
      grn_csv: grnCsv,
      price_bps: 1200,
    })
    const duplicates = await call('ap.duplicate_check', { invoices_csv: duplicateCsv })
    const xml = await call('ap.import_invoice_xml', { xml_text: invoiceXml, po_no: 'PO-9001' })

    const exceptions = [...tables.matches.entries()]
      .map(([, record]) => record)
      .filter((record) => record.state === 'exception')
      .map((record) => ({
        po_no: record.po_no,
        line_no: record.line_no,
        reason: record.reason,
        qty_delta: record.qty_delta,
        price_delta_cents: record.price_delta_cents,
      }))
      .sort((a, b) => `${a.po_no}|${a.line_no}`.localeCompare(`${b.po_no}|${b.line_no}`))

    const toleranceExceptions = tolerance.results
      .filter((record) => record.state === 'exception')
      .map((record) => ({ po_no: record.po_no, line_no: record.line_no, reason: record.reason }))
      .sort((a, b) => `${a.po_no}|${a.line_no}`.localeCompare(`${b.po_no}|${b.line_no}`))

    const summary = {
      package: 'dsh-ap-three-way',
      sample: 'synthetic/quickstart',
      imported: { invoices: imported.invoices, po: imported.po, grn: imported.grn, skipped: imported.skipped },
      match: { matched: match.matched, exceptions: match.exceptions, exception_detail: exceptions },
      tolerance: {
        price_bps: 1200,
        matched: tolerance.matched,
        exceptions: tolerance.exceptions,
        exception_detail: toleranceExceptions,
      },
      duplicates: {
        lines: duplicates.lines,
        duplicates: duplicates.duplicates.map((item) => ({
          supplier: item.supplier,
          po_no: item.po_no,
          line_no: item.line_no,
          occurrences: item.occurrences,
        })),
      },
      xml: { rows: xml.rows, supplier: xml.supplier },
      workpaper: {
        sheets: workbook.sheets.map((sheet) => sheet.name),
        rows: workbook.sheets.map((sheet) => sheet.rows.length),
      },
      input_sha256: {
        'invoices.csv': sha(invoicesCsv),
        'po.csv': sha(poCsv),
        'grn.csv': sha(grnCsv),
        'invoices-duplicate.csv': sha(duplicateCsv),
        'invoice-sample.xml': sha(invoiceXml),
      },
    }

    if (process.argv.includes('--json')) {
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
      return
    }

    const lines = [
      'dsh-ap-three-way quickstart - synthetic sample, not customer data',
      `[1/5] import invoice/PO/GRN CSV .... inv=${imported.invoices} po=${imported.po} grn=${imported.grn}`,
      `[2/5] three-way match (1% price) ... matched=${match.matched} exceptions=${match.exceptions}`,
      `[3/5] export workpaper ............ ${workbook.sheets.map((sheet) => sheet.name).join('/')} rows=${workbook.sheets.map((sheet) => sheet.rows.length).join('/')}`,
      `[4/5] tolerance match (12%) ....... matched=${tolerance.matched} exceptions=${tolerance.exceptions}`,
      `[5/5] duplicate lines / XML import  ${duplicates.duplicates.length} duplicate / ${xml.rows} XML row`,
      `result: matched=${match.matched} exceptions=${match.exceptions} tolerance_matched=${tolerance.matched}`,
      `exceptions: ${exceptions.map((item) => `${item.po_no}#${item.line_no}:${item.reason}`).join(', ') || 'none'}`,
      'quickstart ok',
    ]
    process.stdout.write(`${lines.join('\n')}\n`)
  } finally {
    await rm(baseDir, { recursive: true, force: true })
  }
}

await run()
