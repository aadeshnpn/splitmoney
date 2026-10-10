import { describe, it, expect } from 'vitest';
import { calculateBalances, simplifyDebts, getUserBalanceSummary } from './balance';
import type { Expense, ExpenseSplit, Settlement, User } from '@/types';

describe('balance.ts', () => {
  const dummyUser = (id: string): User => ({
    id,
    email: `${id}@example.com`,
    displayName: id,
    avatarUrl: null,
    householdId: 'h1',
    createdAt: 0,
  });

  const dummyExpense = (id: string, paidBy: string, totalAmount: number): Expense => ({
    id,
    householdId: 'h1',
    title: `Expense ${id}`,
    totalAmount,
    paidBy,
    date: '2023-01-01',
    category: 'other',
    receiptUrl: null,
    notes: null,
    splitType: 'EQUAL',
    createdBy: paidBy,
    createdAt: 0,
    updatedAt: 0,
    isDeleted: 0,
  });

  const dummySplit = (expenseId: string, userId: string, amount: number): ExpenseSplit => ({
    id: `${expenseId}_${userId}`,
    expenseId,
    userId,
    amount,
  });

  const dummySettlement = (id: string, fromUser: string, toUser: string, amount: number): Settlement => ({
    id,
    householdId: 'h1',
    fromUser,
    toUser,
    amount,
    paymentMethod: 'cash',
    date: '2023-01-02',
    notes: null,
    createdAt: 0,
    isDeleted: 0,
  });

  describe('calculateBalances', () => {
    it('calculates simple debt correctly', () => {
      const expenses = [dummyExpense('e1', 'A', 1000)];
      const splits = [
        dummySplit('e1', 'A', 500),
        dummySplit('e1', 'B', 500),
      ];
      const settlements: Settlement[] = [];

      const balances = calculateBalances(expenses, splits, settlements);
      
      expect(balances).toHaveLength(1);
      expect(balances).toContainEqual({ fromUserId: 'B', toUserId: 'A', amount: 500 });
    });

    it('offsets debts between two users correctly', () => {
      const expenses = [
        dummyExpense('e1', 'A', 1000),
        dummyExpense('e2', 'B', 400),
      ];
      const splits = [
        dummySplit('e1', 'A', 500), dummySplit('e1', 'B', 500),
        dummySplit('e2', 'B', 200), dummySplit('e2', 'A', 200),
      ];
      const settlements: Settlement[] = [];

      const balances = calculateBalances(expenses, splits, settlements);
      expect(balances).toHaveLength(1);
      expect(balances).toContainEqual({ fromUserId: 'B', toUserId: 'A', amount: 300 });
    });

    it('ignores deleted expenses and settlements', () => {
      const e1 = dummyExpense('e1', 'A', 1000);
      e1.isDeleted = 1;
      
      const expenses = [e1];
      const splits = [dummySplit('e1', 'A', 500), dummySplit('e1', 'B', 500)];
      
      const s1 = dummySettlement('s1', 'A', 'B', 200);
      s1.isDeleted = 1;
      const settlements: Settlement[] = [s1];

      const balances = calculateBalances(expenses, splits, settlements);
      expect(balances).toHaveLength(0);
    });

    it('ignores 0 amounts or self-debts', () => {
      const expenses = [dummyExpense('e1', 'A', 1000)];
      const splits = [
        dummySplit('e1', 'A', 1000), // self debt
        dummySplit('e1', 'B', 0)     // zero amount
      ];
      
      const balances = calculateBalances(expenses, splits, []);
      expect(balances).toHaveLength(0);
    });

    it('incorporates settlements correctly', () => {
      const expenses = [dummyExpense('e1', 'A', 1000)];
      const splits = [dummySplit('e1', 'A', 500), dummySplit('e1', 'B', 500)];
      
      const settlements = [dummySettlement('s1', 'B', 'A', 200)];

      const balances = calculateBalances(expenses, splits, settlements);
      expect(balances).toHaveLength(1);
      expect(balances).toContainEqual({ fromUserId: 'B', toUserId: 'A', amount: 300 });
    });
    
    it('handles over-settlement correctly (creditor becomes debtor)', () => {
      const expenses = [dummyExpense('e1', 'A', 1000)];
      const splits = [dummySplit('e1', 'A', 500), dummySplit('e1', 'B', 500)];
      const settlements = [dummySettlement('s1', 'B', 'A', 600)];

      const balances = calculateBalances(expenses, splits, settlements);
      expect(balances).toHaveLength(1);
      expect(balances).toContainEqual({ fromUserId: 'A', toUserId: 'B', amount: 100 });
    });
  });

  describe('simplifyDebts', () => {
    it('simplifies a circular debt A->B->C->A', () => {
      const balances = [
        { fromUserId: 'A', toUserId: 'B', amount: 100 },
        { fromUserId: 'B', toUserId: 'C', amount: 100 },
        { fromUserId: 'C', toUserId: 'A', amount: 100 },
      ];
      const simplified = simplifyDebts(balances);
      expect(simplified).toHaveLength(0);
    });

    it('simplifies chain debts A->B->C', () => {
      const balances = [
        { fromUserId: 'A', toUserId: 'B', amount: 100 },
        { fromUserId: 'B', toUserId: 'C', amount: 100 },
      ];
      const simplified = simplifyDebts(balances);
      expect(simplified).toHaveLength(1);
      expect(simplified).toContainEqual({ fromUserId: 'A', toUserId: 'C', amount: 100 });
    });

    it('simplifies star graph debts', () => {
      const balances = [
        { fromUserId: 'A', toUserId: 'B', amount: 100 },
        { fromUserId: 'C', toUserId: 'B', amount: 100 },
        { fromUserId: 'D', toUserId: 'B', amount: 100 },
      ];
      const simplified = simplifyDebts(balances);
      expect(simplified).toHaveLength(3);
      
      const complexBalances = [
        { fromUserId: 'A', toUserId: 'B', amount: 100 },
        { fromUserId: 'B', toUserId: 'C', amount: 200 },
        { fromUserId: 'D', toUserId: 'C', amount: 100 },
      ];
      const sim = simplifyDebts(complexBalances);
      expect(sim).toHaveLength(3);
      expect(sim.every(b => b.toUserId === 'C')).toBe(true);
      
      const totalAmount = sim.reduce((sum, b) => sum + b.amount, 0);
      expect(totalAmount).toBe(300);
    });

    it('handles matching large debtor with large creditor', () => {
      const balances = [
        { fromUserId: 'A', toUserId: 'C', amount: 400 },
        { fromUserId: 'A', toUserId: 'D', amount: 100 },
        { fromUserId: 'B', toUserId: 'D', amount: 200 },
      ];
      const sim = simplifyDebts(balances);
      expect(sim).toHaveLength(3);
    });
  });

  describe('getUserBalanceSummary', () => {
    it('summarizes youOwe and owedToYou correctly', () => {
      const users = [dummyUser('A'), dummyUser('B'), dummyUser('C')];
      const balances = [
        { fromUserId: 'A', toUserId: 'B', amount: 100 },
        { fromUserId: 'C', toUserId: 'A', amount: 200 },
      ];

      const summary = getUserBalanceSummary('A', balances, users);
      
      expect(summary.youOwe).toHaveLength(1);
      expect(summary.youOwe[0]).toEqual({ user: users[1], amount: 100 });
      
      expect(summary.owedToYou).toHaveLength(1);
      expect(summary.owedToYou[0]).toEqual({ user: users[2], amount: 200 });
    });
    
    it('returns empty arrays if no balances involve user', () => {
      const users = [dummyUser('A'), dummyUser('B'), dummyUser('C')];
      const balances = [
        { fromUserId: 'B', toUserId: 'C', amount: 100 },
      ];

      const summary = getUserBalanceSummary('A', balances, users);
      expect(summary.youOwe).toHaveLength(0);
      expect(summary.owedToYou).toHaveLength(0);
    });

    it('handles cases where user is not found in the list', () => {
      const users = [dummyUser('A')]; // B and C are missing
      const balances = [
        { fromUserId: 'A', toUserId: 'B', amount: 100 },
        { fromUserId: 'C', toUserId: 'A', amount: 200 },
      ];

      const summary = getUserBalanceSummary('A', balances, users);
      
      expect(summary.youOwe[0].user.displayName).toBe('Unknown User');
      expect(summary.youOwe[0].user.id).toBe('B');
      
      expect(summary.owedToYou[0].user.displayName).toBe('Unknown User');
      expect(summary.owedToYou[0].user.id).toBe('C');
    });
  });
});
