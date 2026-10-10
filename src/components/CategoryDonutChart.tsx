'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_META, ExpenseCategory } from '@/types';
import { formatCents } from '@/lib/money';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  groceries: '#10b981',   // Emerald
  rent: '#6366f1',        // Indigo
  utilities: '#f59e0b',   // Amber
  dining: '#ec4899',      // Pink
  transport: '#3b82f6',    // Blue
  healthcare: '#ef4444',   // Red
  entertainment: '#8b5cf6',// Purple
  household: '#14b8a6',   // Teal
  other: '#64748b',       // Slate
};

interface CategoryDonutChartProps {
  data: { category: ExpenseCategory; amount: number }[];
  totalSpent: number;
}

export default function CategoryDonutChart({ data, totalSpent }: CategoryDonutChartProps) {
  const chartData = data.map((d) => ({
    name: CATEGORY_META[d.category]?.label || d.category,
    value: d.amount,
    category: d.category,
    emoji: CATEGORY_META[d.category]?.emoji || '📦',
    color: CATEGORY_COLORS[d.category] || '#64748b',
    percent: totalSpent > 0 ? ((d.amount / totalSpent) * 100).toFixed(1) : '0',
  }));

  if (chartData.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        No expense data for selected filters.
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
        Category Breakdown
      </h3>

      <div style={{ height: '240px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: any) => [formatCents(Number(val) || 0), 'Amount']}
              contentStyle={{
                backgroundColor: 'rgba(26, 35, 50, 0.95)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          marginTop: '1rem',
        }}
      >
        {chartData.map((item) => (
          <div
            key={item.category}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.emoji} {item.name}
              </span>
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              {item.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
