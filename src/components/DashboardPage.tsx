'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import FAB from '@/components/FAB';
import BalanceCard from '@/components/BalanceCard';
import Avatar from '@/components/ui/Avatar';
import HouseholdSwitcher from '@/components/HouseholdSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useExpenses } from '@/hooks/useExpenses';
import { useSync } from '@/hooks/useSync';
import { useBalances } from '@/hooks/useBalances';
import { formatCents } from '@/lib/money';
import { CATEGORY_META } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const { expenses, loading: expensesLoading } = useExpenses();
  const { youOwe, owedToYou, loading: balancesLoading } = useBalances();
  const { syncing } = useSync();

  const loading = expensesLoading || balancesLoading || authLoading || householdLoading;

  // Calculate total amounts owed and owed to you
  const totalYouOwe = useMemo(() => {
    return youOwe.reduce((sum, b) => sum + b.amount, 0);
  }, [youOwe]);

  const totalOwedToYou = useMemo(() => {
    return owedToYou.reduce((sum, b) => sum + b.amount, 0);
  }, [owedToYou]);

  useEffect(() => {
    if (!household && !loading && !user?.householdId) {
      router.push('/household');
    }
  }, [household, loading, router, user]);

  if (!household && !loading && !user?.householdId) {
    return null;
  }

  if (!household || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', paddingBottom: '100px', minHeight: '100vh', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Avatar name={user?.displayName || 'User'} src={user?.avatarUrl || undefined} size="md" />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              SplitMoney
            </h1>
            <div style={{ marginTop: '0.2rem' }}>
              <HouseholdSwitcher />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => router.push('/household')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--accent)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'var(--transition)',
            }}
          >
            👥 Members
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {syncing ? 'Syncing...' : 'Synced'}
            </span>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: syncing ? '#f59e0b' : 'var(--accent)',
                boxShadow: syncing ? '0 0 6px #f59e0b' : '0 0 6px var(--accent)',
              }}
            />
          </div>
        </div>
      </header>

      {/* High-Impact Total Balance Summary Cards (Wireframe Screen 1) */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* YOU OWE Card */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '1.25rem 1rem',
              border: totalYouOwe > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
              boxShadow: totalYouOwe > 0 ? '0 4px 12px rgba(239, 68, 68, 0.1)' : 'none',
              transition: 'var(--transition)',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              You Owe
            </span>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: totalYouOwe > 0 ? 'var(--danger)' : 'var(--text-primary)',
                marginTop: '0.25rem',
              }}
            >
              {formatCents(totalYouOwe)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalYouOwe > 0 ? 'to others' : 'Settled'}
            </span>
          </div>

          {/* OWED TO YOU Card */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '1.25rem 1rem',
              border: totalOwedToYou > 0 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
              boxShadow: totalOwedToYou > 0 ? '0 4px 12px rgba(16, 185, 129, 0.1)' : 'none',
              transition: 'var(--transition)',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              Owed to You
            </span>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: totalOwedToYou > 0 ? 'var(--accent)' : 'var(--text-primary)',
                marginTop: '0.25rem',
              }}
            >
              {formatCents(totalOwedToYou)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalOwedToYou > 0 ? 'from members' : 'No balance'}
            </span>
          </div>
        </div>
      </section>

      {/* Individual Pairwise Balances */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Detailed Balances
        </h2>
        {owedToYou.map((b, i) => (
          <BalanceCard
            key={`owed-${i}`}
            otherUser={b.user}
            amount={b.amount}
            onSettleUp={() => router.push(`/settle?toUser=${b.user.id}`)}
          />
        ))}
        {youOwe.map((b, i) => (
          <BalanceCard
            key={`owe-${i}`}
            otherUser={b.user}
            amount={-b.amount}
            onSettleUp={() => router.push(`/settle?toUser=${b.user.id}`)}
          />
        ))}
        {youOwe.length === 0 && owedToYou.length === 0 && (
          <div
            style={{
              padding: '1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
            }}
          >
            <p style={{ color: 'var(--accent)', fontWeight: 600, margin: 0 }}>🎉 All settled up!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              No outstanding balances in this household.
            </p>
          </div>
        )}
      </section>

      {/* Recent Activity List */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>
          {expenses.length > 0 && (
            <button
              onClick={() => router.push('/expenses')}
              style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View All →
            </button>
          )}
        </div>

        {expenses.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ margin: 0 }}>No recent activity yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
              Tap the floating + button below to add your first expense!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {expenses.slice(0, 5).map((exp) => {
              const catMeta = CATEGORY_META[exp.category];
              return (
                <div
                  key={exp.id}
                  onClick={() => router.push(`/expenses/detail?id=${exp.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}
                    >
                      {catMeta?.emoji || '🏷️'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {exp.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(exp.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {formatCents(exp.totalAmount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <FAB onClick={() => router.push('/expenses/new')} />
      <BottomNav />
    </div>
  );
}
