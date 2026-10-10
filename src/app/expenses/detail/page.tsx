'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ExpenseDetailPage from '@/components/ExpenseDetailPage';

function ExpenseDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || 'demo';
  return <ExpenseDetailPage expenseId={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading details...</div>}>
      <ExpenseDetailContent />
    </Suspense>
  );
}
