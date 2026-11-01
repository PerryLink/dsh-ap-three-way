/**
 * Configurable three-way-match tolerances.
 * Clean-room implementation of the tolerance model used in accounts-payable matching:
 * a price tolerance in basis points of the PO unit price, a quantity tolerance in basis
 * points of the received quantity, and an amount tolerance in basis points of the PO amount.
 */
import type { GrnLine, InvoiceLine, PoLine } from './ap.js'

export interface TolerancePolicy {
  price_bps: number
  qty_bps: number
  amount_bps: number
  min_price_cents: number
}

export const DEFAULT_TOLERANCE: TolerancePolicy = { price_bps: 100, qty_bps: 0, amount_bps: 0, min_price_cents: 1 }

export type ToleranceReason =
  | 'ok'
  | 'po_missing'
  | 'grn_missing'
  | 'qty_over_grn'
  | 'qty_tolerance'
  | 'price_tolerance'
  | 'amount_tolerance'

export interface ToleranceResult {
  state: 'matched' | 'exception'
  reason: ToleranceReason
  qty_delta: number
  price_delta_cents: number
  amount_delta_cents: number
  limits: { price_cents: number; qty: number; amount_cents: number }
}

const bpsOf = (value: number, bps: number): number => Math.floor((Math.max(0, value) * bps) / 10000)

export function validatePolicy(policy: TolerancePolicy): void {
  for (const key of ['price_bps', 'qty_bps', 'amount_bps'] as const) {
    const value = policy[key]
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new Error(`E_AP_POLICY: ${key} must be an integer between 0 and 10000`)
    }
  }
  if (!Number.isInteger(policy.min_price_cents) || policy.min_price_cents < 0) {
    throw new Error('E_AP_POLICY: min_price_cents must be a non-negative integer')
  }
}

export function matchWithTolerance(
  inv: InvoiceLine,
  po: PoLine | undefined,
  grn: GrnLine | undefined,
  policy: TolerancePolicy = DEFAULT_TOLERANCE,
): ToleranceResult {
  validatePolicy(policy)
  const priceDelta = po ? inv.unit_price_cents - po.unit_price_cents : 0
  const amountDelta = po ? inv.amount_cents - po.amount_cents : 0
  const limits = {
    price_cents: po ? Math.max(policy.min_price_cents, bpsOf(po.unit_price_cents, policy.price_bps)) : 0,
    qty: grn ? bpsOf(grn.qty, policy.qty_bps) : 0,
    amount_cents: po ? Math.max(policy.min_price_cents, bpsOf(po.amount_cents, policy.amount_bps)) : 0,
  }
  if (!po) return { state: 'exception', reason: 'po_missing', qty_delta: 0, price_delta_cents: 0, amount_delta_cents: 0, limits }
  if (!grn) return { state: 'exception', reason: 'grn_missing', qty_delta: 0, price_delta_cents: priceDelta, amount_delta_cents: amountDelta, limits }
  const qtyDelta = inv.qty - grn.qty
  if (qtyDelta > limits.qty) {
    return {
      state: 'exception',
      reason: limits.qty === 0 ? 'qty_over_grn' : 'qty_tolerance',
      qty_delta: qtyDelta,
      price_delta_cents: priceDelta,
      amount_delta_cents: amountDelta,
      limits,
    }
  }
  if (Math.abs(priceDelta) > limits.price_cents) {
    return { state: 'exception', reason: 'price_tolerance', qty_delta: qtyDelta, price_delta_cents: priceDelta, amount_delta_cents: amountDelta, limits }
  }
  if (policy.amount_bps > 0 && Math.abs(amountDelta) > limits.amount_cents) {
    return { state: 'exception', reason: 'amount_tolerance', qty_delta: qtyDelta, price_delta_cents: priceDelta, amount_delta_cents: amountDelta, limits }
  }
  return { state: 'matched', reason: 'ok', qty_delta: qtyDelta, price_delta_cents: priceDelta, amount_delta_cents: amountDelta, limits }
}
