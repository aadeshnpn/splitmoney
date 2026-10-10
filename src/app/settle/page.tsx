import { Suspense } from 'react';
import SettlePage from '@/components/SettlePage';

export default function Settle() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading settlement...</div>}>
      <SettlePage />
    </Suspense>
  );
}
