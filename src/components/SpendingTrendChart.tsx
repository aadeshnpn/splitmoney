'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCents } from '@/lib/money';

interface SpendingTrendChartProps {
  monthlyData: { month: string; amount: number }[];
}

export default function SpendingTrendChart({ monthlyData }: SpendingTrendChartProps) {
  if (monthlyData.length === 0) return null;

  const formattedData = monthlyData.map((d) => ({
    ...d,
    displayAmount: d.amount / 100, // For y-axis display
  }));

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
        Monthly Spending Trend
      </h3>

      <div style={{ height: '220px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `$${val}`} />
            <Tooltip
              formatter={(val: any) => [formatCents(Math.round(Number(val) * 100)), 'Total Spent']}
              contentStyle={{
                backgroundColor: 'rgba(26, 35, 50, 0.95)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                color: '#fff',
              }}
            />
            <Bar dataKey="displayAmount" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
