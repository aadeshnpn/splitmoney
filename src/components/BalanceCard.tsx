'use client'
import { User } from '@/types';
import { formatCents } from '@/lib/money';

interface BalanceCardProps {
  otherUser: User;
  amount: number;
  onSettleUp: () => void;
}

export default function BalanceCard({ otherUser, amount, onSettleUp }: BalanceCardProps) {
  const isOwedToYou = amount > 0;
  const isNeutral = amount === 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '12px',
      marginBottom: '0.75rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'var(--bg-primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', fontWeight: 'bold'
        }}>
          {(otherUser.displayName || 'User').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{otherUser.displayName || 'User'}</div>
          <div style={{ 
            color: isNeutral ? 'var(--text-secondary)' : (isOwedToYou ? 'var(--accent)' : '#ef4444'),
            fontSize: '0.875rem' 
          }}>
            {isNeutral ? 'Settled up' : (isOwedToYou ? `owes you ${formatCents(amount)}` : `you owe ${formatCents(Math.abs(amount))}`)}
          </div>
        </div>
      </div>
      {!isNeutral && (
        <button
          onClick={onSettleUp}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Settle
        </button>
      )}
    </div>
  );
}
