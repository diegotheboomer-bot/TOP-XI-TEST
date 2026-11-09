// Cancelling a campaign refunds the unspent budget, never the platform fee.

export interface RefundableDeposit {
  /** Stripe PaymentIntent id. */
  id: string;
  /** Budget part of the deposit still refundable, in cents (budget minus earlier refunds). */
  refundableCents: number;
}

/**
 * Splits a refund across the campaign's deposits, newest first, never more
 * than each deposit's remaining budget. Deposits must be passed newest first.
 */
export function planRefunds(deposits: RefundableDeposit[], totalCents: number): { id: string; cents: number }[] {
  const plan: { id: string; cents: number }[] = [];
  let left = Math.max(0, Math.round(totalCents));
  for (const d of deposits) {
    if (left <= 0) break;
    const cents = Math.min(left, Math.max(0, d.refundableCents));
    if (cents > 0) {
      plan.push({ id: d.id, cents });
      left -= cents;
    }
  }
  return plan;
}
