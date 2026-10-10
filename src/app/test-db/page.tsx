'use client';

import { useEffect, useState } from 'react';
import { getDB, upsertUser, getUser, createHousehold, getHousehold, createExpense, getExpense } from '@/lib/db';
import type { User, Household, Expense } from '@/types';

export default function TestDbPage() {
  const [result, setResult] = useState<string>('RUNNING');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function runTests() {
      try {
        // 1. Initialize DB
        await getDB();
        
        // Expose to window for playwright tests
        if (typeof window !== 'undefined') {
          (window as any).dbApi = { getDB, upsertUser, getUser };
        }
        
        // 2. Test User CRUD
        const testUser: User = {
          id: 'user1',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: null,
          householdId: null,
          createdAt: Date.now(),
        };
        await upsertUser(testUser);
        
        // 3. Test Household CRUD
        const testHousehold: Household = {
          id: 'house1',
          name: 'Test House',
          createdBy: 'user1',
          inviteToken: 'token123',
          createdAt: Date.now(),
        };
        await createHousehold(testHousehold);
        const fetchedHouse = await getHousehold('house1');
        if (!fetchedHouse || fetchedHouse.name !== 'Test House') {
          throw new Error('Failed to create/get household');
        }
        
        // 4. Test Expense CRUD
        const testExpense: Expense = {
          id: 'exp1',
          householdId: 'house1',
          title: 'Dinner',
          totalAmount: 5000,
          paidBy: 'user1',
          date: new Date().toISOString(),
          category: 'groceries',
          receiptUrl: null,
          notes: 'Test expense',
          splitType: 'EQUAL',
          createdBy: 'user1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDeleted: 0,
        };
        await createExpense(testExpense);
        const fetchedExp = await getExpense('exp1');
        if (!fetchedExp || fetchedExp.title !== 'Dinner' || fetchedExp.totalAmount !== 5000) {
          throw new Error('Failed to create/get expense');
        }
        
        setResult('PASS');
      } catch (err: any) {
        setResult('FAIL');
        setError(err.message || String(err));
      }
    }
    
    runTests();
  }, []);

  return (
    <div>
      <h1>DB Tests</h1>
      <div id="test-result">{result}</div>
      {error && <div id="test-error">{error}</div>}
    </div>
  );
}
