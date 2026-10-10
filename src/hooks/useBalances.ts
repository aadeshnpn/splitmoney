'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExpensesByHousehold, getSplitsByExpense, getSettlementsByHousehold } from '@/lib/db';
import { calculateBalances, simplifyDebts, getUserBalanceSummary } from '@/lib/balance';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { Balance, ExpenseSplit, User } from '@/types';

type BalanceEntry = { user: User; amount: number };

export function useBalances() {
  const { user } = useAuth();
  const { household, members } = useHousehold();
  const householdId = household?.id;
  const userId = user?.id;
  const [balances, setBalances] = useState<Balance[]>([]);
  const [youOwe, setYouOwe] = useState<BalanceEntry[]>([]);
  const [owedToYou, setOwedToYou] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBalances = useCallback(async () => {
    if (!householdId || !userId) {
      setBalances([]);
      setYouOwe([]);
      setOwedToYou([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const expenses = await getExpensesByHousehold(householdId);
      
      const allSplits: ExpenseSplit[] = [];
      for (const exp of expenses) {
        if (exp.isDeleted) continue;
        const splits = await getSplitsByExpense(exp.id);
        allSplits.push(...splits);
      }
      
      const settlements = await getSettlementsByHousehold(householdId);
      
      const rawBalances = calculateBalances(expenses, allSplits, settlements);
      const simplified = simplifyDebts(rawBalances);
      
      const users = members.map(m => m.user).filter((member): member is User => Boolean(member));
      
      const summary = getUserBalanceSummary(userId, simplified, users);
      
      setBalances(simplified);
      setYouOwe(summary.youOwe);
      setOwedToYou(summary.owedToYou);
    } catch (e) {
      console.error('Error loading balances:', e);
    } finally {
      setLoading(false);
    }
  }, [householdId, userId, members]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBalances();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadBalances]);

  return { balances, youOwe, owedToYou, loading, refreshBalances: loadBalances };
}
