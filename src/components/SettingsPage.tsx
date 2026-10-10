'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useSync } from '@/hooks/useSync';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { household } = useHousehold();
  const { syncNow, syncing, lastSyncTime } = useSync();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const inviteLink =
    typeof window !== 'undefined' && household?.inviteToken
      ? `${window.location.origin}/household/invite?token=${household.inviteToken}`
      : null;

  return (
    <div
      style={{
        padding: '1rem',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minHeight: '100vh',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Settings</h1>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Account, household invite, and sync
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Account
        </h2>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '1rem', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{user?.displayName}</p>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</p>
        </div>
      </section>

      {household && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Household
          </h2>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '1rem', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{household.name}</p>
            <p style={{ margin: '0.55rem 0 0.2rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Invite code
            </p>
            <p style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
              {household.inviteToken}
            </p>
            {inviteLink && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                    alert('Invite link copied');
                  } catch {
                    alert(inviteLink);
                  }
                }}
                style={{
                  marginTop: '0.85rem',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid var(--accent)',
                  background: 'rgba(16,185,129,0.12)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Copy invite link
              </button>
            )}
          </div>
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Sync
        </h2>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '1rem', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {syncing
              ? 'Syncing with Firebase…'
              : lastSyncTime
              ? `Last synced ${lastSyncTime.toLocaleTimeString()}`
              : 'Not synced yet on this screen'}
          </p>
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={syncing || !household}
            style={{
              marginTop: '0.85rem',
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: syncing || !household ? 'not-allowed' : 'pointer',
              width: '100%',
              opacity: syncing || !household ? 0.6 : 1,
            }}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </section>

      <button
        onClick={handleSignOut}
        style={{
          marginTop: 'auto',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255, 60, 60, 0.1)',
          color: '#ff4d4d',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>

      <BottomNav />
    </div>
  );
}
