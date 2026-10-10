'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import TransactionList from '@/components/TransactionList';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_META, ExpenseCategory } from '@/types';
import { formatCents } from '@/lib/money';

export default function ExpensesPage() {
  const router = useRouter();
  const { expenses, loading } = useExpenses();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const users = new Map();
  if (user) {
    users.set(user.id, {
      id: user.id,
      displayName: user.displayName || 'You',
      email: user.email || '',
      avatarUrl: user.avatarUrl || null,
      householdId: user.householdId || null,
      createdAt: user.createdAt || Date.now(),
    });
  }

  // Filter expenses by search query and category
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.isDeleted) return false;

      // Category filter
      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = e.title.toLowerCase().includes(query);
        const notesMatch = e.notes?.toLowerCase().includes(query);
        const catMatch = CATEGORY_META[e.category]?.label.toLowerCase().includes(query);
        if (!titleMatch && !notesMatch && !catMatch) return false;
      }

      return true;
    });
  }, [expenses, selectedCategory, searchQuery]);

  const transactions = filteredExpenses.map((e) => ({
    id: e.id,
    type: 'expense' as const,
    date: e.date,
    title: e.title,
    amount: e.totalAmount,
    yourShare: e.paidBy === user?.id ? e.totalAmount : -1000,
    category: e.category,
    paidBy: e.paidBy,
  }));

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  }, [filteredExpenses]);

  return (
    <div style={{ padding: '1rem', paddingBottom: '100px', minHeight: '100vh', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>All Expenses</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filtered Total</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{formatCents(filteredTotal)}</div>
        </div>
      </header>

      {/* Quick Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search title or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          scrollbarWidth: 'none',
        }}
      >
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            border: selectedCategory === 'all' ? '1px solid var(--accent)' : '1px solid var(--border-color)',
            backgroundColor: selectedCategory === 'all' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
            color: selectedCategory === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: selectedCategory === 'all' ? 600 : 400,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const isSelected = selectedCategory === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: isSelected ? 600 : 400,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : transactions.length > 0 ? (
        <TransactionList
          transactions={transactions}
          users={users}
          onExpenseClick={(id) => router.push(`/expenses/detail?id=${id}`)}
        />
      ) : (
        <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
          <p>No expenses found matching your filter criteria.</p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      <FAB onClick={() => router.push('/expenses/new')} />
      <BottomNav />
    </div>
  );
}
