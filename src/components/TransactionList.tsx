'use client'
import { formatCents } from '@/lib/money';
import { CATEGORY_META, User } from '@/types';

interface TransactionEntry {
  id: string;
  type: 'expense' | 'settlement';
  date: string;
  title: string;
  amount: number;
  yourShare: number;
  category?: string;
  paidBy: string;
}

interface TransactionListProps {
  transactions: TransactionEntry[];
  users: Map<string, User>;
  onExpenseClick: (id: string) => void;
}

export default function TransactionList({ transactions, users, onExpenseClick }: TransactionListProps) {
  const grouped = transactions.reduce((acc, t) => {
    const d = new Date(t.date).toDateString();
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {} as Record<string, TransactionEntry[]>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            {date}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map(t => {
              const paidByUser = users.get(t.paidBy)?.displayName || 'Unknown';
              return (
                <div 
                  key={t.id} 
                  onClick={() => t.type === 'expense' && onExpenseClick(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '1rem',
                    background: 'var(--card-bg)', borderRadius: '12px',
                    cursor: t.type === 'expense' ? 'pointer' : 'default',
                    opacity: 0, animation: 'fadeIn 0.3s forwards ease-in'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginRight: '1rem' }}>
                    {t.type === 'settlement' ? '💸' : (t.category ? CATEGORY_META[t.category as keyof typeof CATEGORY_META]?.emoji : '🏷️')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {t.type === 'settlement' ? 'Settlement' : `${paidByUser} paid ${formatCents(t.amount)}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: t.yourShare > 0 ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                      {t.yourShare > 0 ? '+' : ''}{t.yourShare !== 0 ? formatCents(t.yourShare) : 'Not involved'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
