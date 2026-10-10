'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExpenses } from '@/hooks/useExpenses';
import { useHousehold } from '@/hooks/useHousehold';
import { formatCents } from '@/lib/money';
import {
  CATEGORY_META,
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  LineItem,
  ExpenseDraft,
  ExpenseDraftLineItem,
  ExpenseDraftSplit,
} from '@/types';
import Avatar from '@/components/ui/Avatar';
import ExpenseForm from '@/components/ExpenseForm';
import BottomNav from '@/components/BottomNav';

export default function ExpenseDetailPage({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const { getExpense, deleteExpense, updateExpense } = useExpenses();
  const { members } = useHousehold();
  const [expenseData, setExpenseData] = useState<
    (Expense & { splits: ExpenseSplit[]; lineItems: LineItem[]; receipt_url?: string | null; amount?: number }) | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getExpense(expenseId).then((res) => {
      if (isMounted) {
        setExpenseData(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [expenseId, getExpense]);

  if (loading || !expenseData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        Loading expense details...
      </div>
    );
  }

  const catMeta = CATEGORY_META[expenseData.category as ExpenseCategory] || CATEGORY_META.other;
  const payerMember = members.find((m) => m.userId === expenseData.paidBy);
  const receiptImage = expenseData.receiptUrl || expenseData.receipt_url;
  const totalAmount = expenseData.totalAmount ?? expenseData.amount ?? 0;

  const handleEditSubmit = async (
    data: ExpenseDraft,
    splits: ExpenseDraftSplit[],
    lineItems?: ExpenseDraftLineItem[]
  ) => {
    try {
      await updateExpense(expenseId, data, splits, lineItems ?? []);
      const updated = await getExpense(expenseId);
      setExpenseData(updated);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update expense.');
    }
  };

  if (isEditing) {
    return (
      <div style={{ padding: '1rem', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
        <header style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Expense</h1>
        </header>
        <ExpenseForm
          expense={expenseData}
          members={members.map((m) => ({
            userId: m.userId,
            displayName: m.user?.displayName || 'User',
            avatarUrl: m.user?.avatarUrl || null,
          }))}
          currentUserId={expenseData.paidBy}
          householdId={expenseData.householdId}
          onCancel={() => setIsEditing(false)}
          onSubmit={handleEditSubmit}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Expense Details</h1>
        <div style={{ width: '50px' }} />
      </header>

      {/* Main Details Card */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid var(--border)',
          marginBottom: '1.25rem',
        }}
      >
        {/* Category Pill & Date Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.8rem',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <span>{catMeta.emoji}</span>
            <span>{catMeta.label}</span>
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {new Date(expenseData.date?.includes('T') ? expenseData.date : `${expenseData.date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Title & Total Amount */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
          {expenseData.title}
        </h2>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '1.25rem' }}>
          {formatCents(totalAmount)}
        </div>

        {/* Payer Info Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '1.25rem',
          }}
        >
          <Avatar src={payerMember?.user?.avatarUrl || undefined} name={payerMember?.user?.displayName || 'User'} size="md" />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paid By
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {payerMember?.user?.displayName || 'User'}
            </div>
          </div>
        </div>

        {/* Receipt Image Card */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              🧾 Receipt Image
            </span>
            {receiptImage && (
              <button
                onClick={() => setShowFullReceipt(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔍 View Fullscreen
              </button>
            )}
          </div>

          {receiptImage ? (
            <div
              onClick={() => setShowFullReceipt(true)}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                padding: '0.5rem',
                textAlign: 'center',
              }}
            >
              <img
                src={receiptImage}
                alt="Receipt"
                style={{
                  width: '100%',
                  maxHeight: '260px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px dashed var(--border)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              📷 No receipt photo attached to this expense.
            </div>
          )}
        </div>

        {/* Line Items (if present) */}
        {expenseData.lineItems && expenseData.lineItems.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Itemized Line Items
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {expenseData.lineItems.map((item, idx: number) => {
                const assignees = (item.assignedTo || [])
                  .map((uid: string) => members.find((m) => m.userId === uid)?.user?.displayName || 'Member')
                  .join(', ');
                return (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{item.description}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCents(item.amount)}</span>
                    </div>
                    {assignees && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Split: {assignees}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Split Breakdown */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              Split Breakdown
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              {expenseData.splitType || 'EQUAL'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {expenseData.splits && expenseData.splits.length > 0 ? (
              expenseData.splits.map((split) => {
                const member = members.find((m) => m.userId === split.userId);
                const percent = totalAmount > 0 ? Math.round((split.amount / totalAmount) * 100) : 0;
                return (
                  <div
                    key={split.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Avatar src={member?.user?.avatarUrl || undefined} name={member?.user?.displayName || 'User'} size="sm" />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {member?.user?.displayName || 'User'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{percent}% share</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {formatCents(split.amount)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No split details found.</div>
            )}
          </div>
        </div>

        {/* Notes */}
        {expenseData.notes && (
          <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Notes</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{expenseData.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          ✏️ Edit Expense
        </button>
        <button
          onClick={async () => {
            if (confirm(`Delete "${expenseData.title}"? This will update household balances.`)) {
              await deleteExpense(expenseId);
              router.push('/expenses');
            }
          }}
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          🗑️ Delete
        </button>
      </div>

      {/* Lightbox Receipt Fullscreen Modal */}
      {showFullReceipt && receiptImage && (
        <div
          onClick={() => setShowFullReceipt(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setShowFullReceipt(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
            <img
              src={receiptImage}
              alt="Full Receipt"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
