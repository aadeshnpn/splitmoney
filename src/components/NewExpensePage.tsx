'use client';

import { useRouter } from 'next/navigation';
import ExpenseForm from '@/components/ExpenseForm';
import { ExpenseDraft, ExpenseDraftLineItem, ExpenseDraftSplit } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useHousehold } from '@/hooks/useHousehold';

export default function NewExpensePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { members: householdMembers, household } = useHousehold();
  const { addExpense } = useExpenses();

  const members =
    householdMembers.length > 0
      ? householdMembers.map((m) => ({
          userId: m.userId,
          displayName: m.user?.displayName || (m.userId === user?.id ? 'You' : 'Member'),
          avatarUrl: m.user?.avatarUrl || null,
        }))
      : user
      ? [{ userId: user.id, displayName: 'You', avatarUrl: user.avatarUrl || null }]
      : [];

  const handleSubmit = async (data: ExpenseDraft, splits: ExpenseDraftSplit[], lineItems?: ExpenseDraftLineItem[]) => {
    await addExpense(data, splits, lineItems);
    router.push('/expenses');
  };

  return (
    <div
      style={{
        padding: '1.25rem 1rem',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '560px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ✕
        </button>

        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
          Add Household Expense
        </h1>

        <div style={{ width: '40px' }} />
      </div>

      {user && (
        <ExpenseForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          members={members}
          currentUserId={user.id}
          householdId={household?.id}
        />
      )}
    </div>
  );
}
