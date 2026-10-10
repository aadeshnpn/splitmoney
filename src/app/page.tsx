import { Suspense } from 'react';
import SignInPage from '@/components/SignInPage';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading…</div>}>
      <SignInPage />
    </Suspense>
  );
}
