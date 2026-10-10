'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getExpensesByHousehold,
  createExpense as dbCreateExpense,
  createSplits as dbCreateSplits,
  createLineItems as dbCreateLineItems,
  getExpense as dbGetExpense,
  softDeleteExpense,
  updateExpense as dbUpdateExpense,
  replaceSplits,
  replaceLineItems,
  getSplitsByExpense,
  getLineItemsByExpense,
} from '@/lib/db';
import { fullSync } from '@/lib/sync';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { Expense, ExpenseSplit, LineItem, ExpenseDraft } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useExpenses() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const householdId = household?.id;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    if (!householdId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const exps = await getExpensesByHousehold(householdId);
      setExpenses(exps);
    } catch (e) {
      console.error('Error loading expenses:', e);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadExpenses();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const addExpense = async (
    data: ExpenseDraft,
    splits: Omit<ExpenseSplit, 'id' | 'expenseId'>[],
    lineItems?: Omit<LineItem, 'id' | 'expenseId'>[]
  ) => {
    if (!household?.id || !user?.id) return;
    const id = uuidv4();
    const now = Date.now();

    const newExpense: Expense = {
      ...data,
      id,
      householdId: household.id,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
    };

    await dbCreateExpense(newExpense);

    const fullSplits: ExpenseSplit[] = splits.map((s) => ({
      ...s,
      id: uuidv4(),
      expenseId: id,
    }));
    await dbCreateSplits(fullSplits);

    if (lineItems && lineItems.length > 0) {
      const fullItems: LineItem[] = lineItems.map((li) => ({
        ...li,
        id: uuidv4(),
        expenseId: id,
      }));
      await dbCreateLineItems(fullItems);
    }

    await loadExpenses();
    await fullSync(household.id);
  };

  const updateExpense = async (
    id: string,
    data: Partial<Expense>,
    splits?: Omit<ExpenseSplit, 'id' | 'expenseId'>[],
    lineItems?: Omit<LineItem, 'id' | 'expenseId'>[]
  ) => {
    const existing = await dbGetExpense(id);
    if (!existing) return;

    const updated: Expense = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    await dbUpdateExpense(updated);

    if (splits) {
      const fullSplits: ExpenseSplit[] = splits.map((s) => ({
        ...s,
        id: uuidv4(),
        expenseId: id,
      }));
      await replaceSplits(id, fullSplits);
    }

    if (lineItems !== undefined) {
      const fullItems: LineItem[] = lineItems.map((li) => ({
        ...li,
        id: uuidv4(),
        expenseId: id,
      }));
      await replaceLineItems(id, fullItems);
    }

    await loadExpenses();
    if (household?.id) await fullSync(household.id);
  };

  const deleteExpense = async (id: string) => {
    await softDeleteExpense(id);
    await loadExpenses();
    if (household?.id) await fullSync(household.id);
  };

  const getExpense = useCallback(async (id: string) => {
    const expense = await dbGetExpense(id);
    if (!expense) return null;

    const splits = await getSplitsByExpense(id);
    const lineItems = await getLineItemsByExpense(id);

    return { ...expense, splits, lineItems };
  }, []);

  return { expenses, loading, addExpense, updateExpense, deleteExpense, getExpense, refreshExpenses: loadExpenses };
}
