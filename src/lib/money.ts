/**
 * Money utilities — all internal values are integers in cents.
 * Display functions convert to formatted USD strings.
 */

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((cents || 0) / 100);
}

export function formatCentsRaw(cents: number): string {
  const abs = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, '0')}`;
}

export function parseMoney(input: string): number {
  const parsed = parseFloat(input.replace(/[^0-9.-]+/g, ''));
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function parseDollarInput(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '').trim();
  if (!cleaned || isNaN(Number(cleaned))) return null;
  const num = parseFloat(cleaned);
  if (num < 0) return null;
  return dollarsToCents(num);
}

export function splitEqual(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base));
}

export function splitByPercentage(totalCents: number, percentages: number[]): number[] {
  const rawAmounts = percentages.map((p) => Math.floor((totalCents * p) / 100));
  const allocated = rawAmounts.reduce((a, b) => a + b, 0);
  const remainder = totalCents - allocated;
  if (rawAmounts.length > 0) {
    rawAmounts[0] += remainder;
  }
  return rawAmounts;
}

export function validateCustomSplit(totalCents: number, amounts: number[]): number {
  const sum = amounts.reduce((a, b) => a + b, 0);
  return totalCents - sum;
}

/**
 * Allocate line-item amounts to members. Each item is split equally among
 * its assignees; leftover cents are distributed one-by-one in assignee order.
 */
export function splitByLineItems(
  items: { amount: number; assignedTo: string[] }[],
  memberIds: string[]
): { userId: string; amount: number }[] {
  const totals = new Map<string, number>(memberIds.map((id) => [id, 0]));

  for (const item of items) {
    const assignees = (item.assignedTo || []).filter((id) => totals.has(id));
    if (assignees.length === 0 || item.amount <= 0) continue;

    const base = Math.floor(item.amount / assignees.length);
    let remainder = item.amount - base * assignees.length;

    for (const id of assignees) {
      let share = base;
      if (remainder > 0) {
        share += 1;
        remainder -= 1;
      }
      totals.set(id, (totals.get(id) || 0) + share);
    }
  }

  return memberIds.map((userId) => ({ userId, amount: totals.get(userId) || 0 }));
}
