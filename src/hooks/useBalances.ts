'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExpensesByHousehold, getSplitsByExpense, getSettlementsByHousehold } from '@/lib/db';
import { calculateBalances, simplifyDebts, getUserBalanceSummary } from '@/lib/balance';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { Balance, ExpenseSplit } from '@/types';

export function useBalances() {
  const { user } = useAuth();
  const { household, members } = useHousehold();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [youOwe, setYouOwe] = useState<any[]>([]);
  const [owedToYou, setOwedToYou] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBalances = useCallback(async () => {
    if (!household?.id || !user?.id) {
      setBalances([]);
      setYouOwe([]);
      setOwedToYou([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const expenses = await getExpensesByHousehold(household.id);
      
      const allSplits: ExpenseSplit[] = [];
      for (const exp of expenses) {
        if (exp.isDeleted) continue;
        const splits = await getSplitsByExpense(exp.id);
        allSplits.push(...splits);
      }
      
      const settlements = await getSettlementsByHousehold(household.id);
      
      const rawBalances = calculateBalances(expenses, allSplits, settlements);
      const simplified = simplifyDebts(rawBalances);
      
      const users = members.map(m => m.user!).filter(Boolean);
      
      const summary = getUserBalanceSummary(user.id, simplified, users);
      
      setBalances(simplified);
      setYouOwe(summary.youOwe);
      setOwedToYou(summary.owedToYou);
    } catch (e) {
      console.error('Error loading balances:', e);
    } finally {
      setLoading(false);
    }
  }, [household?.id, user?.id, members]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  return { balances, youOwe, owedToYou, loading, refreshBalances: loadBalances };
}
