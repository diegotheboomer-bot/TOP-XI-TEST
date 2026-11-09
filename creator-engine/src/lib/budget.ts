// Budget health for a campaign, shown to brands and to creators before they post.

export interface BudgetInput {
  /** Total deposited into escrow. */
  deposited: number;
  /** Current escrow balance (deposits minus everything already paid out). */
  escrow: number;
  /** Earned by creators but not yet paid (flagged submissions excluded). */
  owed: number;
  createdAt: string;
  now?: number;
}

export interface BudgetStats {
  deposited: number;
  /** Paid out plus owed. */
  committed: number;
  /** Escrow not yet committed to anyone. */
  available: number;
  /** 0–1 share of the deposit that is committed. */
  usedShare: number;
  /** Days until `available` hits zero at the average pace so far; null when there is no pace yet. */
  daysLeft: number | null;
}

const DAY = 86_400_000;

export function budgetStats({ deposited, escrow, owed, createdAt, now = Date.now() }: BudgetInput): BudgetStats {
  const paid = Math.max(0, deposited - escrow);
  const committed = paid + owed;
  const available = Math.max(0, escrow - owed);
  const days = Math.max(1, (now - new Date(createdAt).getTime()) / DAY);
  const perDay = committed / days;
  return {
    deposited,
    committed,
    available,
    usedShare: deposited > 0 ? Math.min(1, committed / deposited) : 0,
    daysLeft: perDay > 0 ? Math.floor(available / perDay) : null,
  };
}
