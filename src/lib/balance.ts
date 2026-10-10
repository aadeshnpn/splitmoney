import type { Expense, ExpenseSplit, Settlement, User, Balance } from '@/types';

/**
 * Calculates net pairwise balances based on expenses, splits, and settlements.
 */
export function calculateBalances(
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[]
): Balance[] {
  // netBalances[userId] maps to their net position (positive = owed money, negative = owes money)
  // Or more accurately: user A owes user B -> pairwise[A][B]
  const pairwise: Record<string, Record<string, number>> = {};

  const addDebt = (fromId: string, toId: string, amount: number) => {
    if (fromId === toId || amount === 0) return;
    if (!pairwise[fromId]) pairwise[fromId] = {};
    if (!pairwise[toId]) pairwise[toId] = {};
    
    // Add debt from -> to
    pairwise[fromId][toId] = (pairwise[fromId][toId] || 0) + amount;
    // Offset opposite debt
    pairwise[toId][fromId] = (pairwise[toId][fromId] || 0) - amount;
  };

  // 1. Process Expenses & Splits
  for (const expense of expenses) {
    if (expense.isDeleted) continue;
    
    const expenseSplits = splits.filter((s) => s.expenseId === expense.id);
    const paidBy = expense.paidBy;

    for (const split of expenseSplits) {
      if (split.userId !== paidBy) {
        // Person owes the payer for their share
        addDebt(split.userId, paidBy, split.amount);
      }
    }
  }

  // 2. Process Settlements
  for (const settlement of settlements) {
    if (settlement.isDeleted) continue;
    // If A settled B, B effectively owes A the settlement amount to offset previous debt
    addDebt(settlement.toUser, settlement.fromUser, settlement.amount);
  }

  // 3. Condense to positive balances
  const balances: Balance[] = [];
  for (const fromId in pairwise) {
    for (const toId in pairwise[fromId]) {
      const amount = pairwise[fromId][toId];
      if (amount > 0) {
        balances.push({
          fromUserId: fromId,
          toUserId: toId,
          amount,
        });
      }
    }
  }

  return balances;
}

/**
 * Simplifies a network of debts using a greedy algorithm.
 * Returns the minimal set of transfers required to settle everyone.
 */
export function simplifyDebts(balances: Balance[]): Balance[] {
  const netBalances: Record<string, number> = {};

  // Compute net balance per user
  for (const balance of balances) {
    netBalances[balance.fromUserId] = (netBalances[balance.fromUserId] || 0) - balance.amount;
    netBalances[balance.toUserId] = (netBalances[balance.toUserId] || 0) + balance.amount;
  }

  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(netBalances)) {
    if (amount < 0) {
      debtors.push({ userId, amount: Math.abs(amount) });
    } else if (amount > 0) {
      creditors.push({ userId, amount });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplified: Balance[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    
    const settleAmount = Math.min(debtor.amount, creditor.amount);
    
    if (settleAmount > 0) {
      simplified.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: settleAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    // Use a small epsilon to avoid floating point issues, though we use integer cents
    if (debtor.amount <= 0) d++;
    if (creditor.amount <= 0) c++;
  }

  return simplified;
}

/**
 * Summarizes the simplified balances for a specific user.
 */
export function getUserBalanceSummary(
  userId: string,
  balances: Balance[],
  users: User[]
): { youOwe: { user: User; amount: number }[]; owedToYou: { user: User; amount: number }[] } {
  const youOwe: { user: User; amount: number }[] = [];
  const owedToYou: { user: User; amount: number }[] = [];

  const getUser = (id: string) => users.find(u => u.id === id) || { id, email: 'unknown', displayName: 'Unknown User', createdAt: 0 } as User;

  for (const balance of balances) {
    if (balance.fromUserId === userId) {
      youOwe.push({
        user: getUser(balance.toUserId),
        amount: balance.amount,
      });
    } else if (balance.toUserId === userId) {
      owedToYou.push({
        user: getUser(balance.fromUserId),
        amount: balance.amount,
      });
    }
  }

  return { youOwe, owedToYou };
}
