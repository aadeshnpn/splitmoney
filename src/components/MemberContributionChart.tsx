'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCents } from '@/lib/money';

interface MemberContributionChartProps {
  memberData: { name: string; paid: number; share: number }[];
}

export default function MemberContributionChart({ memberData }: MemberContributionChartProps) {
  if (memberData.length === 0) return null;

  const formattedData = memberData.map((d) => ({
    name: d.name,
    Paid: d.paid / 100,
    Share: d.share / 100,
    paidRaw: d.paid,
    shareRaw: d.share,
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
        Member Payments vs Consumption
      </h3>

      <div style={{ height: '220px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => `$${val}`} />
            <Tooltip
              formatter={(val, name) => [
                formatCents(Math.round(Number(val) * 100)),
                name === 'Paid' ? 'Total Paid' : 'Total Share',
              ]}
              contentStyle={{
                backgroundColor: 'rgba(26, 35, 50, 0.95)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
            <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Share" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
