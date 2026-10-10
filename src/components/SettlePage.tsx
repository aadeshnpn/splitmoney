'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { db } from '@/lib/db';
import { parseDollarInput, formatCents } from '@/lib/money';
import { Settlement } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function SettlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { members, household } = useHousehold();

  const toUserParam = searchParams.get('toUser') || '';

  const [toUserId, setToUserId] = useState(toUserParam);
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (toUserParam) {
      setToUserId(toUserParam);
    }
  }, [toUserParam]);

  const otherMembers = members.filter((m) => m.userId !== user?.id);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.householdId || !toUserId) return;

    const amountCents = parseDollarInput(amountInput);
    if (!amountCents || amountCents <= 0) {
      alert('Please enter a valid positive settlement amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const settlement: Settlement = {
        id: uuidv4(),
        householdId: user.householdId,
        fromUser: user.id,
        toUser: toUserId,
        amount: amountCents,
        paymentMethod,
        date: new Date().toISOString().split('T')[0],
        notes: notes.trim() || null,
        createdAt: Date.now(),
        isDeleted: 0,
      };

      await db.createSettlement(settlement);
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to save settlement:', err);
      alert('Error saving settlement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          ✕ Cancel
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Settle Up</h1>
        <div style={{ width: '50px' }} />
      </header>

      <form onSubmit={handleSettle} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Info Banner */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--text-secondary)',
            fontSize: '0.825rem',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
          }}
        >
          <span style={{ fontSize: '1rem' }}>ℹ️</span>
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.15rem' }}>
              Recording External Payment
            </strong>
            This records a payment made outside the app (e.g. Cash, Venmo, Zelle). SplitMoney does not handle payment gateway processing.
          </div>
        </div>

        {/* Recipient Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Who are you paying?
          </label>
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '1rem',
            }}
          >
            <option value="">Select Member...</option>
            {otherMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.displayName || 'User'}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '2rem',
              fontWeight: 'bold',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Payment Method */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Payment Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {['Cash', 'Venmo', 'Zelle', 'PayPal', 'Bank Transfer', 'Other'].map((method) => (
              <button
                type="button"
                key={method}
                onClick={() => setPaymentMethod(method)}
                style={{
                  padding: '0.6rem 0.4rem',
                  borderRadius: '8px',
                  border: paymentMethod === method ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  backgroundColor: paymentMethod === method ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                  color: paymentMethod === method ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: paymentMethod === method ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Venmo transfer ref #123"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !toUserId || !amountInput}
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Recording Payment...' : 'Record Payment'}
        </button>
      </form>
    </div>
  );
}
