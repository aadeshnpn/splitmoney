'use client';

import React from 'react';
import { formatCents } from '@/lib/money';
import { CATEGORY_META, ExpenseCategory } from '@/types';

interface ReportKPIsProps {
  totalSpent: number;
  memberCount: number;
  transactionCount: number;
  topCategory: ExpenseCategory | null;
  topCategoryAmount: number;
}

export default function ReportKPIs({
  totalSpent,
  memberCount,
  transactionCount,
  topCategory,
  topCategoryAmount,
}: ReportKPIsProps) {
  const avgPerPerson = memberCount > 0 ? Math.round(totalSpent / memberCount) : 0;
  const categoryMeta = topCategory ? CATEGORY_META[topCategory] : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Total Spent
        </span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent)' }}>
          {formatCents(totalSpent)}
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Avg / Person
        </span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
          {formatCents(avgPerPerson)}
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Top Category
        </span>
        <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {categoryMeta ? `${categoryMeta.emoji} ${categoryMeta.label}` : 'N/A'}
        </div>
        {topCategoryAmount > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {formatCents(topCategoryAmount)}
          </div>
        )}
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Transactions
        </span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
          {transactionCount}
        </div>
      </div>
    </div>
  );
}
