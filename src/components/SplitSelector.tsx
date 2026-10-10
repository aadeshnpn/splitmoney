'use client';

import { useState, useEffect } from 'react';
import { SplitType } from '@/types';
import { formatCents, parseMoney, splitByLineItems } from '@/lib/money';
import Avatar from '@/components/ui/Avatar';

export type EditableLineItem = {
  description: string;
  amount: number;
  assignedTo: string[];
};

interface SplitSelectorProps {
  totalAmount: number;
  members: { userId: string; displayName: string; avatarUrl: string | null }[];
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  splits: { userId: string; amount: number }[];
  onSplitsChange: (splits: { userId: string; amount: number }[]) => void;
  lineItems?: EditableLineItem[];
  onLineItemsChange?: (items: EditableLineItem[]) => void;
}

export default function SplitSelector({
  totalAmount,
  members,
  splitType,
  onSplitTypeChange,
  splits,
  onSplitsChange,
  lineItems = [],
  onLineItemsChange,
}: SplitSelectorProps) {
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const calculateEqualSplits = (activeIds: string[], amount: number) => {
    if (activeIds.length === 0) return members.map((m) => ({ userId: m.userId, amount: 0 }));

    const baseShare = Math.floor(amount / activeIds.length);
    let remainder = amount % activeIds.length;

    return members.map((m) => {
      let share = 0;
      if (activeIds.includes(m.userId)) {
        share = baseShare;
        if (remainder > 0) {
          share += 1;
          remainder -= 1;
        }
      }
      return { userId: m.userId, amount: share };
    });
  };

  const calculatePercentageSplits = (pcts: Record<string, string>, amount: number) => {
    let allocated = 0;
    const newSplits = members.map((m) => {
      const pct = parseFloat(pcts[m.userId] || '0');
      if (isNaN(pct)) return { userId: m.userId, amount: 0 };
      const share = Math.floor(amount * (pct / 100));
      allocated += share;
      return { userId: m.userId, amount: share };
    });

    const sumPct = members.reduce((sum, m) => sum + (parseFloat(pcts[m.userId] || '0') || 0), 0);
    if (Math.abs(sumPct - 100) < 0.01) {
      let remainder = amount - allocated;
      if (remainder > 0) {
        const sortedMembers = [...members].sort((a, b) => {
          const pctA = parseFloat(pcts[a.userId] || '0') || 0;
          const pctB = parseFloat(pcts[b.userId] || '0') || 0;
          return pctB - pctA;
        });

        for (let i = 0; i < remainder; i++) {
          const u = sortedMembers[i % sortedMembers.length];
          const s = newSplits.find((x) => x.userId === u.userId);
          if (s) s.amount += 1;
        }
      }
    }
    return newSplits;
  };

  const recalculatePerItem = (items: EditableLineItem[]) => {
    const memberIds = members.map((m) => m.userId);
    onSplitsChange(splitByLineItems(items, memberIds));
  };

  useEffect(() => {
    if (splitType === 'EQUAL') {
      const activeIds = splits.filter((s) => s.amount > 0).map((s) => s.userId);
      const targetIds = activeIds.length > 0 ? activeIds : members.map((m) => m.userId);
      const newSplits = calculateEqualSplits(targetIds, totalAmount);

      const hasChanged = newSplits.some((ns, i) => ns.amount !== splits[i]?.amount);
      if (hasChanged) onSplitsChange(newSplits);
    } else if (splitType === 'CUSTOM_AMOUNT') {
      const initialAmounts: Record<string, string> = {};
      members.forEach((m) => {
        if (customAmounts[m.userId] !== undefined && customAmounts[m.userId] !== '') {
          initialAmounts[m.userId] = customAmounts[m.userId];
        } else {
          const existing = splits.find((s) => s.userId === m.userId)?.amount || 0;
          initialAmounts[m.userId] = existing > 0 ? (existing / 100).toFixed(2) : '';
        }
      });
      setCustomAmounts(initialAmounts);
      const newSplits = members.map((m) => ({
        userId: m.userId,
        amount: parseMoney(initialAmounts[m.userId] || ''),
      }));
      const changed = newSplits.some((ns) => ns.amount !== (splits.find((s) => s.userId === ns.userId)?.amount || 0));
      if (changed) onSplitsChange(newSplits);
    } else if (splitType === 'PERCENTAGE') {
      const initialPcts: Record<string, string> = {};
      members.forEach((m) => {
        const s = splits.find((x) => x.userId === m.userId);
        const pct = totalAmount > 0 && s ? ((s.amount / totalAmount) * 100).toFixed(1) : '0';
        initialPcts[m.userId] = pct;
      });
      setPercentages(initialPcts);
      const newSplits = calculatePercentageSplits(initialPcts, totalAmount);
      onSplitsChange(newSplits);
    } else if (splitType === 'PER_ITEM') {
      let items = lineItems;
      if (items.length === 0 && totalAmount > 0 && onLineItemsChange) {
        items = [
          {
            description: 'Item',
            amount: totalAmount,
            assignedTo: members.map((m) => m.userId),
          },
        ];
        onLineItemsChange(items);
      }
      recalculatePerItem(items);
    }
    // Intentionally keyed to total/split mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, splitType]);

  const handleEqualToggle = (userId: string) => {
    const activeIds = splits.filter((s) => s.amount > 0).map((s) => s.userId);
    let newIds: string[] = [];
    if (activeIds.includes(userId)) {
      newIds = activeIds.filter((id) => id !== userId);
    } else {
      newIds = [...activeIds, userId];
    }
    if (newIds.length === 0) return;

    onSplitsChange(calculateEqualSplits(newIds, totalAmount));
  };

  const handleCustomAmountChange = (userId: string, val: string) => {
    const newAmounts = { ...customAmounts, [userId]: val };
    setCustomAmounts(newAmounts);

    const newSplits = members.map((m) => ({
      userId: m.userId,
      amount: parseMoney(newAmounts[m.userId] || ''),
    }));
    onSplitsChange(newSplits);
  };

  const handlePercentageChange = (userId: string, val: string) => {
    const newPcts = { ...percentages, [userId]: val };
    setPercentages(newPcts);
    onSplitsChange(calculatePercentageSplits(newPcts, totalAmount));
  };

  const updateLineItem = (index: number, patch: Partial<EditableLineItem>) => {
    if (!onLineItemsChange) return;
    const next = lineItems.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onLineItemsChange(next);
    recalculatePerItem(next);
  };

  const toggleAssignee = (index: number, userId: string) => {
    const item = lineItems[index];
    if (!item) return;
    const has = item.assignedTo.includes(userId);
    const assignedTo = has ? item.assignedTo.filter((id) => id !== userId) : [...item.assignedTo, userId];
    if (assignedTo.length === 0) return;
    updateLineItem(index, { assignedTo });
  };

  const addLineItem = () => {
    if (!onLineItemsChange) return;
    const next = [
      ...lineItems,
      { description: '', amount: 0, assignedTo: members.map((m) => m.userId) },
    ];
    onLineItemsChange(next);
    recalculatePerItem(next);
  };

  const removeLineItem = (index: number) => {
    if (!onLineItemsChange || lineItems.length <= 1) return;
    const next = lineItems.filter((_, i) => i !== index);
    onLineItemsChange(next);
    recalculatePerItem(next);
  };

  const renderEqual = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {members.map((m) => {
        const split = splits.find((s) => s.userId === m.userId);
        const isActive = split ? split.amount > 0 : false;
        return (
          <div
            key={m.userId}
            onClick={() => handleEqualToggle(m.userId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleEqualToggle(m.userId)}
                style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <Avatar name={m.displayName} src={m.avatarUrl || undefined} size="sm" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.displayName}</span>
            </div>
            <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {isActive ? formatCents(split!.amount) : '$0.00'}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderCustomAmount = () => {
    const currentSum = splits.reduce((acc, s) => acc + s.amount, 0);
    const difference = totalAmount - currentSum;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '0.6rem',
            borderRadius: '8px',
            background: difference === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: difference === 0 ? 'var(--accent)' : 'var(--warning)',
            border: difference === 0 ? '1px solid var(--accent)' : '1px solid var(--warning)',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {difference === 0
            ? '✓ Split amounts match total'
            : difference > 0
            ? `${formatCents(difference)} left to allocate`
            : `Over-allocated by ${formatCents(-difference)}`}
        </div>

        {members.map((m) => (
          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Avatar name={m.displayName} src={m.avatarUrl || undefined} size="sm" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.displayName}</span>
            </div>

            <div style={{ position: 'relative', width: '130px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                $
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={
                  customAmounts[m.userId] !== undefined
                    ? customAmounts[m.userId]
                    : ((splits.find((s) => s.userId === m.userId)?.amount || 0) / 100).toFixed(2)
                }
                onChange={(e) => handleCustomAmountChange(m.userId, e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.5rem 0.5rem 1.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  textAlign: 'right',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPercentage = () => {
    const currentPctSum = members.reduce((sum, m) => sum + (parseFloat(percentages[m.userId] || '0') || 0), 0);
    const is100 = Math.abs(currentPctSum - 100) < 0.01;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '0.6rem',
            borderRadius: '8px',
            background: is100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: is100 ? 'var(--accent)' : 'var(--warning)',
            border: is100 ? '1px solid var(--accent)' : '1px solid var(--warning)',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {is100 ? '✓ 100% percentage allocated' : `${(100 - currentPctSum).toFixed(1)}% remaining to allocate`}
        </div>

        {members.map((m) => (
          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Avatar name={m.displayName} src={m.avatarUrl || undefined} size="sm" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.displayName}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                {formatCents(splits.find((s) => s.userId === m.userId)?.amount || 0)}
              </span>
              <div style={{ position: 'relative', width: '85px' }}>
                <input
                  type="number"
                  placeholder="0"
                  value={percentages[m.userId] || ''}
                  onChange={(e) => handlePercentageChange(m.userId, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1.6rem 0.5rem 0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'right',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  %
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPerItem = () => {
    const itemsSum = lineItems.reduce((sum, i) => sum + (i.amount || 0), 0);
    const difference = totalAmount - itemsSum;
    const allAssigned = lineItems.every((i) => i.assignedTo.length > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '0.6rem',
            borderRadius: '8px',
            background: difference === 0 && allAssigned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: difference === 0 && allAssigned ? 'var(--accent)' : 'var(--warning)',
            border: difference === 0 && allAssigned ? '1px solid var(--accent)' : '1px solid var(--warning)',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {difference === 0
            ? '✓ Line items match expense total'
            : difference > 0
            ? `${formatCents(difference)} unallocated in line items`
            : `Line items exceed total by ${formatCents(-difference)}`}
        </div>

        {lineItems.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Item description"
                value={item.description}
                onChange={(e) => updateLineItem(index, { description: e.target.value })}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <div style={{ position: 'relative', width: '110px' }}>
                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  $
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={item.amount ? (item.amount / 100).toFixed(2) : ''}
                  onChange={(e) => updateLineItem(index, { amount: parseMoney(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.5rem 0.5rem 1.4rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    textAlign: 'right',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    padding: '0.35rem',
                  }}
                  aria-label="Remove item"
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {members.map((m) => {
                const active = item.assignedTo.includes(m.userId);
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggleAssignee(index, m.userId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.55rem',
                      borderRadius: '999px',
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'rgba(16,185,129,0.15)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar name={m.displayName} src={m.avatarUrl || undefined} size="sm" />
                    {m.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addLineItem}
          style={{
            padding: '0.65rem',
            borderRadius: '10px',
            border: '1px dashed var(--border)',
            background: 'transparent',
            color: 'var(--accent)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add line item
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resulting shares</div>
          {members.map((m) => (
            <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>{m.displayName}</span>
              <span style={{ fontWeight: 700 }}>{formatCents(splits.find((s) => s.userId === m.userId)?.amount || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs: { type: SplitType; label: string }[] = [
    { type: 'EQUAL', label: 'EQUAL' },
    { type: 'CUSTOM_AMOUNT', label: 'CUSTOM' },
    { type: 'PERCENTAGE', label: '%' },
    { type: 'PER_ITEM', label: 'ITEMS' },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-primary)',
          borderRadius: '14px',
          padding: '0.3rem',
          border: '1px solid var(--border)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        {tabs.map(({ type, label }) => {
          const isSelected = splitType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSplitTypeChange(type)}
              style={{
                flex: 1,
                padding: '0.65rem 0.25rem',
                borderRadius: '10px',
                border: 'none',
                background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: isSelected ? 800 : 600,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          padding: '1.25rem',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {splitType === 'EQUAL' && renderEqual()}
        {splitType === 'CUSTOM_AMOUNT' && renderCustomAmount()}
        {splitType === 'PERCENTAGE' && renderPercentage()}
        {splitType === 'PER_ITEM' && renderPerItem()}
      </div>
    </div>
  );
}
