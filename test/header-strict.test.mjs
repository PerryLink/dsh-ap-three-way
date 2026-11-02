import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGrn, parseInvoices, parsePo } from '../lib/core/ap.js'

test('a missing invoice header column is an error, not an empty id', () => {
  assert.throws(() => parseInvoices('supplier,po_no,line_no,qty,unit_price\nS,PO1,1,10,100.00', 'sha'), /E_AP_CSV_INVALID/)
  assert.throws(() => parseInvoices('S,PO1,1,10,100.00,1000.00\nS,PO2,1,10,100.00,1000.00', 'sha'), /E_AP_CSV_INVALID/)
})

test('a missing PO header column is an error, not empty po_no/line_no values', () => {
  assert.throws(() => parsePo('po_no,line_no,qty,amount\nPO1,1,10,1000.00'), /E_AP_CSV_INVALID/)
  assert.throws(() => parsePo('PO1,1,10,100.00,1000.00\nPO2,1,10,100.00,1000.00'), /E_AP_CSV_INVALID/)
})

test('a missing GRN header column is an error', () => {
  assert.throws(() => parseGrn('po_no,line_no\nPO1,1'), /E_AP_CSV_INVALID/)
  assert.throws(() => parseGrn('PO1,1,10\nPO2,1,10'), /E_AP_CSV_INVALID/)
})
