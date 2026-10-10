'use client';

import { useState, useMemo } from 'react';
import CategoryPicker from './CategoryPicker';
import SplitSelector, { EditableLineItem } from './SplitSelector';
import ReceiptUploader from './ReceiptUploader';
import { Expense, ExpenseCategory, SplitType, ExpenseSplit, LineItem } from '@/types';
import { parseMoney, formatCents } from '@/lib/money';
import { CATEGORY_META } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { v4 as uuidv4 } from 'uuid';

type ExpenseWithRelations = Expense & {
  splits?: ExpenseSplit[];
  lineItems?: LineItem[];
};

interface ExpenseFormProps {
  expense?: ExpenseWithRelations;
  onSubmit: (data: any, splits: any[], lineItems?: any[]) => void;
  onCancel: () => void;
  members: { userId: string; displayName: string; avatarUrl: string | null }[];
  currentUserId: string;
  householdId?: string;
}

export default function ExpenseForm({ expense, onSubmit, onCancel, members, currentUserId, householdId }: ExpenseFormProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(expense?.title || '');
  const [amountInput, setAmountInput] = useState(expense ? (expense.totalAmount / 100).toFixed(2) : '');
  const [date, setDate] = useState(expense?.date.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>((expense?.category as ExpenseCategory) || 'other');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || currentUserId);
  const [notes, setNotes] = useState(expense?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl || null);
  const [autoPopulated, setAutoPopulated] = useState(false);
  const [draftExpenseId] = useState(() => expense?.id || uuidv4());
  const allMemberIds = members.map((m) => m.userId);

  const [lineItems, setLineItems] = useState<EditableLineItem[]>(() => {
    if (expense?.lineItems && expense.lineItems.length > 0) {
      return expense.lineItems.map((li) => ({
        description: li.description,
        amount: li.amount,
        assignedTo: li.assignedTo && li.assignedTo.length > 0 ? li.assignedTo : allMemberIds,
      }));
    }
    return [];
  });

  const totalAmount = parseMoney(amountInput);

  const [splitType, setSplitType] = useState<SplitType>((expense?.splitType as SplitType) || 'EQUAL');
  const [splits, setSplits] = useState<{ userId: string; amount: number }[]>(() => {
    if (expense?.splits && expense.splits.length > 0) {
      return members.map((m) => ({
        userId: m.userId,
        amount: expense.splits?.find((s) => s.userId === m.userId)?.amount || 0,
      }));
    }
    return members.map((m) => ({ userId: m.userId, amount: 0 }));
  });

  const isSplitValid = useMemo(() => {
    if (step !== 2) return true;
    const currentSum = splits.reduce((acc, s) => acc + s.amount, 0);
    if (splitType === 'CUSTOM_AMOUNT') {
      return currentSum === totalAmount;
    }
    if (splitType === 'PERCENTAGE') {
      return Math.abs(currentSum - totalAmount) <= 1;
    }
    if (splitType === 'PER_ITEM') {
      const itemsSum = lineItems.reduce((sum, i) => sum + i.amount, 0);
      return (
        lineItems.length > 0 &&
        itemsSum === totalAmount &&
        lineItems.every((i) => i.description.trim() && i.assignedTo.length > 0) &&
        currentSum === totalAmount
      );
    }
    return true;
  }, [step, splits, totalAmount, splitType, lineItems]);

  const handleNext = () => setStep((s) => Math.min(3, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleOCRResult = (result: any) => {
    if (result.vendorName) setTitle(result.vendorName);
    if (result.total) setAmountInput((result.total / 100).toFixed(2));
    if (result.category) setCategory(result.category as ExpenseCategory);
    if (result.lineItems && result.lineItems.length > 0) {
      setLineItems(
        result.lineItems.map((li: { description: string; amount: number }) => ({
          description: li.description,
          amount: li.amount,
          assignedTo: allMemberIds,
        }))
      );
      setSplitType('PER_ITEM');
    }
    setAutoPopulated(true);
  };

  const handleAddQuickAmount = (dollars: number) => {
    const currentCents = parseMoney(amountInput);
    const newCents = currentCents + dollars * 100;
    setAmountInput((newCents / 100).toFixed(2));
  };

  const handleSubmit = () => {
    const persistLineItems =
      splitType === 'PER_ITEM'
        ? lineItems.map((li) => ({
            description: li.description,
            amount: li.amount,
            assignedTo: li.assignedTo,
          }))
        : [];

    onSubmit(
      {
        title,
        totalAmount,
        date,
        category,
        paidBy,
        notes,
        receiptUrl,
        splitType,
      },
      splits.filter((s) => s.amount > 0),
      persistLineItems
    );
  };

  const selectedPayer = members.find((m) => m.userId === paidBy);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.25rem', paddingBottom: '80px' }}>
      {/* Wizard Progress Segmented Header */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          padding: '0.85rem 1rem',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          {[
            { num: 1, label: 'Receipt & Details' },
            { num: 2, label: 'Split Options' },
            { num: 3, label: 'Review & Confirm' },
          ].map((s, idx) => {
            const isActive = step === s.num;
            const isDone = step > s.num;

            return (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < step || (s.num === 2 && title && totalAmount > 0)) setStep(s.num);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  opacity: isActive || isDone ? 1 : 0.5,
                  transition: 'all 0.25s ease',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isDone
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : isActive
                      ? 'linear-gradient(135deg, #10b981, #3b82f6)'
                      : 'var(--bg-primary)',
                    border: isActive ? '2px solid #10b981' : '1px solid var(--border)',
                    color: isDone || isActive ? '#ffffff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                >
                  {isDone ? '✓' : s.num}
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.label}
                </span>

                {idx < 2 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      background: step > s.num ? '#10b981' : 'var(--border)',
                      borderRadius: '1px',
                      margin: '0 0.25rem',
                      transition: 'all 0.3s ease',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Hero Amount & Smart Receipt Scan */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hero Fintech Amount Input Card */}
          <div
            style={{
              padding: '1.75rem 1.25rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Expense Amount
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '0.25rem 0' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent)', marginRight: '0.3rem' }}>
                $
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                style={{
                  width: '220px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '2.8rem',
                  fontWeight: 800,
                  textAlign: 'left',
                  letterSpacing: '-0.02em',
                }}
              />
            </div>

            {/* Quick Amount Increment Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[5, 10, 20, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddQuickAmount(amt)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                >
                  +${amt}
                </button>
              ))}
              {amountInput !== '' && (
                <button
                  type="button"
                  onClick={() => setAmountInput('')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Smart AI Receipt Scanner Card */}
          <ReceiptUploader
            expenseId={draftExpenseId}
            householdId={householdId || 'pending'}
            onImageUploaded={setReceiptUrl}
            onOCRResult={handleOCRResult}
          />

          {/* Auto-Populated Success Notification Banner */}
          {autoPopulated && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.1rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.08))',
                border: '1px solid #10b981',
                borderRadius: '16px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>✨</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981' }}>
                  Auto-populated from receipt!
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'rgba(16, 185, 129, 0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                }}
              >
                {CATEGORY_META[category]?.emoji} {CATEGORY_META[category]?.label}
              </span>
            </div>
          )}

          {/* Form Fields Container */}
          <div
            style={{
              padding: '1.25rem',
              background: 'var(--bg-secondary)',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem',
            }}
          >
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Expense Details
            </h3>

            {/* Description / Vendor Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Description / Vendor
              </label>
              <input
                type="text"
                placeholder="Description / Vendor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>

            {/* Paid By & Date Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Paid By
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {selectedPayer && (
                    <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}>
                      <Avatar name={selectedPayer.displayName} src={selectedPayer.avatarUrl || undefined} size="sm" />
                    </div>
                  )}
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.85rem 0.75rem 0.85rem 2.6rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 0.75rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Category Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Category
              </label>
              <CategoryPicker value={category} onChange={setCategory} />
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Add extra notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Split Options */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Split Options</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Choose how to split {formatCents(totalAmount)} among household members.
            </p>
          </div>

          <SplitSelector
            totalAmount={totalAmount}
            members={members}
            splitType={splitType}
            onSplitTypeChange={setSplitType}
            splits={splits}
            onSplitsChange={setSplits}
            lineItems={lineItems}
            onLineItemsChange={setLineItems}
          />
        </div>
      )}

      {/* STEP 3: Review & Ticket Card */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Review & Confirm</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Double check details before saving to household ledger.
            </p>
          </div>

          {/* Digital Receipt Ticket Card */}
          <div
            style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
              borderRadius: '24px',
              border: '1px solid var(--accent)',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {CATEGORY_META[category]?.emoji} {CATEGORY_META[category]?.label}
                </span>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>{title || 'Expense'}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>
                  {formatCents(totalAmount)}
                </span>
              </div>
            </div>

            {receiptUrl && (
              <div style={{ margin: '1rem 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', maxHeight: '140px' }}>
                <img src={receiptUrl} alt="Receipt" style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                💳 Paid by <strong>{members.find((m) => m.userId === paidBy)?.displayName}</strong> on {date}
              </span>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />

            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              Split Breakdown ({splitType})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {splits
                .filter((s) => s.amount > 0)
                .map((s) => {
                  const member = members.find((m) => m.userId === s.userId);
                  return (
                    <div
                      key={s.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Avatar name={member?.displayName || 'Member'} src={member?.avatarUrl || undefined} size="sm" />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member?.displayName}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{formatCents(s.amount)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Actions Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0.85rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '0.85rem',
          zIndex: 100,
          boxShadow: '0 -10px 25px rgba(0,0,0,0.3)',
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            style={{
              flex: '0 0 100px',
              padding: '0.9rem',
              borderRadius: '14px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ← Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: '0 0 100px',
              padding: '0.9rem',
              borderRadius: '14px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid transparent',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!title || totalAmount <= 0 || !isSplitValid}
            style={{
              flex: 1,
              padding: '0.9rem',
              borderRadius: '14px',
              background: !title || totalAmount <= 0 || !isSplitValid ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: !title || totalAmount <= 0 || !isSplitValid ? 'not-allowed' : 'pointer',
              opacity: !title || totalAmount <= 0 || !isSplitValid ? 0.5 : 1,
              boxShadow: !title || totalAmount <= 0 || !isSplitValid ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '0.9rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            Confirm & Save
          </button>
        )}
      </div>
    </div>
  );
}
