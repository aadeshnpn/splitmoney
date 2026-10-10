'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvitePageClient from '@/components/InvitePageClient';

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || undefined;
  return <InvitePageClient token={token} />;
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading invite...</div>}>
      <InviteContent />
    </Suspense>
  );
}
