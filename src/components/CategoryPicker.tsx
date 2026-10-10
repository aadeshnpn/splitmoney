'use client';

import { ExpenseCategory, CATEGORY_META } from '@/types';

interface CategoryPickerProps {
  value: ExpenseCategory;
  onChange: (cat: ExpenseCategory) => void;
}

const CATEGORY_THEMES: Record<ExpenseCategory, { bg: string; border: string; glow: string }> = {
  groceries: { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))', border: '#10b981', glow: 'rgba(16, 185, 129, 0.35)' },
  rent: { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.1))', border: '#6366f1', glow: 'rgba(99, 102, 241, 0.35)' },
  utilities: { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.35)' },
  dining: { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.1))', border: '#f43f5e', glow: 'rgba(244, 63, 94, 0.35)' },
  transport: { bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(2, 132, 199, 0.1))', border: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.35)' },
  healthcare: { bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.1))', border: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)' },
  entertainment: { bg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.1))', border: '#ec4899', glow: 'rgba(236, 72, 153, 0.35)' },
  household: { bg: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(13, 148, 136, 0.1))', border: '#14b8a6', glow: 'rgba(20, 184, 166, 0.35)' },
  other: { bg: 'linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(71, 85, 105, 0.1))', border: '#64748b', glow: 'rgba(100, 116, 139, 0.35)' },
};

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const categories = Object.keys(CATEGORY_META) as ExpenseCategory[];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
        gap: '0.65rem',
        width: '100%',
      }}
    >
      {categories.map((cat) => {
        const isSelected = value === cat;
        const theme = CATEGORY_THEMES[cat] || CATEGORY_THEMES.other;

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 0.5rem',
              background: isSelected ? theme.bg : 'var(--bg-secondary)',
              border: isSelected ? `2px solid ${theme.border}` : '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: isSelected ? `0 6px 16px ${theme.glow}` : '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isSelected ? 'scale(1.03) translateY(-1px)' : 'scale(1)',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: theme.border,
                  boxShadow: `0 0 6px ${theme.border}`,
                }}
              />
            )}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: isSelected
                  ? `linear-gradient(135deg, ${theme.border}, rgba(255,255,255,0.2))`
                  : 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                marginBottom: '0.4rem',
                boxShadow: isSelected ? `0 4px 10px ${theme.glow}` : 'inset 0 1px 2px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              {CATEGORY_META[cat].emoji}
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '75px',
                letterSpacing: '0.01em',
              }}
            >
              {CATEGORY_META[cat].label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
