'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';

export default function InvitePageClient({ token }: { token?: string }) {
  const { user, loading: authLoading } = useAuth();
  const { joinHousehold, household } = useHousehold();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const joinedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/?redirect=/household/invite?token=${encodeURIComponent(token || '')}`);
      return;
    }

    if (!token) return;

    const join = async () => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      try {
        await joinHousehold(token);
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (e: unknown) {
        setStatus('error');
        setErrorMessage(e instanceof Error ? e.message : 'Failed to join household.');
      }
    };

    join();
  }, [authLoading, user, token, router, joinHousehold]);

  const missingToken = !authLoading && !!user && !token;
  const statusToShow = missingToken ? 'error' : status;
  const messageToShow = missingToken ? 'No invite token provided.' : errorMessage;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        padding: '1.5rem',
        background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.12), transparent 55%), var(--bg-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
        }}
      >
        {statusToShow === 'loading' && (
          <>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem' }}>Joining household…</div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Syncing your invite across devices.</p>
          </>
        )}

        {statusToShow === 'success' && (
          <>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
              You&apos;re in{household?.name ? ` — ${household.name}` : ''}
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Redirecting to your dashboard…</p>
          </>
        )}

        {statusToShow === 'error' && (
          <>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem' }}>
              Couldn&apos;t join
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{messageToShow}</p>
            <button
              onClick={() => router.push('/household')}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Household
            </button>
          </>
        )}
      </div>
    </div>
  );
}
